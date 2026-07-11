import { expect, test } from "@playwright/test";

test.describe("landing happy path", () => {
  test("hero renders with searchbar, chips and sections", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Make any repo agent-ready" }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "GitHub repository URL" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /vercel\/ai/ })).toBeVisible();
    await expect(page.locator("#how-it-works")).toBeAttached();
    await expect(page.locator("#gallery")).toBeAttached();
    await expect(page.locator("#faq")).toBeAttached();
  });

  test("search: invalid input shows error, valid input submits", async ({
    page,
  }) => {
    await page.route("**/api/repos/resolve", async (route) => {
      const body = route.request().postDataJSON() as { input: string };
      if (body.input.includes("vercel/ai")) {
        await route.fulfill({
          json: {
            owner: "vercel",
            repo: "ai",
            avatarUrl: "https://avatars.githubusercontent.com/u/14985020?v=4",
            private: false,
          },
        });
      } else {
        await route.fulfill({
          status: 404,
          json: {
            type: "about:blank",
            title: "Repository not found",
            status: 404,
            detail: "Repo not found — check the URL or try owner/repo",
          },
        });
      }
    });

    await page.goto("/");
    const input = page.getByRole("textbox", { name: "GitHub repository URL" });

    // Invalid
    await input.fill("this/does-not-exist-xyz");
    await expect(
      page.getByText("Repo not found — check the URL or try owner/repo"),
    ).toBeVisible();
    await expect(input).toHaveAttribute("aria-invalid", "true");

    // Valid → button label updates → submit navigates
    await input.fill("github.com/vercel/ai");
    const submit = page.getByRole("button", { name: /Brief vercel\/ai/ });
    await expect(submit).toBeVisible();
    await submit.click();
    // Generous timeout: first hit compiles the dynamic route in dev.
    await expect(page).toHaveURL("/vercel/ai", { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "vercel/ai" })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("/ keyboard shortcut focuses the search bar", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("/");
    await expect(
      page.getByRole("textbox", { name: "GitHub repository URL" }),
    ).toBeFocused();
  });

  test("FAQ accordion opens single item", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Do you store my code?" });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await expect(
      page.getByText("we don't clone or keep your source"),
    ).toBeVisible();
  });
});
