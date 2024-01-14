import { Plugin } from "../plugin.js";

const using: Plugin = {
  filter: (binding) => binding.name === "using",
  extend({ parent }) {
    const as = parent.siblings.find((sibling) => sibling.binding.name === "as");

    return parent.context.createChildContext(
      parent.rawValue(),
      as ? String(as.value()) : undefined,
    );
  },
};

export default using;
