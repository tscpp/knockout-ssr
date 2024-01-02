import type { Plugin } from "vite";
import rollupPlugin, { KnockoutSSRPluginOptions } from "../rollup/plugin.js";

export function knockoutSSR(options?: KnockoutSSRPluginOptions): Plugin {
  return rollupPlugin(options);
}

export default knockoutSSR;
export type { KnockoutSSRPluginOptions };
