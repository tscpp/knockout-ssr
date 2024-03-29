import assert from "node:assert/strict";
import test, { describe } from "node:test";
import webpack from "webpack";
import { createFsFromVolume, Volume } from "memfs";

describe("webpack (build-tool)", () => {
  test("webpack", (t, done) => {
    const compiler = webpack({
      mode: "production",
      entry: "./test/unit/assets/entry.js",
      output: {
        path: "/",
        filename: "output.js",
      },
      module: {
        rules: [
          {
            test: /\.html$/,
            // Apparently, the first loader in the array is the last one to run.
            // ¯\_(ツ)_/¯
            use: ["raw-loader", "./src/webpack/loader.ts"],
          },
        ],
      },
    });

    const fs = createFsFromVolume(new Volume());
    compiler.outputFileSystem = fs;

    compiler.run((err, stats) => {
      if (err) {
        return done(err);
      }

      const close = (err?: unknown) => {
        compiler.close((closeErr) => {
          if (err) {
            return done(err);
          }

          if (closeErr) {
            return done(closeErr);
          }

          done();
        });
      };

      if (stats.hasErrors() || stats.hasWarnings()) {
        console.error(stats.toString());
        return close(
          new Error(
            `webpack compilation has ${
              stats.hasErrors() ? "errors" : "warnings"
            }`,
          ),
        );
      }

      const output = fs.readFileSync("/output.js", "utf8");
      assert(
        output.includes("SSR"),
        "generated chunk is missing rendered text",
      );

      return close();
    });
  });
});
