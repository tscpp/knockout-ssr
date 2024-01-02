import {
  Element,
  Position,
  Range,
  VirtualElement,
  parse5ToRange,
} from "./parsers/html.js";
import MagicString from "magic-string";
import * as parse5 from "./parsers/_parse5.js";
import inlineStyleParser from "inline-style-parser";

const parseInlineStyle =
  inlineStyleParser as unknown as typeof inlineStyleParser.default;

export function getInnerRange(
  node: Element | VirtualElement,
  document: string,
): Range {
  if (node instanceof Element) {
    return getInnerRangeOfElement(node, document);
  } else {
    return getInnerRangeOfVirtualElement(node, document);
  }
}

function getInnerRangeOfElement(node: Element, document: string): Range {
  if (node.children.length > 0) {
    return new Range(
      node.children[0]!.range.start,
      node.children.at(-1)!.range.end,
    );
  }

  const outer = document.slice(node.range.start.offset, node.range.end.offset);
  let quote = false,
    escape = false;
  let offset: number | undefined;

  for (const [i, char] of Array.from(outer).entries()) {
    if (char === '"' && !escape) {
      quote = !quote;
    }

    escape = quote && char === "\\";

    if (!quote && char === ">") {
      offset = node.range.start.offset + i + 1;
      break;
    }
  }

  if (offset === undefined) {
    throw new Error("Unterminated element");
  }

  // We can assume the start and end offset is the same because the node has no
  // children.
  return new Range(
    Position.fromOffset(offset, document),
    Position.fromOffset(offset, document),
  );
}

function getInnerRangeOfVirtualElement(
  node: VirtualElement,
  _document: string,
): Range {
  return new Range(node.start.range.end, node.end.range.start);
}

export function escapeHtml(string: string) {
  return string
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function setStyle(
  generated: MagicString,
  element: Element,
  property: string,
  value: string | null,
) {
  const attr = element.attributes.find((attr) => attr.name === "style");

  if (attr) {
    const styles = parseInlineStyle(attr.value);

    for (const style of styles) {
      if (style.type === "declaration" && style.property === property) {
        const range = new Range(
          Position.fromLineAndColumn(
            style.position.start.line,
            style.position.start.column,
            attr.value,
          ),
          Position.fromLineAndColumn(
            style.position.end.line,
            style.position.end.column,
            attr.value,
          ),
        );
        range.move(attr.range.start.offset);
        generated.remove(...range.offset);
      }
    }

    if (value !== null) {
      generated.appendLeft(attr.range.start.offset, `${property}: ${value};`);
    }
  } else if (value !== null) {
    setAttribute(generated, element, "style", `${property}: ${value};`);
  }
}

export function hasClass(
  generated: MagicString,
  element: Element,
  className: string,
): boolean {
  const attr = getAttribute(generated, element, "class");

  if (attr === null) {
    return false;
  } else {
    const classes = attr.split(/\s+/);
    return classes.includes(className);
  }
}

export function addClass(
  generated: MagicString,
  element: Element,
  className: string,
) {
  const attr = getAttribute(generated, element, "class");

  if (attr === null) {
    setAttribute(generated, element, "class", className);
  } else {
    const classes = attr.split(/\s+/);
    if (classes.includes(className)) return;
    classes.push(className);
    const value = classes.join(" ");
    setAttribute(generated, element, "class", value);
  }
}

export function removeClass(
  generated: MagicString,
  element: Element,
  className: string,
) {
  const attr = getAttribute(generated, element, "class");

  if (attr !== null) {
    const classes = attr.split(/\s+/);
    const index = classes.indexOf(className);
    if (index !== -1) {
      classes.splice(index, 1);
      const value = classes.join(" ");
      setAttribute(generated, element, "class", value);
    }
  }
}

export function getAttribute(
  generated: MagicString,
  element: Element,
  name: string,
): string | null {
  const fragment5 = parse5.parseFragment(
    generated.slice(...element.range.offset),
    { sourceCodeLocationInfo: true },
  );
  const element5 = fragment5.childNodes[0] as parse5.Element;
  const attr5 = element5.attrs.find((attr) => attr.name === name);
  return attr5?.value ?? null;
}

export function setAttribute(
  generated: MagicString,
  element: Element,
  name: string,
  value: string | null,
) {
  const fragment5 = parse5.parseFragment(
    generated.slice(...element.range.offset),
    { sourceCodeLocationInfo: true },
  );
  const element5 = fragment5.childNodes[0] as parse5.Element;

  if (element5.attrs.find((attr) => attr.name === name)) {
    const range = parse5ToRange(element5.sourceCodeLocation!.attrs![name]!);

    if (value === null) {
      generated.remove(range.start.offset, range.end.offset);
    } else {
      generated.update(range.start.offset, range.end.offset, escapeHtml(value));
    }
  } else if (value !== null) {
    const innerRange = getInnerRange(element, generated.original);
    generated.appendLeft(
      innerRange.start.offset - 1,
      ` ${name}="${escapeHtml(value)}"`,
    );
  }
}
