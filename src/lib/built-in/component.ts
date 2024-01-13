import { Plugin } from "../plugin.js";

const component: Plugin = {
  filter: (binding) => binding.name === "component",
  propagate: () => false,
};

export default component;
