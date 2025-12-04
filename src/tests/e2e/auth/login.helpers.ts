import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const STORAGE_STATE_PATH = path.resolve(__dirname, "auth.json");

/**
 * Logs in via the UI. Asserts that the login ends up on /generate.
 */
export async function loginDedicatedUser(page: Page, email: string, password: string) {
  await page.goto("/auth/login", { waitUntil: "networkidle" });
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Hasło").fill(password);
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(page).toHaveURL(/\/generate/);
}
