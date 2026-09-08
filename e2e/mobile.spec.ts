import { expect, test } from "@playwright/test";

test("mobile visitor can open a transparent sample report", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /See the move/ })).toBeVisible();
  await expect(page.getByText("Your video stays on your device")).toBeAttached();
  await page.getByRole("button", { name: /Explore sample report/ }).click();
  await expect(page.getByRole("heading", { name: "Your swing is ready to review." })).toBeVisible();
  await expect(page.getByText(/synthetic pose landmarks/)).toBeVisible();
  await page.getByRole("button", { name: "Coach view" }).click();
  await page.getByRole("tab", { name: /Backspace/ }).click();
  await expect(page.getByRole("heading", { name: "Backspace" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Inspect the evidence/ })).toBeVisible();
  await page.getByRole("button", { name: /Compare/ }).click();
  await expect(page.getByText("Compare against")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("mobile visitor can switch from baseball to a body-first sport", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Sport").selectOption("tennis");
  await expect(page.getByText(/Tennis/).first()).toBeVisible();
  await expect(page.getByText(/racket unsupported/)).toBeVisible();
  await page.getByRole("button", { name: /Explore sample report/ }).click();
  await expect(page.getByRole("heading", { name: /Tennis: ready to review/ })).toBeVisible();
  await expect(page.getByText(/No universal technique score/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Your swing is ready to review/ })).toHaveCount(0);
});
