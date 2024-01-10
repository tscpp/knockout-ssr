import { spawn } from "node:child_process";
import { globby } from "globby";

const files = await globby("test/**/*.test.js");

const sp = spawn("node", ["--test", ...files], {
  stdio: "inherit",
});

sp.on("exit", (code) => {
  process.exit(code ?? 0);
});
