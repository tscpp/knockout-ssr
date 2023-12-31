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

## Installation

The library is shipped as a package on [npm](https://www.npmjs.com/). You can add the library as a dev-dependency by running the below command.

```
npm install --save-dev knockout-ssr
```

## Usage

### SSR Virtual Element

To use server-side rendering, insert the special virtual element "ssr" in your HTML document to indicate where server-side rendering should occur.

```html
<!-- ko ssr: ./viewmodel.js -->
<p data-bind="text: message"></p>
<!-- /ko -->
```

In this virtual element, all compatible bindings are rendered. The above snippet, for instance, would be server-rendered to:

```html
<p data-bind="text: message">Hello world!</p>
```

### Using the CLI

The package comes shipped with a cli that renderes the passed file.

```sh
npx knockout-ssr --input view.html
```

Run `knockout-ssr --help` to print all available CLI flags.
