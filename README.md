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

Here you can see a list of implemented (supported) and planned bindings.

| Name                                | Status                       |
| ----------------------------------- | ---------------------------- |
| `attr`                              | ✅ Completed                 |
| `checked`                           | ✅ Completed                 |
| `class`                             | ✅ Completed                 |
| `click`                             | ❌ Not supported<sup>1</sup> |
| `component`                         | ❓ Subsequent<sup>2</sup>    |
| `css`                               | ✅ Completed                 |
| `enable`/`disable`                  | ✅ Completed                 |
| `event`                             | ❌ Not supported<sup>1</sup> |
| `foreach`                           | 🚧 Planned                   |
| `hasFocus`                          | ❌ Not supported             |
| `html`                              | ✅ Completed                 |
| `if`/`ifnot`                        | ✅ Completed                 |
| `let`                               | ✅ Completed                 |
| `options`                           | 🚧 Planned                   |
| `style`                             | ✅ Completed                 |
| `submit`                            | ❌ Not supported<sup>1</sup> |
| `template`                          | ❓ Subsequent<sup>3</sup>    |
| `text`                              | ✅ Completed                 |
| `textInput`                         | ✅ Completed                 |
| `uniqueName`                        | ❌ Not supported<sup>4</sup> |
| `value`                             | ✅ Completed                 |
| `visible`/`hidden`                  | ✅ Completed                 |
| `with`/`using`                      | ✅ Completed                 |
| Handlebars `{{...}}` (non-standard) | 🚧 Planned<sup>5</sup>       |

<em>

1. Events are not planned to be supported. Server-side rendering events are possible in some cases, however it does not improve SEO or user experience and is hard to integrate with Knockout.
2. Components are hard to server-side render as it would require the renderer to know the markup of each component, and much additional work. Not planned to be implemented as of now.
3. The "template" binding is planned to be partially implemented where it can render templates in the same file. Referencing other templates is not planned as of now.
4. The "unqiueName" binding modifies the view model, which is not possible in ssr.
5. May take some time to implement.

</em>

## Installation

The library runs in [Node.JS](https://nodejs.org/) which is required to be installed prior.

The library is shipped as a package on [npm](https://www.npmjs.com/package/knockout-ssr). You can add the library as a dev-dependency by running the below command.

```sh
npm install --save-dev knockout-ssr
```

## Usage

### Integration

`knockout-ssr` is pre-equipped with integrations for various build tools. See below for the complete list of supported build tools. For other tools or custom build processes, use either the [CLI](#cli) or [API](#api).

- [Rollup](https://rollupjs.org/) - `knockout-ssr/rollup`
- [Vite](https://vitejs.dev/) - `knockout-ssr/vite`
- [Webpack](https://webpack.js.org/) - `knockout-ssr/`

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
  plugins: [...],
  filename: '...',
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

The `alter` method can be used to modify the binding contexted used server-side.

```ts
const themePlugin: Plugin = {
  filter: (binding) => binding.name === "theme",
  alter: (context, binding) => {
    context.$data.theme = binding.value;
  },
};
```

Additionally, the `alter` method can stop propagation and prevent children from being server-side rendered.

```ts
const noSsrPlugin: Plugin = {
  filter: (binding) => binding.name === "noSsr",
  alter: (_context, _binding, stop) => {
    stop();
  },
};
```

## License

This project is licenced under the [MIT](https://choosealicense.com/licenses/mit/) license.

## Versioning

The project's versioning adhears to [semver](https://semver.org/spec/v2.0.0.html).
