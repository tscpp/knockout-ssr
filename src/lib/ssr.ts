import * as acorn from "acorn";
import * as acornWalk from "acorn-walk";
import { resolve as importMetaResolve } from "import-meta-resolve";
import MagicString from "magic-string";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  Element,
  Node,
  Position,
  Range,
  VirtualElement,
  isParentNode,
  parse,
} from "./parser.js";
import { Plugin, Self, Sibling } from "./plugin.js";
import { getInnerRange, quoteJsString } from "./utils.js";
import ko from "knockout";
import { BindingContext } from "./binding-context.js";
import builtins from "./_built-ins.js";

export class Binding {
  constructor(
    public readonly name: string,
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

interface RenderBindingResult {
  propagate: boolean;
  bubble?: (() => Promise<void>) | undefined;
  extend?: (() => Promise<BindingContext>) | undefined;
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
      await this.#render(node);
      return;
    }

    if (isParentNode(node)) {
      for (const child of node.children) {
        await this.#scan(child);
      }
    }
  }

  async #renderBindings(
    bindings: readonly Binding[],
    context: BindingContext,
  ): Promise<RenderBindingResult> {
    const plugins = bindings.map((binding) =>
      this.#plugins.find((plugin) => plugin.filter(binding)),
    );

    for (let i = 0; i < bindings.length; ++i) {
      const binding = bindings[i]!;
      const plugin = plugins[i];

      await plugin?.alter?.({
        binding,
        context,
      });
    }

    const rawValues = bindings.map((binding) =>
      evaluate(binding.expression, {
        $context: context,
        ...context,
      }),
    );

    const values = rawValues.map((rawValue) => ko.unwrap(rawValue));

    let bubbles: (() => void | PromiseLike<void>)[] = [];

    const getSibling = (index: number): Sibling => {
      return {
        binding: bindings[index]!,
        context,
        value: values[index]!,
        rawValue: rawValues[index]!,
      };
    };

    const getSelf = (index: number): Self => {
      return {
        ...getSibling(index),
        siblings: bindings.map((_, i) => getSibling(i)),
      };
    };

    for (let i = 0; i < bindings.length; ++i) {
      const self = getSelf(i);
      const plugin = plugins[i];

      await plugin?.ssr?.({
        ...self,
        generated: this.#document,
        bubble: (callback) => {
          bubbles.push(callback);
        },
      });
    }

    const propagate = !plugins.some(
      (plugin, i) => plugin?.propagate?.(getSelf(i)) === false,
    );

    const extenders = plugins
      .filter((plugin) => plugin?.extend)
      .map((plugin, i) => () => plugin!.extend!({ parent: getSelf(i) }));

    // Only one plugin is expected to provide an extender.
    // See `extendDecendants`.
    if (extenders.length > 1) {
      console.warn("Multiple plugins is extending the binding context.");
    }

    const extend =
      extenders.length > 0
        ? async () => {
            const contexts = await Promise.all(
              extenders.map((extend) => extend()),
            );
            return contexts.length === 1
              ? contexts[0]!
              : contexts.reduce((a, b) => a.extend(b));
          }
        : undefined;

    const bubble = async () => {
      for (const bubble of bubbles) {
        await bubble();
      }
    };

    return {
      propagate,
      bubble,
      extend,
    };
  }

  async #getBindingsFromElement(node: Element) {
    const bindingsToJs = (attribute: string) => {
      return `{${attribute}}`;
    };

    const parseAttributeBindings = (js: string) => {
      const expr = acorn.parseExpressionAt(js, 0, {
        ecmaVersion: "latest",
        ranges: true,
      });
      assert(
        expr.type === "ObjectExpression",
        "Expected an object expression.",
      );
      return expr;
    };

    const attributes = node.attributes.filter((attribute) =>
      this.#attributes.includes(attribute.name),
    );

    return attributes.flatMap((attribute) => {
      if (!attribute?.value) return [];

      const js = bindingsToJs(attribute.value);
      const obj = parseAttributeBindings(js);

      return obj.properties.map((prop) => {
        assert(prop.type === "Property", "Expected a property.");
        assert(prop.key.type === "Identifier", "Expected an identifier.");

        // Find offset where the attribute value starts
        let start =
          this.#document.original.indexOf("=", attribute.range.start.offset) +
          1;
        const afterEq = this.#document.original[start];
        if (afterEq === '"') {
          ++start;
        }
        const quote = afterEq === '"' ? "'" : '"';

        // Create binding
        const expression = transform(js.slice(...prop.value.range!), quote);
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
        return new Binding(prop.key.name, expression, quote, node, range);
      });
    });
  }

  async #getBindingsFromVirtualElement(node: VirtualElement) {
    // Create binding
    const expression = transform(node.param);

    const m1 = /^\s*ko\s*/.exec(node.start.content);
    assert(m1, "Expected a knockout comment.");

    const m2 = /\s*^/.exec(node.end.content);
    assert(m2);

    const start = node.start.range.start.offset + "<!--".length + m1[0].length;
    const end = node.end.range.end.offset - "-->".length - m2[0].length;

    const range = new Range(
      Position.fromOffset(start, this.#document.original),
      Position.fromOffset(end, this.#document.original),
    );
    return new Binding(node.binding, expression, '"', node, range);
  }

  async #walk(node: Node, extend: () => Promise<BindingContext>) {
    let propagate = true;
    let extenders: (() => Promise<BindingContext>)[] = [];
    let context: BindingContext | undefined;
    let shouldRenderDecendants = true;
    let bubbles: (() => Promise<void>)[] = [];

    const isElement = node instanceof Element;
    const isVirtualElement = node instanceof VirtualElement;

    const renderDecendants = async () => {
      const extendDecendants = async () => {
        if (extenders.length === 0) {
          return context
            ? context.createChildContext(context.$rawData)
            : extend();
        } else if (extenders.length === 1) {
          return extenders[0]!();
        } else {
          // Normally, we only want one plugin to extend our context, but if
          // multiple plugins are extending the context, they are merged.
          let contexts: BindingContext[] = [];
          for (const extend of extenders) {
            contexts.push(await extend());
          }
          return contexts.reduce((a, b) => a.extend(b));
        }
      };

      if (propagate && isParentNode(node)) {
        for (const child of node.children) {
          await this.#walk(child, extendDecendants);
        }
      }
    };

    if (isElement || isVirtualElement) {
      context = await extend();

      const bindings = isElement
        ? await this.#getBindingsFromElement(node)
        : [await this.#getBindingsFromVirtualElement(node)];

      const result = await this.#renderBindings(bindings, context);

      // Plugins can request to stop propagation.
      shouldRenderDecendants &&= result.propagate;

      if (result.extend) {
        extenders.push(result.extend);
      }

      if (result.bubble) {
        bubbles.push(result.bubble);
      }
    }

    if (shouldRenderDecendants) {
      await renderDecendants();
    }

    for (const bubble of bubbles) {
      await bubble();
    }
  }

  async #render(node: VirtualElement) {
    const toData = async (param: string) => {
      param = param.trim();
      let data: any;
      if (param.startsWith("{")) {
        data = evaluateInitViewModel(param);
      } else {
        data = interopModule(await import(await this.#forceResolveUrl(param)));
      }
      return data;
    };

    const data = await toData(node.param);
    const context = new BindingContext(data);

    // Remove virtual element start and end comments.
    const innerRange = getInnerRange(node, this.#document.original);
    this.#document.remove(node.range.start.offset, innerRange.start.offset);
    this.#document.remove(innerRange.end.offset, node.range.end.offset);

    for (const childNode of node.children) {
      await this.#walk(childNode, async () =>
        context.createChildContext(context.$rawData),
      );
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
      const key = quoteJsString(node.name, quote);

      magic.overwrite(
        node.start!,
        node.end!,
        `(${key} in $context ? $context[${key}] : $data !== null && typeof $data === "object" && ${key} in $data ? $data[${key}] : ${node.name})`,
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
