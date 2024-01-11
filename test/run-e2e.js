import { execa } from "execa";
import getPort from "get-port";

const port = await getPort();

execa("npx", ["vite", "test/e2e/www", "--port", String(port)], {
  stdio: ["ignore", "ignore", "pipe"],
}).pipeStderr(process.stderr);

const result = await execa(
  "npx",
  ["playwright", "test", "-c", "test/e2e/playwright.config.ts"],
  {
    stdio: ["ignore", "inherit", "inherit"],
    env: {
      PORT: String(port),
    },
    reject: false,
  },
);

process.exit(result.exitCode);
