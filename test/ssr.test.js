import { render, utils } from "../dist/index.js";
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

test("renders using custom plugin", async () => {
  const translations = {
    fr: {
      greeting: "bonjour",
    },
  };
  /** @type {import('../build/lib/exports.js').Plugin} */
  const i18nPlugin = {
    filter: (binding) => binding.name === "i18n",
    ssr: (binding, generated, context) => {
      const lang = context.$data.language;
      const key = binding.value;
      const asHtml = utils.escapeHtml(translations[lang][key]);

      const inner = utils.getInnerRange(binding.parent, generated.original);
      if (inner.isEmpty) {
        generated.appendLeft(inner.start.offset, asHtml);
      } else {
        generated.update(...inner.offset, asHtml);
      }
    },
  };
  const { document } = await render(
    html`
      <!-- ko ssr: { language: "fr" } -->
      <div data-bind="i18n: 'greeting'"></div>
      <!-- /ko -->
    `,
    {
      plugins: [i18nPlugin],
    },
  );
  assert(document.includes(`>${translations.fr.greeting}<`));
});

test("renders style binding on element", async () => {
  const { document } = await render(html`
    <!-- ko ssr: {} -->
    <div data-bind="style: { color: 'red' }"></div>
    <!-- /ko -->
  `);
  assert(/style=["'][^]*color:\s*red/.test(document));
});

test("renders attr binding on element", async () => {
  const { document } = await render(html`
    <!-- ko ssr: {} -->
    <div data-bind="attr: { title: 'Hello' }"></div>
    <!-- /ko -->
  `);
  assert(/title=["'][^]*Hello/.test(document));
});
