import { expect, test } from "@playwright/test";

test("home -> search -> favorite -> reload -> persisted -> no results", async ({ page }) => {
  await page.goto("/");
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(8);

  const search = page.getByRole("combobox", { name: "Search adverse events" });
  await search.fill("nausea");
  await expect(cards.first()).toHaveAccessibleName("Nausea");

  // Nausea is a default favorite; add a non-default term to prove persistence.
  await search.fill("alopecia");
  await page.getByRole("article", { name: "Alopecia" }).getByRole("button", { name: "Add to favorites" }).click();

  await page.reload();
  await expect(cards).toHaveCount(9);
  await expect(page.getByRole("article", { name: "Alopecia" })).toBeVisible();

  await page.getByRole("article", { name: "Nausea" }).getByRole("button", { name: "Remove from favorites" }).click();
  await page.reload();
  await expect(cards).toHaveCount(8);
  await expect(page.getByRole("article", { name: "Nausea" })).toHaveCount(0);

  await search.fill("zzzzqqq");
  await expect(page.getByText("No results found")).toBeVisible();
});

test("no horizontal scrolling at 360px width", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const query of ["", "Immune effector cell-associated neurotoxicity syndrome"]) {
    await page.goto("/");
    if (query) await page.getByRole("combobox").fill(query);
    await expect(page.getByRole("article").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
});
