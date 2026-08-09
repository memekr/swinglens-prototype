import { expect, test } from "@playwright/test";

test("mobile visitor can open a transparent sample report", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /See the move/ })).toBeVisible();
  await expect(page.getByText("Your video stays on your device")).toBeAttached();
  await page.getByRole("button", { name: /Explore sample report/ }).click();
  await expect(page.getByRole("heading", { name: "Your swing is ready to review." })).toBeVisible();
  await expect(page.getByText(/synthetic pose landmarks/)).toBeVisible();
  await page.getByRole("button", { name: "Coach view" }).click();
  await page.getByRole("tab", { name: /Follow-through/ }).click();
  await expect(page.getByRole("heading", { name: "Follow-through" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Inspect the evidence/ })).toBeVisible();
  await page.getByRole("button", { name: /Compare/ }).click();
  await expect(page.getByText("Compare against")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
