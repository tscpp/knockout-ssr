import { Element } from "../parser.js";
import { Plugin } from "../plugin.js";
import value from "./value.js";

const textInput: Plugin = {
  filter: (binding) =>
    binding.name === "textInput" && binding.parent instanceof Element,
  ssr: value.ssr,
};

export default textInput;
