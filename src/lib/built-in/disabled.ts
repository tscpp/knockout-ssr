import { Element } from "../parser.js";
import { Plugin } from "../plugin.js";
import * as utils from "../utils.js";

export const enabled = createEnablePlugin("enabled", true);
export const disabled = createEnablePlugin("disabled", false);

function createEnablePlugin(name: string, thruthy: boolean): Plugin {
  return {
    filter: (binding) =>
      binding.name === name && binding.parent instanceof Element,
    ssr({ binding, generated, value }) {
      utils.setAttribute(
        generated,
        binding.parent as Element,
        "disabled",
        value == thruthy ? null : "",
      );
    },
  };
}
