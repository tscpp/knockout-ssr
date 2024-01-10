import assert from "node:assert/strict";
import test from "node:test";
import { rollup } from "rollup";
import knockoutSSR from "../dist/rollup/index.js";

test("rollup", async () => {
  const build = await rollup({
    input: "test/assets/view.html",
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
