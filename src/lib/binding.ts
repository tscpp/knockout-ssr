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

function parseFromElement(
  node: Element,
  original: string,
  parseAttributes: string[],
) {
  const bindingsToJs = (attribute: string) => {
    return `{${attribute}}`;
  };

  const parseAttributeBindings = (js: string) => {
    const expr = acorn.parseExpressionAt(js, 0, {
      ecmaVersion: "latest",
      ranges: true,
    });
    assert(expr.type === "ObjectExpression", "Expected an object expression.");
    return expr;
  };

  const attributes = node.attributes.filter((attribute) =>
    parseAttributes.includes(attribute.name),
  );

  return attributes.flatMap((attribute) => {
    if (!attribute?.value) return [];

    const js = bindingsToJs(attribute.value);
    const obj = parseAttributeBindings(js);

    return obj.properties.map((prop) => {
      assert(prop.type === "Property", "Expected a property.");
      assert(prop.key.type === "Identifier", "Expected an identifier.");

      // Find offset where the attribute value starts
      let start = original.indexOf("=", attribute.range.start.offset) + 1;
      const afterEq = original[start];
      if (afterEq === '"') {
        ++start;
      }
      const quote = afterEq === '"' ? "'" : '"';

      // Create binding
      const expression = transform(js.slice(...prop.value.range!), quote);
      const range = new Range(
        Position.fromOffset(prop.range![0] - 1 + start, original),
        Position.fromOffset(prop.range![1] - 1 + start, original),
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
