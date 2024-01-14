/**
 * Find the viewmodel from the exports of a module, and initializes it.
 */
export function interopModule(exports: any) {
  if (exports.default) {
    exports = exports.default;
  }

  if (typeof exports === "function") {
    exports = new exports();
  }

  return exports;
}
