import * as parse5 from "./_parse5.js";

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

  move(line: number, column: number): void;
  move(offset: number): void;
  move(...args: [number, number] | [number]): void {
    if (args.length === 1) {
      const position = Position.fromOffset(args[0], "");
      this.line = position.line;
      this.column = position.column;
      this.offset = position.offset;
    } else {
      this.line += args[0];
      this.column += args[1];
      this.offset += args[1];
    }
  }
}

export function parse5ToRange(location: parse5.Token.Location): Range {
  return new Range(
    new Position(
      location.startLine - 1,
      location.startCol - 1,
      location.startOffset,
    ),
    new Position(location.endLine - 1, location.endCol - 1, location.endOffset),
  );
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

  move(line: number, column: number): void;
  move(offset: number): void;
  move(...args: [number, number] | [number]): void {
    if (args.length === 1) {
      this.start.move(...args);
      this.end.move(...args);
    } else {
      this.start.move(...args);
      this.end.move(...args);
    }
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

export function parse(document: string): Document {
  const root = parse5.parseFragment(document, { sourceCodeLocationInfo: true });
  const iter = root.childNodes[Symbol.iterator]();
  let children: Node[] = [];
  let result: IteratorResult<parse5.Node> | undefined;

  while (!(result = iter.next()).done) {
    children.push(parseNode(result.value, iter));
  }

  return new Document(children, new Range(Position.zero, Position.zero));
}

function parseNode(node: parse5.Node, iter: Iterator<parse5.Node>): Node {
  switch (true) {
    case parse5.isTextNode(node): {
      return new Text(node.value, parse5ToRange(node.sourceCodeLocation!));
    }
    case parse5.isCommentNode(node): {
      if (virtualElementStart.test(node.data)) {
        const [binding, param] = virtualElementStart
          .exec(node.data)!
          .slice(1) as [string, string];

        let balance = 1;
        let children: parse5.Node[] = [];
        let result: IteratorResult<parse5.Node> | undefined;
        let endComment: parse5.CommentNode | undefined;

        while (!(result = iter.next()).done) {
          if (parse5.isCommentNode(result.value)) {
            if (virtualElementStart.test(result.value.data)) {
              ++balance;
            } else if (virtualElementEnd.test(result.value.data)) {
              --balance;

              if (balance === 0) {
                endComment = result.value as parse5.CommentNode;
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
        let result2: IteratorResult<parse5.Node> | undefined;

        while (!(result2 = iter2.next()).done) {
          children2.push(parseNode(result2.value, iter2));
        }

        return new VirtualElement(
          binding,
          param,
          children2,
          new Comment(node.data, parse5ToRange(node.sourceCodeLocation!)),
          new Comment(
            endComment.data,
            parse5ToRange(endComment.sourceCodeLocation!),
          ),
          new Range(
            parse5ToRange(node.sourceCodeLocation!).start,
            parse5ToRange(endComment.sourceCodeLocation!).end,
          ),
        );
      } else {
        return new Comment(node.data, parse5ToRange(node.sourceCodeLocation!));
      }
    }
    case parse5.isElement(node): {
      const iter = node.childNodes[Symbol.iterator]();
      const children: Node[] = [];
      let current: IteratorResult<parse5.Node> | undefined;

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
              parse5ToRange(node.sourceCodeLocation!.attrs![attr.name]!),
            ),
        ),
        children,
        parse5ToRange(node.sourceCodeLocation!),
      );
    }
    default: {
      throw new Error("Unexpected node type");
    }
  }
}

export function isChildNode(
  node: Node,
): node is Element | VirtualElement | Text | Comment {
  return (
    node instanceof Element ||
    node instanceof VirtualElement ||
    node instanceof Text ||
    node instanceof Comment
  );
}

export function isParentNode(
  node: Node,
): node is Element | VirtualElement | Document {
  return (
    node instanceof Element ||
    node instanceof VirtualElement ||
    node instanceof Document
  );
}
