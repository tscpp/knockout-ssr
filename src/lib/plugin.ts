import MagicString from "magic-string";
import { Element } from "./parsers/html.js";
import { Binding } from "./ssr.js";
import {
  addClass,
  escapeHtml,
  getInnerRange,
  removeClass,
  toggleVisibillity,
} from "./utils.js";

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
      const asHtml = escapeHtml(String(binding.value));
      const innerRange = getInnerRange(binding.parent, generated.original);

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
      const innerRange = getInnerRange(binding.parent, generated.original);

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
      toggleVisibillity(
        generated,
        binding.parent as Element,
        Boolean(binding.value),
      );
    },
  },
  {
    filter: (binding) =>
      binding.name === "hidden" && binding.parent instanceof Element,
    ssr(binding, generated) {
      toggleVisibillity(
        generated,
        binding.parent as Element,
        !Boolean(binding.value),
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
      addClass(generated, element, String(binding.value));
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
          addClass(generated, element, key);
        } else {
          removeClass(generated, element, key);
        }
      }
    },
  },
];
