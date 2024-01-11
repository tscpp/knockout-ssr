import { execa } from "execa";
import { supportsColor } from "chalk";

const unit = execa("node", ["test/run-unit.js"], {
  stdio: "inherit",
  reject: false,
});

const e2e = execa("node", ["test/run-e2e.js"], {
  stdio: "pipe",
  env: {
    ...(supportsColor && { FORCE_COLOR: 1 }),
    ...process.env,
  },
  reject: false,
});

const unitResult = await unit;
e2e.pipeStdout(process.stdout).pipeStderr(process.stderr);

const e2eResult = await e2e;
if (!(unitResult.exitCode === 0 && e2eResult.exitCode === 0)) {
  process.exit(1);
}
