import { Element } from "../parser.js";
import { Plugin } from "../plugin.js";
import * as utils from "../utils.js";

const value: Plugin = {
  filter: (binding) =>
    binding.name === "value" && binding.parent instanceof Element,
  ssr({ binding, generated, value }) {
    utils.setAttribute(
      generated,
      binding.parent as Element,
      "value",
      value() === undefined || value() === null ? null : String(value()),
    );
  },
};

export default value;
