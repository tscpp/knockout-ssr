import {
  Element,
  Node,
  VirtualElement,
  isParentNode,
  parse,
} from "./parsers/html.js";
import * as acorn from "acorn";
import assert from "node:assert/strict";
import MagicString from "magic-string";
import * as acornWalk from "acorn-walk";
import { getInnerRange } from "./utils.js";
import { Plugin, builtins } from "./plugin.js";
import { resolve } from "node:path";
import { resolve as importMetaResolve } from "import-meta-resolve";
import { pathToFileURL } from "node:url";

export class Binding {
  constructor(
    public readonly name: string,
    public readonly value: unknown,
    public readonly expression: string,
    public readonly viewModel: any,
    /** @deprecated */
    public readonly parent: Element | VirtualElement,
  ) {}
}

export interface SsrOptions {
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

  /**
   * The path of the file being processed. This is used to resolve relative
   * paths within the document. If not specified, paths will be resolved
   * relative to the current working directory.
   */
  parent?: string | undefined;
}

export interface SsrResult {
  /**
   * The generated document.
   */
  document: string;
}

export function render(
  document: string,
  options?: SsrOptions,
): Promise<SsrResult> {
  return new SsrRenderer(document, options).render();
}

class SsrRenderer {
  #document: MagicString;
  #plugins: Plugin[];
  #attributes: string[];
  #parent: string;

  constructor(document: string, options?: SsrOptions | undefined) {
    this.#document = new MagicString(document);
    this.#plugins = [
      ...(options?.useBuiltins !== false ? builtins : []),
      ...(options?.plugins ?? []),
    ];
    this.#attributes = options?.attributes ?? ["data-bind"];
    this.#parent = options?.parent ?? resolve("unnamed.html");
  }

  async render(): Promise<SsrResult> {
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
    const param = node.param.trim();
    let viewModel: any;

    if (param.startsWith("{")) {
      viewModel = evaluateInitViewModel(param);
    } else {
      viewModel = initViewModel(
        await import(
          importMetaResolve(
            param,
            pathToFileURL(resolve(this.#parent)).toString(),
          )
        ),
      );
    }

    // Remove virtual element start and end comments.
    const innerRange = getInnerRange(node, this.#document.original);
    this.#document.remove(node.range.start.offset, innerRange.start.offset);
    this.#document.remove(innerRange.end.offset, node.range.end.offset);

    const processBinding = async (binding: Binding) => {
      for (const plugin of this.#plugins) {
        if (!plugin.filter(binding)) continue;

        await plugin.ssr?.(binding, this.#document);
      }
    };

    const scan = async (node: Node) => {
      if (node instanceof Element) {
        const attribute = node.attributes.find((attr) =>
          this.#attributes.includes(attr.name),
        );
        if (attribute?.value) {
          // Remove the binding attribute from the element.
          // magic.remove(attribute.range.start.offset, attribute.range.end.offset);

          const asObject = `{${attribute.value}}`;
          const objectExpression = acorn.parseExpressionAt(asObject, 0, {
            ecmaVersion: "latest",
            ranges: true,
          });
          assert(objectExpression.type === "ObjectExpression");

          const bindings = objectExpression.properties.map((prop) => {
            assert(prop.type === "Property");
            assert(prop.key.type === "Identifier");

            const expression = transform(asObject.slice(...prop.value.range!));
            const value = evaluate(expression, viewModel);

            return new Binding(prop.key.name, value, expression, viewModel, node);
          });

          for (const binding of bindings) {
            await processBinding(binding);
          }
        }
      }

      if (node instanceof VirtualElement) {
        const expression = transform(node.param);
        const value = evaluate(expression, viewModel);

        const binding = new Binding(node.binding, value, expression, viewModel, node);
        await processBinding(binding);
      }

      if (isParentNode(node)) {
        for (const child of node.children) {
          await scan(child);
        }
      }
    };

    for (const childNode of node.children) {
      await scan(childNode);
    }
  }
}

/**
 * Find the viewmodel from the exports of a module, and initializes it.
 */
function initViewModel(exports: any) {
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
function transform(expression: string): string {
  const magic = new MagicString(expression);
  const parsed = acorn.parseExpressionAt(expression, 0, {
    ecmaVersion: "latest",
    ranges: true,
  });

  // Transform the expression to check if the identifier is defined in the viewmodel,
  // and if not, it uses the identifier from the global scope.
  acornWalk.simple(parsed, {
    Identifier(node: acorn.Identifier) {
      magic.overwrite(
        node.start!,
        node.end!,
        `(${JSON.stringify(node.name)} in $viewmodel ? $viewmodel.${
          node.name
        } : ${node.name})`,
      );
    },
  });

  return magic.toString();
}

/**
 * Evaluates an expression in the context of a viewmodel. Pass the expression
 * through {@link transform} and the viewmodel through {@link initViewModel}
 * first.
 */
function evaluate(expression: string, viewmodel: any) {
  return new Function("$viewmodel", `return ${expression}`)(viewmodel);
}

function evaluateInitViewModel(expression: string) {
  return new Function(`return ${expression}`)();
}
