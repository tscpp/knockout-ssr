import { FilterPattern, createFilter } from "@rollup/pluginutils";
import type { Plugin } from "rollup";
import { pathToFileURL } from "url";
import { RenderOptions, render } from "../lib/ssr.js";

export interface KnockoutSSRPluginOptions extends RenderOptions {
  /**
   * @default /\.html?$/
   */
  include?: FilterPattern | undefined;
  exclude?: FilterPattern | undefined;
}

export function knockoutSSR(options?: KnockoutSSRPluginOptions): Plugin {
  const filter = createFilter(options?.include ?? /\.html?$/, options?.exclude);

  return {
    name: "knockout-ssr",
    async transform(code, id) {
      if (!filter(id)) {
        return;
      }

      const url = pathToFileURL(id).toString();

      const generated = await render(code, {
        ...options,
        parent: url,
      });

      return {
        code: generated.document,
        map: null,
      };
    },
  };
}

export default knockoutSSR;
