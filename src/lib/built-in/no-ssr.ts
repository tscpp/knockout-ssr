import { Plugin } from "../plugin.js";

const noSsr: Plugin = {
  filter: (binding) => binding.name === "noSsr" || binding.name === "noSSR",
  propagate: () => false,
};

export default noSsr;
