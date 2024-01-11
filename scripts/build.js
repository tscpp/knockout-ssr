import {
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile,
  rename,
} from "node:fs/promises";
import { build } from "tsup";
import { $ } from "execa";
import { globby } from "globby";
import { basename, dirname, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { parse } from "es-module-lexer";
import MagicString from "magic-string";
import slash from "slash";

await clean();

await Promise.all([
  Promise.all([
    copyFile("LICENSE", "dist/LICENSE"),
    copyFile("README.md", "dist/README.md"),
  ]).then(() => {
    console.log("Successfully copied static files.");
  }),
  generatePackage(),
  generatePackageLock(),
  Promise.all([runNodeBuild(), runBrowserBuild()]).then(() =>
    moveDeclarationsToBuild(),
  ),
]);

async function clean() {
  await rm("dist", { recursive: true, force: true });
  await mkdir("dist/bin", { recursive: true });
  console.log("Removed contents of dist/ directory.");
}

async function generatePackage() {
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  pkg.devDependencies = Object.fromEntries(
    Object.entries(pkg.devDependencies).filter(([key]) =>
      pkg.publishConfig.includeDependencies.includes(key),
    ),
  );
  delete pkg.scripts;
  delete pkg.private;
  delete pkg.publishConfig;
  delete pkg.np;
  delete pkg.overrides;
  await writeFile("dist/package.json", JSON.stringify(pkg, null, 2));
  console.log("Successfully generated package.json!");
}

async function generatePackageLock() {
  await copyFile("package-lock.json", "dist/package-lock.json");
  await $({ cwd: "dist" })`npm install --package-lock-only`;
  console.log("Successfully generated package-lock.json!");
}

async function runNodeBuild() {
  await build({
    entry: {
      index: "src/lib/exports.ts",
      "bin/knockout-ssr": "src/cli/main.ts",
      "rollup/index": "src/rollup/plugin.ts",
      "vite/index": "src/vite/plugin.ts",
      "webpack/index": "src/webpack/loader.ts",
    },
    tsconfig: "tsconfig.node.json",
    platform: "node",
    outDir: "dist",
    format: "esm",
    dts: true,
    external: [
      // not used
      "lightningcss",
    ],
    skipNodeModulesBundle: true,
    esbuildOptions: (options) => {
      options.chunkNames = "build/[name]-[hash]";
    },
  });

  console.log("Successfully built backend entries!");
}

async function runBrowserBuild() {
  await build({
    entry: {
      "runtime/index": "src/runtime/index.ts",
    },
    tsconfig: "tsconfig.browser.json",
    platform: "browser",
    outDir: "dist",
    format: "esm",
    skipNodeModulesBundle: true,
    esbuildOptions: (options) => {
      options.chunkNames = "build/[name]-[hash]";
    },
  });

  await rm("dist/bin/knockout-ssr.d.ts", { force: true });

  console.log("Successfully built browser runtime entries!");
}

async function moveDeclarationsToBuild() {
  const oldPaths = (
    await globby("dist/**/*.d.ts", {
      ignore: ["**/node_modules/**"],
      absolute: true,
    })
  ).filter((p) => /-[a-z0-9-_]{8,8}\.d\.ts$/i.test(p));

  const newPaths = await Promise.all(
    oldPaths.map(async (file) => {
      const hash = createHash("sha256")
        .update(basename(file))
        .digest("base64url")
        .slice(0, 8)
        .toUpperCase()
        .replace(/[-_]/, "Z");
      const name = `types-${hash}.d.ts`;
      const newPath = resolve("dist/build", name);
      await rename(file, newPath);
      return newPath;
    }),
  );

  const files = await globby("dist/**/*.d.ts", {
    ignore: ["**/node_modules/**"],
    absolute: true,
  });

  await Promise.all(
    files.map(async (file) => {
      const content = await readFile(file, "utf-8");
      const [imports] = parse(content);
      const magicString = new MagicString(content);
      for (const { n, s, e } of imports) {
        const i = oldPaths.findIndex((p) =>
          n.includes(basename(p).replace(".d.ts", "")),
        );
        if (i !== -1) {
          const newPath = newPaths[i];
          const rel = relative(dirname(file), newPath);
          const importPath = "./" + slash(rel.replace(".d.ts", ".js"));
          magicString.overwrite(s, e, importPath);
        }
      }
      await writeFile(file, magicString.toString());
    }),
  );

  console.log('Successfully moved declarations to "dist/build":');
  console.log(
    newPaths.map((p) => `  ${slash(relative("dist", p))}`).join("\n"),
  );
}
