import { execa } from "execa";
import { readFile, writeFile } from "node:fs/promises";

await execa("npm", ["run", "build"], { stdio: "inherit" });
await execa("npm", ["run", "test"], { stdio: "inherit" });
await execa("npx", ["np", "--no-tests"], { stdio: "inherit", cwd: "dist" });

// Update package.json version
await writeFile(
  "package.json",
  JSON.stringify({
    ...JSON.parse(await readFile("package.json", "utf-8")),
    version: JSON.parse(readFile("dist/package.json", "utf-8")).version,
  }),
);
