import { Range } from "./parser.js";

export class SSRWarning extends Error {
  constructor(
    message: string,
    public readonly range: Range,
    public readonly filename: string,
  ) {
    super(message);
  }

  override toString() {
    return `${this.filename}:${this.range.start.line}:${this.range.start.column}: ${this.message}`;
  }
}

export class SSRError extends Error {
  constructor(
    message: string,
    public readonly range: Range,
    public readonly filename: string,
  ) {
    super(message);
  }

  override toString() {
    return `${this.filename}:${this.range.start.line}:${this.range.start.column}: ${this.message}`;
  }
}
