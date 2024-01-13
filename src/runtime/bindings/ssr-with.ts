import * as ko from "knockout";

export type SsrWithParams = {
  template: string;
  value: unknown;
};

export const ssrWithBindingHandler: ko.BindingHandler<SsrWithParams> = {
  ...ko.bindingHandlers,
  init(
    element: HTMLElement,
    valueAccessor,
    allBindings,
    viewModel,
    bindingContext,
  ) {
    const { template: id } = valueAccessor();

    if (id) {
      const ownerDocument = element.ownerDocument ?? document.documentElement;
      const template = ownerDocument.getElementById(id);

      if (!template || !(template instanceof HTMLTemplateElement)) {
        throw new Error(
          `Cannot find server-side rendered template with id "${id}"`,
        );
      }

      element.replaceChildren(template.content.cloneNode(true));
      template.remove();
    }

    return ko.bindingHandlers.with.init(
      element,
      () => valueAccessor().value,
      allBindings,
      viewModel,
      bindingContext,
    );
  },
};

const bindingKey = "_ssr_with";

ko.bindingHandlers[bindingKey] = ssrWithBindingHandler;
(ko.expressionRewriting.bindingRewriteValidators as any)[bindingKey] = false;
ko.virtualElements.allowedBindings[bindingKey] = true;
