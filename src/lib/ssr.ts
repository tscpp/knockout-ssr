import * as acorn from "acorn";
import * as acornWalk from "acorn-walk";
import { resolve as importMetaResolve } from "import-meta-resolve";
import MagicString from "magic-string";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  Attribute,
  Element,
  Node,
  Position,
  Range,
  VirtualElement,
  isParentNode,
  parse,
} from "./parser.js";
import { Plugin, builtins } from "./plugin.js";
import { getInnerRange, quoteJsString } from "./utils.js";
import ko from "knockout";

export interface BindingContext {
  $parent?: unknown;
  $parents: unknown[];
  $root: unknown;
  /**
   * @deprecated This is not available in SSR.
   */
  $component?: unknown;
  $data: unknown;
  $index?: number;
  $parentContext?: BindingContext;
  $rawData: unknown;
  /**
   * @deprecated This is not available in SSR.
   */
  $componentTemplateNodes?: unknown;
}

export class Binding {
  constructor(
    public readonly name: string,
    public readonly value: unknown,
    public readonly expression: string,
    public readonly quote: "'" | '"',
    public readonly parent: Element | VirtualElement,
    public readonly range: Range,
  ) {}
}

export interface RenderOptions {
  /**
   * Custom plugins to use.
   */
  plugins?: Plugin[] | undefined;

  /**
   * Whether to use the built-in plugins for standard knockout bindings.
   *
   * @default true
   */
  useBuiltins?: boolean | undefined;

  /**
   * The attributes to scan for bindings.
   *
   * @default ["data-bind"]
   */
  attributes?: string[] | undefined;
}

export interface SSROptions extends RenderOptions {
  /**
   * The path of the file being processed. This is used to resolve relative
   * paths within the document. If not specified, paths will be resolved
   * relative to the current working directory.
   *
   * @deprecated Use {@link filename} instead.
   */
  parent?: string | undefined;

  /**
   * The path of the file being processed. Used to resolve relative imports
   * within the document.
   */
  filename?: string | undefined;

  resolve?: (specifier: string) => Promise<string | null>;
}

export interface SSRResult {
  /**
   * The generated document.
   */
  document: string;
}

export function render(
  document: string,
  options?: SSROptions,
): Promise<SSRResult> {
  return new SSRRenderer(document, options).render();
}

class SSRRenderer {
  #document: MagicString;
  #plugins: Plugin[];
  #attributes: string[];
  #resolve: (specifier: string) => Promise<string | null>;
  #filename: string;

