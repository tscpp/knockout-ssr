import test from "node:test";
import { render } from "../dist/index.js";
import assert from "node:assert/strict";

test("has binding context", async () => {
  const { document } = await render(`
    <!-- ko ssr: { exists: true } -->
    <div data-bind="text: $context && $data.exists ? 'yes' : 'no'"></div>
    <!-- /ko -->
  `);
  assert(document.includes(">yes<"));
});
