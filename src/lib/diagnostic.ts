import { Range } from "./parser.js";

const isDiagnosticSymbol = Symbol("is diagnostic");

export type DiagnosticType = "error" | "warning";

interface _Diagnostic {
  [isDiagnosticSymbol]: true;
  type: DiagnosticType;
  message: string;
  cause?: unknown;
  range?: Range;
  filename?: string;
}

export type Diagnostic = DiagnosticError | DiagnosticWarning;

export interface DiagnosticError extends _Diagnostic {
  type: "error";
}

export interface DiagnosticWarning extends _Diagnostic {
  type: "warning";
}

export function createDiagnostic<T extends DiagnosticType>(init: {
  type: T;
  message: string;
  cause?: unknown;
  range?: Range;
  filename?: string;
}) {
  return {
    [isDiagnosticSymbol]: true,
    ...init,
  } as Diagnostic & { type: T };
}

export function isDiagnostic(value: unknown): value is Diagnostic {
  return (
    typeof value === "object" && value !== null && isDiagnosticSymbol in value
  );
}

export function toMessage(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}
