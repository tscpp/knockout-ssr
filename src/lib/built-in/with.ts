import { Plugin } from "../plugin.js";
import * as utils from "../utils.js";
import using from "./using.js";

const with_: Plugin = {
  filter: (binding) => binding.name === "with",
  async ssr({ binding, generated, value, bubble }) {
    let template: string | undefined;
    const q = binding.quote;

    bubble(() => {
      if (value) {
        template = utils.extractIntoTemplate(binding, generated);
      }

      let expr = "_ssr_with: { ";
      if (template) {
        expr += `template: ${q}${utils.escapeHtml(template)}${q}, `;
      }
      expr += `value: ${binding.expression} }`;
      generated.overwrite(...binding.range.offset, expr);
    });
  },
  propagate: ({ value }) => !!value,
  extend: using.extend,
};

export default with_;
