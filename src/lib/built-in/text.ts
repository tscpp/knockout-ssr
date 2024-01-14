import { Plugin } from "../plugin.js";
import * as utils from "../utils.js";

const text: Plugin = {
  filter: (binding) => binding.name === "text",
  ssr({ binding, generated, value }) {
    const asHtml = utils.escapeHtml(String(value()));
    const innerRange = utils.getInnerRange(binding.parent, generated.original);

    if (innerRange.isEmpty) {
      generated.appendLeft(innerRange.start.offset, asHtml);
    } else {
      generated.update(innerRange.start.offset, innerRange.end.offset, asHtml);
    }
  },
};

export default text;
