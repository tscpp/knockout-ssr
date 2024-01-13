import { Position, Range } from "./parser.js";
import type * as p5 from "parse5";

export function p5ToRange(location: p5.Token.Location): Range {
  return new Range(
    new Position(
      location.startLine - 1,
      location.startCol - 1,
      location.startOffset,
    ),
    new Position(location.endLine - 1, location.endCol - 1, location.endOffset),
  );
}

export * as p5 from "parse5";
export type * as p5t from "../../node_modules/parse5/dist/tree-adapters/default.js";
