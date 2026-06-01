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
  await expect(page.getByRole("button", { name: /buat|simpan|save|create|post/i }).first()).toBeVisible();
}

test("sales list and form coverage", async ({ page }) => {
  await login(page);

  await page.goto("/sales/orders");
  await expect(page).toHaveURL(/\/sales\/orders/);
  await page.goto("/sales/invoices");
  await expect(page).toHaveURL(/\/sales\/invoices/);
  await page.goto("/sales/shipments");
  await expect(page).toHaveURL(/\/sales\/shipments/);
  await page.goto("/sales/payments");
  await expect(page).toHaveURL(/\/sales\/payments/);
  await page.goto("/sales/returns");
  await expect(page).toHaveURL(/\/sales\/returns/);

  await openNewForm(page, "/sales/orders/new");
  await openNewForm(page, "/sales/invoices/new");
  await openNewForm(page, "/sales/shipments/new");
  await openNewForm(page, "/sales/payments/new");
  await openNewForm(page, "/sales/returns/new");
});

test("purchase list and form coverage", async ({ page }) => {
  await login(page);

  await page.goto("/purchase/orders");
  await expect(page).toHaveURL(/\/purchase\/orders/);
  await page.goto("/purchase/invoices");
  await expect(page).toHaveURL(/\/purchase\/invoices/);
  await page.goto("/purchase/receives");
  await expect(page).toHaveURL(/\/purchase\/receives/);
  await page.goto("/purchase/payments");
  await expect(page).toHaveURL(/\/purchase\/payments/);
  await page.goto("/purchase/returns");
  await expect(page).toHaveURL(/\/purchase\/returns/);

  await openNewForm(page, "/purchase/orders/new");
  await openNewForm(page, "/purchase/invoices/new");
  await openNewForm(page, "/purchase/receives/new");
  await openNewForm(page, "/purchase/payments/new");
  await openNewForm(page, "/purchase/returns/new");
});
