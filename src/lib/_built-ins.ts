import { Plugin } from "./plugin.js";

import attr from "./built-in/attr.js";
import checked from "./built-in/checked.js";
import class_ from "./built-in/class.js";
import component from "./built-in/component.js";
import css from "./built-in/css.js";
import { disabled, enabled } from "./built-in/disabled.js";
import html from "./built-in/html.js";
import { if_, ifnot } from "./built-in/if.js";
import let_ from "./built-in/let.js";
import noSsr from "./built-in/no-ssr.js";
import style from "./built-in/style.js";
import textInput from "./built-in/text-input.js";
import text from "./built-in/text.js";
import using from "./built-in/using.js";
import { visible, hidden } from "./built-in/visible.js";
import with_ from "./built-in/with.js";
import value from "./built-in/value.js";

const builtins: Plugin[] = [
  attr,
  checked,
  class_,
  component,
  css,
  enabled,
  disabled,
  html,
  if_,
  ifnot,
  let_,
  noSsr,
  style,
  textInput,
  text,
  using,
  value,
  visible,
  hidden,
  with_,
];

export default builtins;
