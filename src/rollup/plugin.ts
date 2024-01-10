import { FilterPattern, createFilter, dataToEsm } from "@rollup/pluginutils";
import type { Plugin } from "rollup";
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

      const generated = await render(code, {
        ...options,
        parent: id,
      });

      return {
        code: dataToEsm(generated.document),
        map: null,
      };
    },
  };
}

export default knockoutSSR;
