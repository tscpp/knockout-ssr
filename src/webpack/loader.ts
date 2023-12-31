import { validate } from "schema-utils";
import type { Schema } from "schema-utils/declarations/validate.js";
import type { LoaderDefinitionFunction } from "webpack";
import { render } from "../lib/exports.js";

const schema: Schema = {
  type: "object",
  properties: {
    plugins: {
      type: "array",
    },
    useBuiltins: {
      type: "boolean",
    },
    attributes: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
};

const loader: LoaderDefinitionFunction = function (source) {
  const callback = this.async();
  const options = this.getOptions();

  try {
    validate(schema, options, {
      name: "Example Loader",
      baseDataPath: "options",
    });
  } catch (error) {
    callback(error instanceof Error ? error : new Error(String(error)));
    return;
  }

  render(source, options)
    .then(({ document }) => callback(null, document))
    .catch(callback);
};

export default loader;
