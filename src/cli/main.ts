#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as prettier from "prettier";
import { render } from "../lib/exports.js";
import yargs from "yargs";
import { basename, dirname, resolve } from "node:path";
import { resolve as importMetaResolve } from "import-meta-resolve";
import { pathToFileURL } from "node:url";

const options = await yargs(process.argv.slice(2))
  .strict()
  .usage("Usage: $0 [options]")

  .option("input", {
    alias: "i",
    type: "string",
    description: "Path to the input document",
    demandOption: true,
  })

  .option("outdir", {
    alias: "o",
    type: "string",
    description: "Output directory",
    default: ".",
  })
  .option("pretty", {
    type: "boolean",
    description: "Format output with prettier",
    default: true,
  })

  .option("plugin", {
    type: "array",
    description: "Relative path to a plugin module to load",
    default: [] as string[],
  })
  .option("attribute", {
    type: "array",
    description: "Attributes to scan for bindings",
    default: ["data-bind"],
  })
  .option("no-builtins", {
    type: "boolean",
    description: "Disable built-in plugins",
    default: false,
  })
  .parse();

const document = await readFile(options.input, "utf-8");
const useBuiltins = !options["no-builtins"];
const plugins = options.plugin
  .filter((path) => String(path))
  .map((path) => String(path))
  .map(
    (path) =>
      import(importMetaResolve(path, pathToFileURL(process.cwd()).toString())),
  )
  .map((exports) => ("default" in exports ? exports.default : exports))
  .map((exports) => (typeof exports === "function" ? exports() : exports));
const attributes = options.attribute
  .filter((path) => String(path))
  .map((attr) => String(attr));
const filename = basename(options.input);
const path = resolve(options.input);

let { document: generated } = await render(document, {
  plugins,
  useBuiltins,
  attributes,
  filename: path,
});

if (options.pretty) {
  generated = await prettier.format(generated, {
    parser: "html",
  });
}

const outdir = options.outdir ?? dirname(options.input);
await mkdir(outdir, { recursive: true });
await writeFile(resolve(outdir, filename), generated);
