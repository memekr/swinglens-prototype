import { expect, test } from "@playwright/test";

test("mobile visitor can open a transparent sample report", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /내 스윙을/ })).toBeVisible();
  await expect(page.getByText("영상은 폰 밖으로 나가지 않아요")).toBeAttached();
  await page.getByRole("button", { name: /샘플 결과 보기/ }).click();
  await expect(page.getByRole("heading", { name: "스윙 체크가 끝났어요." })).toBeVisible();
  await expect(page.getByText(/합성 스켈레톤/)).toBeVisible();
  await page.getByRole("tab", { name: /팔로스루/ }).click();
  await expect(page.getByRole("heading", { name: "팔로스루 체크" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
