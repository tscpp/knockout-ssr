import { p5, p5ToRange, p5t } from "./parse5-utils.js";

const virtualElementStart = /\s*ko\s+([^\s]+)\s*:([^]*)/;
const virtualElementEnd = /\s*\/ko\s([^]*)/;

export class Position {
  static zero = new Position(0, 0, 0);

  static fromOffset(offset: number, document: string): Position {
    let line = 0,
      column = 0,
      current = 0;

    while (current < offset) {
      if (document[current] === "\n") {
        line++;
        column = 0;
      } else {
        column++;
      }

      current++;
    }

    return new Position(line, column, offset);
  }

  static fromLineAndColumn(
    line: number,
    column: number,
    document: string,
  ): Position {
    let offset = 0;

    for (let i = 0; i < line; i++) {
      offset = document.indexOf("\n", offset) + 1;
    }

    offset += column;

    return new Position(line, column, offset);
  }

  constructor(
    /** zero-indexed */
    public line: number,
    /** zero-indexed */
    public column: number,
    /** zero-indexed */
    public offset: number,
  ) {}

  translate(to: Position): void {
    this.line += to.line;
    this.column += to.column;
    this.offset += to.offset;
  }
}

export class Range {
  readonly start: Position;
  readonly end: Position;

  constructor(start: Position, end: Position);
  constructor(
    startLine: number,
    startColumn: number,
    startOffset: number,
    endLine: number,
    endColumn: number,
    endOffset: number,
  );
  constructor(
    ...args:
      | [Position, Position]
      | [number, number, number, number, number, number]
  ) {
    if (args.length === 2) {
      this.start = args[0];
      this.end = args[1];
    } else {
      this.start = new Position(args[0], args[1], args[2]);
      this.end = new Position(args[3], args[4], args[5]);
    }
  }

  get offset(): readonly [number, number] {
    return [this.start.offset, this.end.offset];
  }

  get isEmpty(): boolean {
    return this.start.offset === this.end.offset;
  }

  translate(position: Position): this {
    this.start.translate(position);
    this.end.translate(position);
    return this;
  }
}

export abstract class Node {
  constructor(public range: Range) {}
}

export class Text extends Node {
  constructor(
    public readonly content: string,
    range: Range,
  ) {
    super(range);
  }
}

export class Comment extends Node {
  constructor(
    public readonly content: string,
    range: Range,
  ) {
    super(range);
  }
}

export class Attribute {
  constructor(
    public readonly name: string,
    public readonly value: string,
    public readonly namespace: string | undefined,
    public readonly prefix: string | undefined,
    public readonly range: Range,
  ) {}
}

export class Element extends Node {
  constructor(
    public readonly tagName: string,
    public readonly attributes: readonly Attribute[],
    public readonly children: readonly Node[],
    range: Range,
  ) {
    super(range);
  }
}

export class VirtualElement extends Node {
  constructor(
    public readonly binding: string,
    public readonly param: string,
    public readonly children: readonly Node[],
    public readonly start: Comment,
    public readonly end: Comment,
    range: Range,
  ) {
    super(range);
  }
}

export class Document extends Node {
  constructor(
    public readonly children: readonly Node[],
    range: Range,
  ) {
    super(range);
  }
}

export interface ParseOptions {
  onError?: ((error: p5.ParserError) => void) | undefined;
}

export function parse(document: string, options?: ParseOptions): Document {
  const root = p5.parseFragment(document, {
    sourceCodeLocationInfo: true,
    scriptingEnabled: false,
    onParseError: options?.onError,
  });
  const iter = root.childNodes[Symbol.iterator]();
  let children: Node[] = [];
  let result: IteratorResult<p5t.Node> | undefined;

  while (!(result = iter.next()).done) {
    children.push(parseNode(result.value, iter));
  }

  return new Document(children, new Range(Position.zero, Position.zero));
}

function parseNode(node: p5t.Node, iter: Iterator<p5t.Node>): Node {
  switch (true) {
    case isP5TextNode(node): {
      return new Text(node.value, p5ToRange(node.sourceCodeLocation!));
    }
    case isP5CommentNode(node): {
      if (virtualElementStart.test(node.data)) {
        const [binding, param] = virtualElementStart
          .exec(node.data)!
          .slice(1) as [string, string];

        let balance = 1;
        let children: p5t.Node[] = [];
        let result: IteratorResult<p5t.Node> | undefined;
        let endComment: p5t.CommentNode | undefined;

        while (!(result = iter.next()).done) {
          if (isP5CommentNode(result.value)) {
            if (virtualElementStart.test(result.value.data)) {
              ++balance;
            } else if (virtualElementEnd.test(result.value.data)) {
              --balance;

              if (balance === 0) {
                endComment = result.value as p5t.CommentNode;
                break;
              }
            }
          }

          children.push(result.value);
        }

        if (!endComment) {
          throw new Error("Unbalanced virtual element (knockout comment).");
        }

        const iter2 = children[Symbol.iterator]();
        let children2: Node[] = [];
        let result2: IteratorResult<p5t.Node> | undefined;

        while (!(result2 = iter2.next()).done) {
          children2.push(parseNode(result2.value, iter2));
        }

        return new VirtualElement(
          binding,
          param,
          children2,
          new Comment(node.data, p5ToRange(node.sourceCodeLocation!)),
          new Comment(
            endComment.data,
            p5ToRange(endComment.sourceCodeLocation!),
          ),
          new Range(
            p5ToRange(node.sourceCodeLocation!).start,
            p5ToRange(endComment.sourceCodeLocation!).end,
          ),
        );
      } else {
        return new Comment(node.data, p5ToRange(node.sourceCodeLocation!));
      }
    }
    case isP5Element(node): {
      const iter = node.childNodes[Symbol.iterator]();
      const children: Node[] = [];
      let current: IteratorResult<p5t.Node> | undefined;

      while (!(current = iter.next()).done) {
        children.push(parseNode(current.value, iter));
      }

      return new Element(
        node.tagName,
        node.attrs.map(
          (attr) =>
            new Attribute(
              attr.name,
              attr.value,
              attr.namespace,
              attr.prefix,
              p5ToRange(node.sourceCodeLocation!.attrs![attr.name]!),
            ),
        ),
        children,
        p5ToRange(node.sourceCodeLocation!),
      );
    }
    default: {
      throw new Error("Unexpected node type");
    }
  }
}

export type ChildNode = Element | VirtualElement | Text | Comment;

export function isChildNode(node: Node): node is ChildNode {
  return (
    node instanceof Element ||
    node instanceof VirtualElement ||
    node instanceof Text ||
    node instanceof Comment
  );
}

export type ParentNode = Element | VirtualElement | Document;

export function isParentNode(node: Node): node is ParentNode {
  return (
    node instanceof Element ||
    node instanceof VirtualElement ||
    node instanceof Document
  );
}

function isP5TextNode(node: p5t.Node): node is p5t.TextNode {
  return node.nodeName === "#text";
}

function isP5CommentNode(node: p5t.Node): node is p5t.CommentNode {
  return node.nodeName === "#comment";
}

function isP5Element(node: p5t.Node): node is p5t.Element {
  return node.nodeName !== "#text" && node.nodeName !== "#comment";
}
