import { test } from "@playwright/test";
import { loginDedicatedUser, STORAGE_STATE_PATH } from "../auth/login.helpers";

const e2eUsername = process.env.E2E_USERNAME;
const e2ePassword = process.env.E2E_PASSWORD;

test("Prepare storage state for logged-in suites", async ({ page }) => {
  test.skip(!e2eUsername || !e2ePassword, "E2E credentials are required for setup");
  await loginDedicatedUser(page, e2eUsername, e2ePassword);
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
