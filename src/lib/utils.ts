import { Element, Position, Range, VirtualElement } from "./parsers/html.js";
import MagicString from "magic-string";

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
  // const outer = document.slice(node.range.start.offset, node.range.end.offset);
  // const startOffset = node.range.start.offset + outer.indexOf("-->") + 3;
  // const endOffset = node.range.start.offset + outer.lastIndexOf("<!--");
  // return new Range(
  //   Position.fromOffset(startOffset, document),
  //   Position.fromOffset(endOffset, document),
  // );
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

export function toggleVisibillity(
  generated: MagicString,
  element: Element,
  visible: boolean,
) {
  if (visible) {
    const attr = element.attributes.find((attr) => attr.name === "style");

    if (attr) {
      const value = attr.value.replace(
        /(^|;)\s*display\s*:\s*[^]+?\s*(;|$)/,
        "$2",
      );

      generated.update(attr.range.start.offset, attr.range.end.offset, value);
    }
  } else {
    const attr = element.attributes.find((attr) => attr.name === "style");

    if (attr) {
      if (/(^|;)\s*display\s*:/.test(attr.value)) {
        const value = attr.value.replace(
          /(^|;)\s*display\s*:\s*[^]+?\s*(;|$)/,
          "$1display:none$2",
        );

        generated.update(attr.range.start.offset, attr.range.end.offset, value);
      } else {
        generated.appendLeft(
          attr.range.end.offset - 1,
          (attr.value.trim().endsWith(";") ? "" : "; ") + "display: none",
        );
      }
    } else {
      const innerRange = getInnerRange(element, generated.original);

      generated.appendLeft(
        innerRange.start.offset - 1,
        ` style="display: none"`,
      );
    }
  }
}

export function addClass(
  generated: MagicString,
  element: Element,
  className: string,
) {
  const attr = element.attributes.find((attr) => attr.name === "class");

  if (attr) {
    const classes = new Set(attr.value.split(/\s+/));
    classes.add(className);
    const value = [...classes].join(" ");
    generated.update(attr.range.start.offset, attr.range.end.offset, value);
  } else {
    const innerRange = getInnerRange(element, generated.original);
    generated.appendLeft(innerRange.start.offset - 1, ` class="${className}"`);
  }
}

export function removeClass(
  generated: MagicString,
  element: Element,
  className: string,
) {
  const attr = element.attributes.find((attr) => attr.name === "class");

  if (attr) {
    const classes = new Set(attr.value.split(/\s+/));
    classes.delete(className);
    const value = [...classes].join(" ");
    generated.update(attr.range.start.offset, attr.range.end.offset, value);
  }
}
