import MagicString from "magic-string";
import * as acorn from "acorn";
import * as acornWalk from "acorn-walk";
import { escapeJs } from "./utils.js";
import { BindingContext } from "./binding-context.js";

/**
 * Transform an knockout binding expression to a valid javascript expression.
 */
export function transform(expression: string, quote = '"'): string {
  const magic = new MagicString(expression);
  const parsed = acorn.parseExpressionAt(expression, 0, {
    ecmaVersion: "latest",
    ranges: true,
  });

  // Transform the expression to check if the identifier is defined in $data,
  // and if not, it uses the identifier from the global scope.
  acornWalk.simple(parsed, {
    Identifier(node: acorn.Identifier) {
      const q = (s: string) => quote + escapeJs(s) + quote;

      magic.overwrite(
        node.start!,
        node.end!,
        `(${q(node.name)} in $context ? $context[${q(
          node.name,
        )}] : $data !== null && typeof $data === ${q("object")} && ${q(
          node.name,
        )} in $data ? $data[${q(node.name)}] : ${node.name})`,
      );
    },
  });

  return magic.toString();
}

/**
 * Evaluates an expression with the provided binding context.
 */
export function evaluateBinding(expression: string, context: object) {
  try {
    return new Function(...Object.keys(context), `return ${expression}`)(
      ...Object.values(context),
    );
  } catch (error) {
    throw new Error(`Failed to evaluate expression: ${expression}`, {
      cause: error,
    });
  }
}

export function evaluate(expression: string, context: BindingContext) {
  return evaluateBinding(transform(expression), context);
}

export function evaluateInlineData(expression: string) {
  return new Function(`return ${expression}`)();
}
