import MagicString from "magic-string";
import { Element } from "./parser.js";
import { Binding, BindingContext } from "./ssr.js";
import * as utils from "./utils.js";

export interface Plugin {
  filter: (binding: Binding) => boolean;
  ssr?:
    | ((
        binding: Binding,
        generated: MagicString,
        context: BindingContext,
      ) => void | PromiseLike<void>)
    | undefined;
  alter?: (
    context: BindingContext,
    binding: Binding,
    stop: () => void,
  ) => void | BindingContext | PromiseLike<void> | PromiseLike<BindingContext>;
}

export const builtins: Plugin[] = [
  {
    filter: (binding) => binding.name === "text",
    ssr(binding, generated) {
      const asHtml = utils.escapeHtml(String(binding.value));
      const innerRange = utils.getInnerRange(
        binding.parent,
        generated.original,
      );

      if (innerRange.isEmpty) {
        generated.appendLeft(innerRange.start.offset, asHtml);
      } else {
        generated.update(
          innerRange.start.offset,
          innerRange.end.offset,
          asHtml,
        );
      }
    },
  },
  {
    filter: (binding) => binding.name === "html",
    ssr(binding, generated) {
      const asHtml = String(binding.value);
      const innerRange = utils.getInnerRange(
        binding.parent,
        generated.original,
      );

      if (innerRange.isEmpty) {
        generated.appendLeft(innerRange.start.offset, asHtml);
      } else {
        generated.update(
          innerRange.start.offset,
          innerRange.end.offset,
          asHtml,
        );
      }
    },
  },
  {
    filter: (binding) =>
      binding.name === "visible" && binding.parent instanceof Element,
    ssr(binding, generated) {
      utils.setStyle(
        generated,
        binding.parent as Element,
        "display",
        binding.value ? null : "none",
      );
    },
  },
  {
    filter: (binding) =>
      binding.name === "hidden" && binding.parent instanceof Element,
    ssr(binding, generated) {
      utils.setStyle(
        generated,
        binding.parent as Element,
        "display",
        binding.value ? "none" : null,
      );
    },
  },
  {
    filter: (binding) =>
      binding.name === "class" &&
      !!binding.value &&
      binding.parent instanceof Element,
    ssr(binding, generated) {
      const element = binding.parent as Element;
      utils.addClass(generated, element, String(binding.value));
    },
  },
  {
    filter: (binding) =>
      binding.name === "css" &&
      !!binding.value &&
      typeof binding.value === "object" &&
      binding.parent instanceof Element,
    ssr(binding, generated) {
      const element = binding.parent as Element;

      for (const [key, value] of Object.entries(binding.value as object)) {
        if (value) {
          utils.addClass(generated, element, key);
        } else {
          utils.removeClass(generated, element, key);
        }
      }
    },
  },
  {
    filter: (binding) =>
      binding.name === "style" &&
      !!binding.value &&
      binding.parent instanceof Element,
    ssr(binding, generated) {
      const element = binding.parent as Element;

      for (const [key, value] of Object.entries(binding.value as object)) {
        utils.setStyle(generated, element, key, value);
      }
    },
  },
  {
    filter: (binding) =>
      binding.name === "attr" &&
      !!binding.value &&
      binding.parent instanceof Element,
    ssr(binding, generated) {
      const element = binding.parent as Element;

      for (const [key, value] of Object.entries(binding.value as object)) {
        utils.setAttribute(generated, element, key, value);
      }
    },
  },
  createIfPlugin((binding) => binding.name === "if", true),
  createIfPlugin((binding) => binding.name === "ifnot", false),
];

function createIfPlugin(filter: Plugin["filter"], truthy: boolean): Plugin {
  return {
    filter,
    ssr(binding, generated) {
      const inner = utils.getInnerRange(binding.parent, generated.original);
      const innerHtml = generated.original.slice(
        inner.start.offset,
        inner.end.offset,
      );
      const id = utils.randomId(innerHtml.replace(/\s+/g, " "));
      const show = Boolean(truthy ? binding.value : !binding.value);
      const q = binding.quote;

      // Remove contents if not shown
      if (!show) {
        generated.remove(inner.start.offset, inner.end.offset);
      }

      // Append template above element
      generated.appendLeft(
        binding.parent.range.start.offset,
        `<template id="${id}">${innerHtml}</template>`,
      );

      // Replace binding with "ssr-if"
      generated.overwrite(
        ...binding.range.offset,
        `ssr-if: { template: ${q}${id}${q}, show: ${binding.expression} }`,
      );
    },
  };
}
