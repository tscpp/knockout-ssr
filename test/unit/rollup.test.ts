import assert from "node:assert/strict";
import test from "node:test";
import { rollup } from "rollup";
import knockoutSSR from "../../src/rollup/plugin.js";

test("rollup", async () => {
  const build = await rollup({
    input: "test/unit/assets/view.html",
    plugins: [knockoutSSR()],
  });

  const { output } = await build.generate({
    format: "esm",
  });
  const [chunk] = output;

  assert(
    chunk.code.includes("SSR"),
    "generated chunk is missing rendered text",
  );
});
