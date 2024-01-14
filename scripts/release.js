import { execa } from "execa";

const bump = process.argv[2];

await execa("npm", ["version", bump], { stdio: "inherit" });
await execa("npm", ["run", "build"], { stdio: "inherit" });
await execa("npm", ["run", "test"], { stdio: "inherit" });
await execa("npm", ["publish"], { stdio: "inherit", cwd: "dist" });
