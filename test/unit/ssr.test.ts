import { Plugin, render, utils } from "../../src/lib/exports.js";
import assert from "node:assert/strict";
import test, { describe } from "node:test";

// Prettier can format the template literals as html when tagged.
const html = String.raw;

describe("server-side rendering", () => {
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

  test("resolves viewmodel from relative path", async () => {
    const { document } = await render(
      html`
        <!-- ko ssr: ./viewmodel.js -->
        <div data-bind="text: 'Hello ' + name"></div>
        <!-- /ko -->
      `,
      {
        filename: "test/unit/assets/unnamed.html",
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
    const i18nPlugin: Plugin = {
      filter: (binding) => binding.name === "i18n",
      ssr: ({ binding, generated, context, value }) => {
        const lang = (context.$data as any).language;
        const key = value;
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

  test("renders with binding", async () => {
    const { document } = await render(`
      <!-- ko ssr: { foo: { bar: 'baz' } } -->
        <!-- ko with: foo -->
          <div data-bind="text: bar"></div>
        <!-- /ko -->
      <!-- /ko -->
    `);
    assert(document.includes(">baz<"));
  });

  test("renders using binding", async () => {
    const { document } = await render(`
      <!-- ko ssr: { foo: { bar: 'baz' } } -->
        <div data-bind="using: foo, as: 'hi'">
          <div data-bind="text: hi.bar"></div>
        </div>
      <!-- /ko -->
    `);
    assert(document.includes(">baz<"));
  });

  test("renders let binding", async () => {
    const { document } = await render(`
      <!-- ko ssr: { } -->
        <!-- ko let: { foo: 'bar' } -->
        <div data-bind="text: foo"></div>
        <!-- /ko -->
      <!-- /ko -->
    `);
    assert(document.includes(">bar<"));
  });

  test("renders value binding", async () => {
    const { document } = await render(`
      <!-- ko ssr: { value: 'foo' } -->
        <input data-bind="value: value">
      <!-- /ko -->
    `);
    assert(/value=["']foo/.test(document));
  });

  test("renders checked binding", async () => {
    const { document } = await render(`
      <!-- ko ssr: { value: true } -->
        <input data-bind="checked: value">
      <!-- /ko -->
    `);
    assert(document.includes('checked=""'));
  });

  test("renders disabled binding", async () => {
    const { document } = await render(`
      <!-- ko ssr: { value: true } -->
        <input data-bind="disabled: value">
      <!-- /ko -->
    `);
    assert(document.includes('disabled=""'));
  });
});
