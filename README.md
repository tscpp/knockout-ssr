# Knockout SSR

<div align="center">

### [Documentation ›](https://github.com/tscpp/knockout-ssr/wiki)

</div>

## Introduction

`knockout-ssr` is a tool designed to enhance Knockout v3 applications by enabling server-side rendering (SSR) and Static Site Generation (SSG). It integrates easily into any build process and allows for gradual implementation without requiring a complete overhaul of your existing application.

### Why?

While Knockout remains a simple yet powerful tool, it lags behind modern frameworks in certain features, particularly SSR. `knockout-ssr` bridges this gap, offering a straightforward solution to enhance your Knockout applications. This library significantly boosts SEO and allows for asynchronous hydration, which significantly improves load speeds.

## How does it work?

The library parses HTML documents to identify Knockout-specific binding attributes and virtual elements. It then server-renders these bindings by executing the binding values as JavaScript, utilizing the corresponding viewmodel.

Leveraging Knockout's MVVM pattern, which relies on underlying data models, `knockout-ssr` allows for the creation of isomorphic viewmodels operative on both server and client sides, or distinct server-side viewmodels. Client-side, you can use `applyBindings` as usual for correct view hydration. For enhanced performance, consider asynchronously executing `applyBindings` to reduce JavaScript blocking and improve page load times.

## License

This project is licenced under the [MIT](https://choosealicense.com/licenses/mit/) license.

## Versioning

The project's versioning adhears to [semver](https://semver.org/spec/v2.0.0.html).
