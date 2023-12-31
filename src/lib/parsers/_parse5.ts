import { DefaultTreeAdapterMap } from "parse5";

export type Node = DefaultTreeAdapterMap["node"];
export type ParentNode = DefaultTreeAdapterMap["parentNode"];
export type ChildNode = DefaultTreeAdapterMap["childNode"];
export type Element = DefaultTreeAdapterMap["element"];
export type Attribute = Element["attrs"][number];
export type TextNode = DefaultTreeAdapterMap["textNode"];
export type CommentNode = DefaultTreeAdapterMap["commentNode"];
export type Document = DefaultTreeAdapterMap["document"];
export type DocumentFragment = DefaultTreeAdapterMap["documentFragment"];
export type DocumentType = DefaultTreeAdapterMap["documentType"];
export type Template = DefaultTreeAdapterMap["template"];

export function isNode(node: unknown): node is Node {
  return typeof node === "object" && node !== null && "nodeName" in node;
}

export function isParentNode(node: unknown): node is ParentNode {
  return isNode(node) && "childNodes" in node;
}

export function isChildNode(node: unknown): node is ChildNode {
  return isNode(node) && "parentNode" in node;
}

export function isElement(node: unknown): node is Element {
  return isNode(node) && "tagName" in node;
}

export function isTextNode(node: unknown): node is TextNode {
  return isNode(node) && node.nodeName === "#text";
}

export function isCommentNode(node: unknown): node is CommentNode {
  return isNode(node) && node.nodeName === "#comment";
}

export function isDocument(node: unknown): node is Document {
  return isNode(node) && node.nodeName === "#document";
}

export function isDocumentFragment(node: unknown): node is DocumentFragment {
  return isNode(node) && node.nodeName === "#document-fragment";
}

export function isDocumentType(node: unknown): node is DocumentType {
  return isNode(node) && node.nodeName === "#documentType";
}

export function isTemplate(node: unknown): node is Template {
  return isNode(node) && node.nodeName === "template";
}

export * from "parse5";
