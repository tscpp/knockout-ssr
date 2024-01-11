import { defineConfig } from "vite";
import knockoutSSR from "../../../src/vite/plugin.js";

export default defineConfig({
  plugins: [knockoutSSR()],
  server: {
    hmr: false,
  },
});
