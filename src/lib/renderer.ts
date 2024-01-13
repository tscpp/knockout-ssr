import { resolve as importMetaResolve } from "import-meta-resolve";
import MagicString from "magic-string";
import { pathToFileURL } from "node:url";
import {
  Element,
  ParentNode,
  VirtualElement,
  isParentNode,
  parse,
} from "./parser.js";
import { Plugin, Self, Sibling } from "./plugin.js";
import { getInnerRange } from "./utils.js";
import ko from "knockout";
import { BindingContext } from "./binding-context.js";
import builtins from "./_built-ins.js";
import { evaluateBinding, evaluateInlineData } from "./eval.js";
import { interopModule } from "./module.js";
import { Binding, parseBindings } from "./binding.js";
import { SSRError, SSRWarning } from "./diagnostic.js";

export interface CommonOptions {
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
   * Whether to fail when a binding fails to evaluate or render. By default,
   * errors will be emitted without failing.
   *
   * @default false
   */
  strict?: boolean | undefined;
}

export interface RenderOptions extends CommonOptions {
  /**
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

export interface RenderResult {
  /**
   * The generated document.
   */
  document: string;
  sourceMap: string;

  errors: SSRError[];
  warnings: SSRWarning[];
}

interface RenderBindingResult {
  propagate: boolean;
  bubble?: (() => Promise<void>) | undefined;
  extend?: (() => Promise<BindingContext>) | undefined;
}

export function render(
  document: string,
  options?: RenderOptions,
): Promise<RenderResult> {
  return new Renderer(document, options).render();
}

class Renderer {
  document: MagicString;
  plugins: Plugin[];
  attributes: string[];
  filename: string | undefined;
  errors: SSRError[] = [];
  warnings: SSRWarning[] = [];
  consumed = false;
  options: RenderOptions;

  constructor(document: string, options?: RenderOptions | undefined) {
    this.document = new MagicString(document, {
      filename: options?.filename,
    });
    this.plugins = [
      ...(options?.useBuiltins !== false ? builtins : []),
      ...(options?.plugins ?? []),
    ];
    this.attributes = options?.attributes ?? ["data-bind"];
    this.filename = options?.filename ?? options?.parent;
    this.options = options ?? {};
  }

  async render(): Promise<RenderResult> {
    if (this.consumed) {
      throw new Error("Renderer has already been consumed.");
    }
    this.consumed = true;

    const parsed = parse(this.document.original);
    await this.scan(parsed);

    const document = this.document.toString();

    const sourceMap = this.document
      .generateMap({
        source: this.filename,
        includeContent: true,
      })
      .toString();

    return {
      document,
      sourceMap,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  async scan(node: ParentNode) {
    if (node instanceof VirtualElement && node.binding === "ssr") {
      await this.renderRoot(node);
      return;
    }

    for (const child of node.children) {
      if (isParentNode(child)) {
        await this.scan(child);
      }
    }
  }

  async resolve(specifier: string): Promise<string> {
    if (this.options.resolve) {
      const resolved = await this.options.resolve(specifier);
      if (!resolved) {
        throw new Error(
          `Cannot resolve ${specifier}${
            this.filename ? ` from ${this.filename}` : ""
          }.`,
        );
      }
      return pathToFileURL(resolved).toString();
    } else {
      if (!this.filename) {
        throw new Error("Filename is required to resolve imports.");
      }
      const parent = pathToFileURL(this.filename).toString();
      return importMetaResolve(specifier, parent);
    }
  }

  async loadSsrData(param: string) {
    if (param.startsWith("{")) {
      return evaluateInlineData(param);
    } else {
      const module = await import(await this.resolve(param));
      return interopModule(module);
    }
  }

  async renderRoot(node: VirtualElement) {
    const data = await this.loadSsrData(node.param.trim());
    const context = new BindingContext(data);

    // Remove virtual element start and end comments.
    const inner = getInnerRange(node, this.document.original);
    this.document.remove(node.range.start.offset, inner.start.offset);
    this.document.remove(inner.end.offset, node.range.end.offset);

    await this.renderDecendants(node, context);
  }

  async createChildContext(
    context: BindingContext,
    extend?: (() => Promise<BindingContext>) | undefined,
  ) {
    return extend ? extend() : context.createChildContext(context.$rawData);
  }

  async renderDecendants(
    node: ParentNode,
    contextOrPropagate: BindingContext | false,
  ) {
    for (const child of node.children) {
      if (child instanceof VirtualElement && child.binding === "ssr") {
        await this.renderRoot(child);
        continue;
      }

      if (
        contextOrPropagate &&
        (child instanceof VirtualElement || child instanceof Element)
      ) {
        await this.renderElement(child, contextOrPropagate);
        continue;
      }
    }
  }

  async renderElement(node: Element | VirtualElement, context: BindingContext) {
    const bindings = parseBindings(
      node,
      this.document.original,
      this.attributes,
    );

    const { propagate, bubble, extend } = await this.#renderBindings(
      bindings,
      context,
    );

    await this.renderDecendants(
      node,
      propagate && (await this.createChildContext(context, extend)),
    );

    await bubble?.();
  }

  async #renderBindings(
    bindings: readonly Binding[],
    context: BindingContext,
  ): Promise<RenderBindingResult> {
    const plugins = bindings.map((binding) =>
      this.plugins.find((plugin) => plugin.filter(binding)),
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
      evaluateBinding(binding.expression, {
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
        generated: this.document,
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
}
