import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL ?? "platform@example.com";
const password = process.env.E2E_PASSWORD ?? "password123";

async function login(page: Page) {
  await page.goto("/auth");
  await page.getByLabel(/email/i).fill(email);
  await page.getByRole("textbox", { name: /kata sandi|password/i }).fill(password);
  await page.getByRole("button", { name: /login|masuk/i }).click();
  await page.waitForURL(/\/dashboard|\/sales|\/purchase|\/services/);
}

async function openNewForm(page: Page, path: string) {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await expect(page.locator("form").first()).toBeVisible();
}

test("sales workflows forms are accessible", async ({ page }) => {
  await login(page);

  await openNewForm(page, "/sales/orders/new");
  await openNewForm(page, "/sales/invoices/new");
  await openNewForm(page, "/sales/shipments/new");
  await openNewForm(page, "/sales/payments/new");
  await openNewForm(page, "/sales/returns/new");
});

test("purchase workflows forms are accessible", async ({ page }) => {
  await login(page);

  await openNewForm(page, "/purchase/orders/new");
  await openNewForm(page, "/purchase/invoices/new");
  await openNewForm(page, "/purchase/receives/new");
  await openNewForm(page, "/purchase/payments/new");
  await openNewForm(page, "/purchase/returns/new");
});
