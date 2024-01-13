import { Plugin } from "../plugin.js";
import * as utils from "../utils.js";
import using from "./using.js";

const with_: Plugin = {
  filter: (binding) => binding.name === "with",
  async ssr({ binding, generated, value, bubble }) {
    let template: string | undefined;

    bubble(() => {
      if (value) {
        template = utils.extractIntoTemplate(binding, generated);
      }

      let expr = "_ssr_with: { ";
      if (template) {
        expr += `template: ${utils.quoteJsString(template, binding.quote)}, `;
      }
      expr += `value: ${binding.expression} }`;
      generated.overwrite(...binding.range.offset, expr);
    });
  },
  propagate: ({ value }) => !!value,
  extend: using.extend,
};

export default with_;
