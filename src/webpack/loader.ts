import { validate } from "schema-utils";
import { urlToRequest } from "loader-utils";
import type { Schema } from "schema-utils/declarations/validate.js";
import type { LoaderDefinitionFunction } from "webpack";
import { render } from "../lib/exports.js";
import { SSROptions } from "../lib/ssr.js";

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

  const filename = urlToRequest(this.resourcePath);

  const renderOptions: SSROptions = {
    ...options,
    filename,
    resolve: (specifier) => {
      return new Promise((resolve, reject) => {
        this.resolve(this.context, specifier, (err, result) => {
          if (err) {
            reject(err);
          } else if (!result) {
            reject(new Error(`Webpack could not resolve ${specifier}`));
          } else {
            resolve(result);
          }
        });
      });
    },
  };

  render(source, renderOptions)
    .then(({ document }) => callback(null, document))
    .catch(callback);
};

export default loader;
