import * as ko from "knockout";

export type SsrIfParams = {
  template: string;
  show: unknown;
};

export const ssrIfBindingHandler: ko.BindingHandler<SsrIfParams> = {
  ...ko.bindingHandlers,
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

    return ko.bindingHandlers.if.init(
      element,
      () => valueAccessor().show,
      allBindings,
      viewModel,
      bindingContext,
    );
  },
};

const bindingKey = "ssr-if";

ko.bindingHandlers[bindingKey] = ssrIfBindingHandler;
(ko.expressionRewriting.bindingRewriteValidators as any)[bindingKey] = false;
ko.virtualElements.allowedBindings[bindingKey] = true;
