import { expect, Page, test } from "@playwright/test";

const addFlashcard = async ({ page, front, back }: { page: Page; front: string; back: string }) => {
  await page.getByRole("button", { name: "Dodaj nową fiszkę" }).click();
  const dialog = page.getByRole("dialog", { name: "Dodaj nową fiszkę" });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Pytanie").fill(front);
  await dialog.getByLabel("Odpowiedź").fill(back);
  await dialog.getByRole("button", { name: "Dodaj" }).click();

  await expect(page.getByText("Fiszka została dodana pomyślnie")).toBeVisible();
  await expect(dialog).toBeHidden();
};

test.describe("Flashcards page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/flashcards", { waitUntil: "networkidle" });
  });

  test("shows toolbar and list", async ({ page }) => {
    await expect(page.getByLabel("Pole wyszukiwania fiszek")).toBeVisible();
    await expect(page.getByRole("button", { name: "Dodaj nową fiszkę" })).toBeVisible();

    const placeholder = page.getByText("Brak fiszek do wyświetlenia");
    const table = page.getByRole("table");
    const placeholderCount = await placeholder.count();
    const tableCount = await table.count();
    expect(placeholderCount + tableCount).toBeGreaterThan(0);
  });

  test("filters and sorts flashcards", async ({ page }) => {
    const prefix = `e2e-search-${Date.now()}`;
    const alphaFront = `${prefix}-Alpha`;
    const betaFront = `${prefix}-Beta`;

    await addFlashcard({ page, front: alphaFront, back: "Back A" });
    await addFlashcard({ page, front: betaFront, back: "Back B" });

    const searchInput = page.getByLabel("Pole wyszukiwania fiszek");
    await searchInput.fill(prefix);

    const filteredRows = page.locator("table tbody tr");
    await expect(filteredRows).toHaveCount(2);
    await page.getByLabel("Wybór sortowania").click();
    await page.getByRole("option", { name: "Pytanie A-Z" }).click();
    await expect(filteredRows.first()).toContainText(alphaFront);

    await page.getByLabel("Wybór sortowania").click();
    await page.getByRole("option", { name: "Pytanie Z-A" }).click();
    await expect(filteredRows.first()).toContainText(betaFront);
  });

  test("creates a new flashcard", async ({ page }) => {
    const front = `e2e-create-${Date.now()}`;
    const back = "Ta karta została utworzona w teście";

    await addFlashcard({ page, front, back });
    await expect(page.getByText("Fiszka została dodana pomyślnie")).toBeVisible();
    await expect(page.locator("table tbody tr", { hasText: front })).toHaveCount(1);
  });

  test("edits an existing flashcard", async ({ page }) => {
    const front = `e2e-edit-${Date.now()}`;
    const back = "Karta do edycji";
    await addFlashcard({ page, front, back });

    const row = page.locator("table tbody tr", { hasText: front }).first();
    await row.getByRole("button", { name: "Edytuj fiszkę" }).click();

    const dialog = page.getByRole("dialog", { name: "Edytuj fiszkę" });
    await dialog.getByLabel("Pytanie").fill(`${front}-updated`);
    await dialog.getByLabel("Odpowiedź").fill(`${back} [edytowana]`);
    await dialog.getByRole("button", { name: "Zapisz" }).click();

    await expect(page.getByText("Fiszka została zaktualizowana pomyślnie")).toBeVisible();
    await expect(page.locator("table tbody tr", { hasText: `${front}-updated` }).first()).toBeVisible();
  });

  test("deletes a flashcard with confirmation", async ({ page }) => {
    const front = `e2e-delete-${Date.now()}`;
    const back = "Karta do usunięcia";
    await addFlashcard({ page, front, back });

    const row = page.locator("table tbody tr", { hasText: front }).first();
    await row.getByRole("button", { name: "Usuń fiszkę" }).click();

    const dialog = page.getByRole("alertdialog", { name: "Potwierdź usunięcie" });
    await dialog.getByRole("button", { name: "Usuń" }).click();

    await expect(page.getByText("Fiszka została usunięta pomyślnie")).toBeVisible();
    await expect(page.locator("table tbody tr", { hasText: front })).toHaveCount(0);
  });

  test("shows error toast when saving fails", async ({ page }) => {
    const routeHandler = async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: { message: "Simulated failure" } }),
        });
      } else {
        await route.continue();
      }
    };

    await page.route("**/api/flashcards", routeHandler);

    await page.getByRole("button", { name: "Dodaj nową fiszkę" }).click();
    const dialog = page.getByRole("dialog", { name: "Dodaj nową fiszkę" });
    await dialog.getByLabel("Pytanie").fill("Should fail");
    await dialog.getByLabel("Odpowiedź").fill("Taki test");
    await dialog.getByRole("button", { name: "Dodaj" }).click();

    await expect(page.getByText("Błąd: Wystąpił błąd podczas zapisywania")).toBeVisible();
    await page.unroute("**/api/flashcards", routeHandler);
  });
});
