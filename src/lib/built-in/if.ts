import { Plugin } from "../plugin.js";
import * as utils from "../utils.js";

export const if_: Plugin = createIfPlugin(
  (binding) => binding.name === "if",
  true,
);
export const ifnot: Plugin = createIfPlugin(
  (binding) => binding.name === "ifnot",
  false,
);

function createIfPlugin(filter: Plugin["filter"], test: boolean): Plugin {
  return {
    filter,
    propagate: ({ value }) => value() == test,
    ssr({ binding, generated, value, bubble }) {
      bubble(() => {
        const tmpl =
          value() == test
            ? undefined
            : utils.extractIntoTemplate(binding, generated);

        // Replace binding with "_ssr_if"
        const q = binding.quote;
        generated.overwrite(
          ...binding.range.offset,
          `_ssr_if: { ${tmpl ? `template: ${q}${tmpl}${q},` : ""}value: ${
            binding.expression
          } }`,
        );
      });
    },
  };
}
