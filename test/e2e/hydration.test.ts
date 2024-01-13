import { test, expect } from "@playwright/test";
import { url } from "./vars.js";
import chalk from "chalk";

test.beforeEach(async ({ page }) => {
  page.on("console", (msg) => {
    const text = msg.text();

    switch (msg.type()) {
      case "error":
        console.error(chalk.red(text));
        break;
      case "warning":
        console.warn(chalk.yellow(text));
        break;
      case "debug":
        break;
      default:
        console.log(chalk.dim(text));
        break;
    }
  });

  page.on("pageerror", (err) => {
    console.error(chalk.red(err));
  });
});

test("text hydration", async ({ page }) => {
  await page.goto(`${url}/text-binding`);
  const html = await page.innerHTML("body");
  expect(html).toContain(">John Doe<");
});

test("if visible hydration", async ({ page }) => {
  await page.goto(`${url}/if-visible`);
  const html = await page.innerHTML("body");
  expect(html).toContain(">Rendered</div>");
});

test("if hidden hydration", async ({ page }) => {
  await page.goto(`${url}/if-hidden`);
  const html = await page.innerHTML("body");
  expect(html).toContain("></div>");
});


test("with hidden hydration", async ({ page }) => {
  await page.goto(`${url}/with-hidden`);
  const html = await page.innerHTML("body");
  expect(html).toContain("></div>");
});
