import { Element } from "../parser.js";
import { Plugin } from "../plugin.js";
import * as utils from "../utils.js";

const checked: Plugin = {
  filter: (binding) =>
    binding.name === "checked" && binding.parent instanceof Element,
  ssr({ binding, generated, value }) {
    utils.setAttribute(
      generated,
      binding.parent as Element,
      "checked",
      value ? "" : null,
    );
  },
};

export default checked;
