import * as ko from "knockout";

const serverKey = "_ssr_foreach";
const hydrateKey = "foreach";

export type SsrForeachParams = {
  template: string;
  value: unknown;
};

export const ssrForeachBindingHandler: ko.BindingHandler<SsrForeachParams> = {
  ...ko.bindingHandlers[hydrateKey],
  init(
    element: HTMLElement,
    valueAccessor,
    allBindings,
    viewModel,
    bindingContext,
  ) {
    const { template: id } = valueAccessor();

    const ownerDocument = element.ownerDocument ?? document.documentElement;
    const template = ownerDocument.getElementById(id);

    if (!template || !(template instanceof HTMLTemplateElement)) {
      throw new Error(
        `Cannot find server-side rendered template with id "${id}"`,
      );
    }

    element.replaceChildren(template.content.cloneNode(true));
    template.remove();

    return ko.bindingHandlers[hydrateKey].init(
      element,
      () => valueAccessor().value,
      allBindings,
      viewModel,
      bindingContext,
    );
  },
};

ko.bindingHandlers[serverKey] = ssrForeachBindingHandler;
(ko.expressionRewriting.bindingRewriteValidators as any)[serverKey] = false;
ko.virtualElements.allowedBindings[serverKey] = true;
