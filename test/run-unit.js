import { globby } from "globby";
import { execa } from "execa";

const files = await globby("test/unit/**/*.test.*");

if (files.length === 0) {
  console.log("No test files found!");
  process.exit(0);
}

const result = await execa(
  "node",
  ["--loader", "ts-node/esm", "--test", ...files],
  {
    stdio: "inherit",
    env: {
      NODE_OPTIONS: "--no-warnings",
      TS_NODE_PROJECT: "test/tsconfig.json",
    },
    reject: false,
  },
);

process.exit(result.exitCode);
