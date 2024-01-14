import { render } from "../../src/lib/exports.js";
import assert from "node:assert/strict";
import test from "node:test";

// Prettier can format the template literals as html when tagged.
const html = String.raw;

test.only("handles non-existent viewmodel", async () => {
  const { document, errors } = await render(
    html`
      <!-- ko ssr: ./does-not-exist.js -->
      <div data-bind="text: text"></div>
      <!-- /ko -->
    `,
    {
      filename: "test/unit/assets/unnamed.html",
    },
  );
  assert(
    errors.some((error) => error.code === "cannot-find-module"),
    "Could not find 'cannot-find-module' error",
  );
  assert(document.includes("><"));
});

test.only("handles invalid binding expression", async () => {
  const source = html`
    <!-- ko ssr: {} -->
    <div data-bind="text: ???"></div>
    <!-- /ko -->
  `;
  const { document, errors } = await render(source, {
    filename: "test/unit/assets/unnamed.html",
  });
  const error = errors.find(
    (error) => error.code === "binding-parse-error",
  );
  assert(error, "Could not find 'binding-parse-error' error");
  assert(
    source.at(error!.range.start.offset) === "?",
    "Error has invalid start offset",
  );
  assert(
    source.at(error!.range.end.offset) === "?",
    "Error has invalid end offset",
  );
  assert(document.includes("><"));
});
