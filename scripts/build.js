import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "tsup";
import { $ } from "execa";

await clean();

await Promise.all([
  copyFile("LICENSE", "dist/LICENSE"),
  copyFile("README.md", "dist/README.md"),
  generatePackage(),
  generatePackageLock(),
  runBuild(),
]);

async function clean() {
  await rm("dist", { recursive: true, force: true });
  await mkdir("dist/bin", { recursive: true });
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
  await writeFile("dist/package.json", JSON.stringify(pkg, null, 2));
}

async function generatePackageLock() {
  await copyFile("package-lock.json", "dist/package-lock.json");
  await $({ cwd: "dist" })`npm install --package-lock-only`;
}

async function runBuild() {
  await build({
    entryPoints: {
      index: "src/lib/exports.ts",
      "bin/knockout-ssr": "src/cli/main.ts",
    },
    outDir: "dist",
    format: "esm",
    dts: true,
    esbuildOptions: (options) => {
      options.chunkNames = "build/[hash]";
    },
  });
}
