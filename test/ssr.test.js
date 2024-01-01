import { render } from "../build/lib/exports.js";
import assert from "node:assert/strict";
import test from "node:test";

// Prettier can format the template literals as html when tagged.
const html = String.raw;

test("renders text binding into element", async () => {
  const { document } = await render(html`
    <!-- ko ssr: {} -->
    <div data-bind="text: 'Hello'"></div>
    <!-- /ko -->
  `);
  assert(document.includes(">Hello<"));
});

test("renders data from inline viewmodel", async () => {
  const { document } = await render(html`
    <!-- ko ssr: { name: 'SSR' } -->
    <div data-bind="text: 'Hello ' + name"></div>
    <!-- /ko -->
  `);
  assert(document.includes(">Hello SSR<"));
});

test("renders data from external viewmodel", async () => {
  const { document } = await render(html`
    <!-- ko ssr: ./test/assets/viewmodel.js -->
    <div data-bind="text: 'Hello ' + name"></div>
    <!-- /ko -->
  `);
  assert(document.includes(">Hello SSR<"));
});

test("resolves viewmodel from relative path", async () => {
  const { document } = await render(
    html`
      <!-- ko ssr: ./viewmodel.js -->
      <div data-bind="text: 'Hello ' + name"></div>
      <!-- /ko -->
    `,
    {
      parent: "test/assets/unnamed.html",
    },
  );
  assert(document.includes(">Hello SSR<"));
});

test("renders html binding into element", async () => {
  const { document } = await render(html`
    <!-- ko ssr: {} -->
    <div data-bind="html: '<b>Hello</b>'"></div>
    <!-- /ko -->
  `);
  assert(document.includes("><b>Hello</b><"));
});

test("renders visible binding on element", async () => {
  const { document } = await render(html`
    <!-- ko ssr: {} -->
    <div data-bind="visible: false"></div>
    <!-- /ko -->
  `);
  assert(/style=["'][^]*display:\s*none/.test(document));
});

test("renders class binding on element", async () => {
  const { document } = await render(html`
    <!-- ko ssr: {} -->
    <div data-bind="class: 'foo'"></div>
    <!-- /ko -->
  `);
  assert(/class=["'][^]*foo/.test(document));
});

test("renders css binding on element", async () => {
  const { document } = await render(html`
    <!-- ko ssr: {} -->
    <div data-bind="css: { foo: true }"></div>
    <!-- /ko -->
  `);
  assert(/class=["'][^]*foo/.test(document));
});