  constructor(document: string, options?: SSROptions | undefined) {
    this.#document = new MagicString(document, {
      filename: options?.filename!,
    });
    this.#plugins = [
      ...(options?.useBuiltins !== false ? builtins : []),
      ...(options?.plugins ?? []),
    ];
    this.#attributes = options?.attributes ?? ["data-bind"];

    this.#filename = resolve(
      options?.filename ?? options?.parent ?? "knockout-ssr.html",
    );
    this.#resolve =
      options?.resolve ??
      (async (specifier) => {
        return fileURLToPath(
          importMetaResolve(
            specifier,
            pathToFileURL(this.#filename).toString(),
          ),
        );
      });
  }

  async #forceResolveUrl(specifier: string) {
    const resolved = await this.#resolve(specifier);
    if (!resolved) {
      throw new Error(
        `Cannot resolve ${specifier}${
          this.#filename ? ` from ${this.#filename}` : ""
        }.`,
      );
    }
    return pathToFileURL(resolved).toString();
  }

  async render(): Promise<SSRResult> {
    const parsed = parse(this.#document.original);
    await this.#scan(parsed);
    return {
      document: this.#document.toString(),
    };
  }

  async #scan(node: Node) {
    if (node instanceof VirtualElement && node.binding === "ssr") {
      await this.#apply(node);
      return;
    }

    if (isParentNode(node)) {
      for (const child of node.children) {
        await this.#scan(child);
      }
    }
  }

  async #apply(node: VirtualElement) {
    const toRawData = async (param: string) => {
      param = param.trim();
      let data: any;
      if (param.startsWith("{")) {
        data = evaluateInitViewModel(param);
      } else {
        data = interopModule(await import(await this.#forceResolveUrl(param)));
      }
      return data;
    };

    const $rawData = await toRawData(node.param);
    const $data = ko.utils.unwrapObservable($rawData);
    const $root = $data;
    const $parentContext: BindingContext = {
      $parents: [],
      $root,
      $data,
      $rawData,
    };

    // Remove virtual element start and end comments.
    const innerRange = getInnerRange(node, this.#document.original);
    this.#document.remove(node.range.start.offset, innerRange.start.offset);
    this.#document.remove(innerRange.end.offset, node.range.end.offset);

    const renderBinding = async (binding: Binding, context: BindingContext) => {
      for (const plugin of this.#plugins) {
        if (!plugin.filter(binding)) continue;
        await plugin.ssr?.(binding, this.#document, context);
      }
    };

    const createBindingContext = ($parentContext: BindingContext) => {
      return {
        ...$parentContext,
        $parentContext,
        $parents: [$parentContext.$data, ...$parentContext.$parents],
        $parent: $parentContext.$data,
      };
    };

    const walk = async (node: Node, parentBindingContext: BindingContext) => {
      let propagate = true;

      const bindingsToJs = (attribute: string) => {
        return `{${attribute}}`;
      };

      const parseAttributeBindings = (js: string) => {
        const expr = acorn.parseExpressionAt(js, 0, {
          ecmaVersion: "latest",
          ranges: true,
        });
        assert(expr.type === "ObjectExpression");
        return expr;
      };

      const evaluateBinding = (
        expression: string,
        $context: BindingContext,
      ) => {
        return evaluate(expression, { $context, ...$context });
      };

      const renderBindingsFromAttribute = async (
        attribute: Attribute,
        bindingContext: BindingContext,
      ) => {
        assert(node instanceof Element);
        if (!attribute?.value) return;

        const js = bindingsToJs(attribute.value);
        const obj = parseAttributeBindings(js);

        for (const prop of obj.properties) {
          assert(prop.type === "Property");
          assert(prop.key.type === "Identifier");

          let start =
            this.#document.original.indexOf("=", attribute.range.start.offset) +
            1;
          const afterEq = this.#document.original[start];
          if (afterEq === '"') {
            ++start;
          }
          const quote = afterEq === '"' ? "'" : '"';

          const range = new Range(
            Position.fromOffset(
              prop.range![0] - 1 + start,
              this.#document.original,
            ),
            Position.fromOffset(
              prop.range![1] - 1 + start,
              this.#document.original,
            ),
          );

          const expression = transform(js.slice(...prop.value.range!), quote);
          const value = evaluateBinding(expression, bindingContext);

          const binding = new Binding(
            prop.key.name,
            value,
            expression,
            quote,
            node,
            range,
          );

          await renderBinding(binding, bindingContext);
        }
      };

      const isElement = node instanceof Element;
      const isVirtualElement = node instanceof VirtualElement;
      let _bindingContext: BindingContext | undefined;

      if (isElement || isVirtualElement) {
        _bindingContext = createBindingContext(parentBindingContext);

        if (isElement) {
          const attributes = node.attributes.filter((attribute) =>
            this.#attributes.includes(attribute.name),
          );

          for (const attribute of attributes) {
            await renderBindingsFromAttribute(attribute, _bindingContext);
          }
        } else {
          const expression = transform(node.param);
          const value = evaluateBinding(expression, _bindingContext);

          const range = new Range(
            Position.fromOffset(
              node.range.start.offset + "<!--".length,
              this.#document.original,
            ),
            Position.fromOffset(
              node.range.end.offset - "-->".length,
              this.#document.original,
            ),
          );

          const binding = new Binding(
            node.binding,
            value,
            expression,
            '"',
            node,
            range,
          );
          await renderBinding(binding, _bindingContext);
        }
      }

      if (propagate && isParentNode(node)) {
        for (const child of node.children) {
          await walk(child, _bindingContext ?? parentBindingContext);
        }
      }
    };

    for (const childNode of node.children) {
      await walk(childNode, $parentContext);
    }
  }
}

/**
 * Find the viewmodel from the exports of a module, and initializes it.
 */
function interopModule(exports: any) {
  if (exports.default) {
    exports = exports.default;
  }

  if (typeof exports === "function") {
    exports = new exports();
  }

  return exports;
}

/**
 * Transform an knockout binding expression to a valid javascript expression.
 */
function transform(expression: string, quote = '"'): string {
  const magic = new MagicString(expression);
  const parsed = acorn.parseExpressionAt(expression, 0, {
    ecmaVersion: "latest",
    ranges: true,
  });

  // Transform the expression to check if the identifier is defined in $data,
  // and if not, it uses the identifier from the global scope.
  acornWalk.simple(parsed, {
    Identifier(node: acorn.Identifier) {
      magic.overwrite(
        node.start!,
        node.end!,
        `(${quoteJsString(node.name, quote)} in $data ? $data.${node.name} : ${
          node.name
        })`,
      );
    },
  });

  return magic.toString();
}

/**
 * Evaluates an expression with the provided binding context.
 */
function evaluate(expression: string, context: object) {
  try {
    return new Function(...Object.keys(context), `return ${expression}`)(
      ...Object.values(context),
    );
  } catch (error) {
    throw new Error(`Failed to evaluate expression: ${expression}`, {
      cause: error,
    });
  }
}

function evaluateInitViewModel(expression: string) {
  return new Function(`return ${expression}`)();
}
