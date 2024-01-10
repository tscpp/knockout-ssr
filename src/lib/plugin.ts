import MagicString from "magic-string";
import { Element } from "./parser.js";
import { Binding } from "./ssr.js";
import * as utils from "./utils.js";

export interface Plugin {
  filter: (binding: Binding) => boolean;
  ssr?:
    | ((binding: Binding, generated: MagicString) => void | PromiseLike<void>)
    | undefined;
}

export const builtins: Plugin[] = [
  {
    filter: (binding) => binding.name === "text",
    ssr(binding, generated) {
      const asHtml = utils.escapeHtml(String(binding.value));
      const innerRange = utils.getInnerRange(binding.parent, generated.original);

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
      const innerRange = utils.getInnerRange(binding.parent, generated.original);

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
    filter: (binding) => binding.name === "style" && !!binding.value && binding.parent instanceof Element,
    ssr(binding, generated) {
      const element = binding.parent as Element;

      for (const [key, value] of Object.entries(binding.value as object)) {
        utils.setStyle(generated, element, key, value);
      }
    },
  },
  {
    filter: (binding) => binding.name === "attr" && !!binding.value && binding.parent instanceof Element,
    ssr(binding, generated) {
      const element = binding.parent as Element;

      for (const [key, value] of Object.entries(binding.value as object)) {
        utils.setAttribute(generated, element, key, value);
      }
    },
  }
];
