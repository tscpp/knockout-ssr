import assert from "node:assert/strict";
import { transform } from "./eval.js";
import { Element, Position, Range, VirtualElement } from "./parser.js";
import * as acorn from "acorn";

export class Binding {
  constructor(
    public readonly name: string,
    public readonly expression: string,
    public readonly quote: "'" | '"',
    public readonly parent: Element | VirtualElement,
    public readonly range: Range,
  ) {}
}

export class BindingParseError extends Error {
  constructor(
    message: string,
    public range: Range,
  ) {
    super(message);
  }
}

export function parseBindings(
  node: Element | VirtualElement,
  original: string,
  attributes?: string[] | undefined,
) {
  if (node instanceof Element) {
    return parseFromElement(node, original, attributes ?? ["data-bind"]);
  } else {
    return [parseFromVirtualElement(node, original)];
  }
}

const parseExpression = (expr: string, translate: number, source: string) => {
  try {
    return acorn.parseExpressionAt(expr, 0, {
      ecmaVersion: "latest",
      ranges: true,
    });
  } catch (error) {
    if (error instanceof SyntaxError && "pos" in error && "raisedAt" in error) {
      const message = error.message.slice(
        0,
        error.message.lastIndexOf("(") - 1,
      );

      const startOffset = error.pos as number;
      const start = Position.fromOffset(startOffset + translate, source);
      const endOffset = error.raisedAt as number;
      const end = Position.fromOffset(endOffset + translate, source);

      throw new BindingParseError(message, new Range(start, end));
    } else {
      throw error;
    }
  }
};

function parseFromElement(
  node: Element,
  original: string,
  parseAttributes: string[],
) {
  const bindingsToJs = (attribute: string) => {
    return `{${attribute}}`;
  };

  const attributes = node.attributes.filter((attribute) =>
    parseAttributes.includes(attribute.name),
  );

  return attributes.flatMap((attribute) => {
    if (!attribute?.value) return [];

    // Find offset where the attribute value starts
    let start = original.indexOf("=", attribute.range.start.offset) + 1;
    const afterEq = original[start];
    if (afterEq === '"') {
      ++start;
    }
    const offset = start - 1;
    const quote = afterEq === '"' ? "'" : '"';

    const js = bindingsToJs(attribute.value);
    const obj = parseExpression(js, start - 1, original);
    assert(obj.type === "ObjectExpression", "Expected an object expression.");

    return obj.properties.map((prop) => {
      assert(prop.type === "Property", "Expected a property.");
      assert(prop.key.type === "Identifier", "Expected an identifier.");

      // Create binding
      const expression = transform(js.slice(...prop.value.range!), quote);
      const range = new Range(
        Position.fromOffset(prop.range![0] + offset, original),
        Position.fromOffset(prop.range![1] + offset, original),
      );
      return new Binding(prop.key.name, expression, quote, node, range);
    });
  });
}

function parseFromVirtualElement(node: VirtualElement, original: string) {
  // Create binding
  const expression = transform(node.param);

  const m1 = /^\s*ko\s*/.exec(node.start.content);
  assert(m1, "Expected a knockout comment.");

  const m2 = /\s*^/.exec(node.end.content);
  assert(m2);

  const start = node.start.range.start.offset + "<!--".length + m1[0].length;
  const end = node.end.range.end.offset - "-->".length - m2[0].length;

  const range = new Range(
    Position.fromOffset(start, original),
    Position.fromOffset(end, original),
  );
  return new Binding(node.binding, expression, '"', node, range);
}
