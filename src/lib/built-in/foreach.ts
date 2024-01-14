import { Plugin } from "../plugin.js";
import * as utils from "../utils.js";

function extract(value: any) {
  if (Array.isArray(value)) {
    return {
      items: value,
      alias: undefined,
    };
  } else if (typeof value === "object") {
    return {
      items: utils.unwrap(value.data),
      alias: utils.unwrap(value.as),
    };
  } else {
    return {
      items: [],
      alias: undefined,
    };
  }
}

const foreach: Plugin = {
  filter: (binding) => binding.name === "foreach",
  ssr({ binding, generated, value, propagate, renderFragment, context }) {
    if (propagate === false) {
      return;
    }

    const { items, alias } = extract(value());

    const inner = utils.getInnerRange(binding.parent, generated.original);
    const original = generated.slice(...inner.offset);

    // Render all fragments
    const fragments = Array.from(Array.from(items).entries()).map(
      ([index, data]) => {
        return renderFragment(
          context.createChildContext(data, alias, (self) => {
            self.$index = index;
          }),
        );
      },
    );
    generated.overwrite(...inner.offset, fragments.join(""));

    // Append template above element
    const id = utils.randomId();
    generated.appendLeft(
      binding.parent.range.start.offset,
      `<template id="${id}">${original}</template>`,
    );

    // Replace binding with "_ssr_foreach"
    generated.overwrite(
      ...binding.range.offset,
      `_ssr_foreach: { template: "${id}", value: ${binding.expression} }`,
    );
  },
  propagate: "custom",
};

export default foreach;
