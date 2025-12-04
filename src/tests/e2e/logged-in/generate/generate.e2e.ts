import { test, expect } from "@playwright/test";

const LONG_SOURCE_TEXT =
  "Lewa strona jest obniżona troszeczkę niżej z powodu tego elementu, gdzie nam brakuje trochę włosów. Okej, wszystko ładnie sczesane do przodu. check. Boki są krótsze, więc mogą nam uciec z podpięcia. check. check. Okej, mamy podpięty w taki sposób. Możesz głowę wziąć tak troszeczkę w tą stronę, w taki sposób. Więc widzicie, że ta linia tutaj biegnie zgodnie z porostem włosów, więc wybrałem taką sekcję do tego, żeby móc od razu sobie pracować z bokami i z tyłem i na koniec dopasować do tego górę. Dobra, zaczynamy od prawej strony. Zaczynamy od boków. Sczesuję włosy zgodnie z linią separacji, którą będę wybierał. Na początku sobie sczesuję wszystko do dołu, żeby ocenić, jaką, jaką techniką chcę tutaj strzyc. Będziemy zaczesywali te włosy do tyłu, będziemy robili tejpera, więc najwygodniejszą techniką i jakby tą, którą chcemy tutaj uzyskać, to nie jest kwadrat, czyli nie jest to lekkość na warstwach. Jest to bardziej gradacja, czyli delikatny trójkąt. Chcemy tutaj ciężkość uzyskać, żeby włosy się nam tutaj zbierały i budowały nadmiar na narożnikach naszej głowy.";

test.describe("Generate page – happy path", () => {
  test("generates cards, accepts them, and saves successfully", async ({ page }) => {
    await page.goto("/generate", { waitUntil: "networkidle" });

    await page.getByLabel("Tekst źródłowy").fill(LONG_SOURCE_TEXT);
    await page.getByRole("button", { name: "Generuj karty" }).click();

    const firstCard = page.locator('[id^="card-"]').first();
    await firstCard.waitFor({ state: "visible", timeout: 30_000 });

    await page.getByRole("button", { name: /Zaakceptuj wszystkie karty/ }).click();

    const saveToolbarButton = page.getByRole("button", { name: /Zapisz \d+ zaakceptowanych kart/ });
    await expect(saveToolbarButton).toBeEnabled();
    await saveToolbarButton.click();

    const saveDialog = page.getByRole("dialog", { name: "Potwierdzenie zapisu" });
    await expect(saveDialog).toBeVisible();

    const confirmButton = saveDialog.getByRole("button", { name: /Zapisz \d+ kart/ });
    await confirmButton.click();

    await expect(page.getByText("Sukces")).toBeVisible();
    await expect(page.getByLabel("Tekst źródłowy")).toHaveValue("");
  });
});
