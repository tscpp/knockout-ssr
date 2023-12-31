# Knockout SSR

### 🚧 Proof of concept 🚧

This library is a proof of concept showcasing some exciting ideas I've been exploring.

More documentation is comming later. Rely on typings and tests for now.

## Introduction

`knockout-ssr` is a tool designed to enhance Knockout v3 applications by enabling server-side rendering (SSR) and Static Site Generation (SSG). It integrates easily into any build process and allows for gradual implementation without requiring a complete overhaul of your existing application.

### Why?

While Knockout remains a simple yet powerful tool, it lags behind modern frameworks in certain features, particularly SSR. `knockout-ssr` bridges this gap, offering a straightforward solution to enhance your Knockout applications. This library significantly boosts SEO and allows for asynchronous hydration, which significantly improves load speeds.

## How does it work?

The library parses HTML documents to identify Knockout-specific binding attributes and virtual elements. It then server-renders these bindings by executing the binding values as JavaScript, utilizing the corresponding viewmodel.

Leveraging Knockout's MVVM pattern, which relies on underlying data models, `knockout-ssr` allows for the creation of isomorphic viewmodels operative on both server and client sides, or distinct server-side viewmodels. Client-side, you can use `applyBindings` as usual for correct view hydration. For enhanced performance, consider asynchronously executing `applyBindings` to reduce JavaScript blocking and improve page load times.

### Writing Views

To use server-side rendering, insert the special virtual element "ssr" in your HTML document to indicate where server-side rendering should occur.

```html
<!-- ko ssr: ./viewmodel.js -->
<p data-bind="text: message"></p>
<!-- /ko -->
```

In this virtual element, all compatible bindings are rendered. Additionally, all "ssr" virtual elements are removed. The above snippet, for instance, would be server-rendered to:

```html
<p data-bind="text: message">Hello world!</p>
```

### Supported Bindings

> [!IMPORTANT]  
> This is still a proof of concept. More bindings will be implemented later. Flow control bindings (if, foreach, etc.) are planned to be implemented later.

`knockout-ssr` supports the following standard knockout bindings:

- [`visible`](https://knockoutjs.com/documentation/visible-binding.html)
- [`hidden`](https://knockoutjs.com/documentation/visible-binding.html)
- [`text`](https://knockoutjs.com/documentation/text-binding.html)
- [`html`](https://knockoutjs.com/documentation/html-binding.html)
- [`class`](https://knockoutjs.com/documentation/css-binding.html)
- [`css`](https://knockoutjs.com/documentation/css-binding.html)
- [`style`](https://knockoutjs.com/documentation/style-binding.html)
- [`attr`](https://knockoutjs.com/documentation/attr-binding.html)

## Installation

The library runs in [Node.JS](https://nodejs.org/) which is required to be installed prior.

The library is shipped as a package on [npm](https://www.npmjs.com/package/knockout-ssr). You can add the library as a dev-dependency by running the below command.

```sh
npm install --save-dev knockout-ssr
```

## Usage

### Integration

`knockout-ssr` is pre-equipped with integrations for various build tools. All integrations are located under `knockout-ssr/<build-tool-name>`, e.g. `knockout-ssr/vite`. For other build tools or custom build processes, use either the [CLI](#cli) or [API](#api).

<ul>
<li>
<details>
<summary>Vite</summary>
 
```js
import knockoutSSR from 'knockout-ssr/vite';

export default defineConfig({
...
plugins: [knockoutSSR()],
});

````

</details>
</li>
<li>
<details>
<summary>Rollup</summary>

```js
import knockoutSSR from 'knockout-ssr/rollup'

export default defineConfig({
  ...
  plugins: [knockoutSSR()]
})
````

</details>
</li>
<li>
<details>
<summary>Webpack</summary>

```js
module.exports = {
  ...
  module: {
    rules: [
      {
        test: /\.html$/,
        use: ['knockout-ssr/webpack'],
      },
    ],
  },
};
```

</details>
</li>
</ul>

_Click on any item in the list above to reveal configuration._

### CLI

The library comes with a command-line interface which can be used to render individual documents. The cli does not yet support rendering multiple documents in one go.

```sh
npx knockout-ssr --input view.html --outdir build
```

Run `knockout-ssr --help` to see all available flags.

### API

The API is written in node.js-flavoured javascript. The main module exports the function `render` which takes an input document and renders bindings into it.

```js
import { render } from 'knockout-ssr';

const document = `
  <!-- ko ssr: ./viewmodel.js -->
    <p data-bind="text: message"></p>
  <!-- /ko -->
`;

const generated = await render(document, {
  plugins: [...]
});

generated.document
// <p data-bind="text: message">Hello world!</p>
```

## Plugins

Plugins can be added to implement server-side rendering for custom bindings.

### Using plugins

Add plugins by passing the path to the plugin module to the `--plugin` flag to the cli.

```sh
npx knockout-ssr --plugin ./i18n-plugin.js ...
```

Alternativly, by passing the plugin to the `render` method's options.

```js
import { i18n } from "./i18n-plugin.js";

render(document, {
  plugin: [i18n],
});
```

### Writing plugins

Plugins are written as modules, which can either be imported, or passed to the `--plugin` flag in the CLI. The module should export a `Plugin` object as the default export.

For example, you can integrate your i18n framework by creating a plugin similar to the below.

```ts
import { Plugin, utils } from "knockout-ssr";

const i18n: Plugin = {
  // Look for bindings with name "i18n". Once the plugin claims the bindings,
  // no other plugins will touch it.
  filter: (binding) => binding.name === "i18n",

  // This method is called when server-side rendering.
  ssr: (binding, generated) => {
    // `binding.value` contains the evaluated value of the binding (the actual
    // value, not the string).
    const translated = i18next.t(binding.value);

    // Get the inner range (children) of the element of the binding.
    const inner = utils.getInnerRange(binding.parent, generated.original);
    // Replace the inner range with the translated text.
    generated.update(...inner.offset, utils.escapeHtml(translated));
  },
};

export default i18n;
```

## License

This project is licenced under the [MIT](https://choosealicense.com/licenses/mit/) license.

## Versioning

The project's versioning adhears to [semver](https://semver.org/spec/v2.0.0.html).
