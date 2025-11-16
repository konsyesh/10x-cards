/**
 * src/services/ai/ai.service.example.ts
 *
 * Przykłady użycia AIService
 * Ten plik jest dla dokumentacji i nie powinien być importowany w produkcji
 */

import { z } from "zod";
import { AIService } from "./ai.service";
import { isDomainError } from "@/lib/errors";

/**
 * Przykład 1: Podstawowe generowanie fiszek
 */
export async function example1_basicFlashcardGeneration() {
  // Schemat
  const FlashcardSchema = z.object({
    flashcards: z
      .array(
        z.object({
          front: z.string().min(1).max(200),
          back: z.string().min(1).max(600),
        })
      )
      .min(1)
      .max(50),
  });

  // Inicjalizacja
  const aiService = new AIService()
    .setModel("openai/gpt-4o-mini")
    .setParameters({
      temperature: 0.2,
      maxTokens: 1500,
      topP: 0.9,
    })
    .setSystemPrompt(
      "Jesteś asystentem do generowania fiszek edukacyjnych. " +
        "Odpowiadasz WYŁĄCZNIE w JSON zgodnym ze schematem. " +
        "Fiszki powinny być krótkie i precyzyjne."
    )
    .setSchema(FlashcardSchema);

  // Użycie
  const sourceText = `
    Mitochondria to organella komórkowa odpowiedzialna za produkcję energii.
    Zawierają własne DNA i rybosom. Reprodukują się przez podział...
  `;

  aiService.setUserPrompt(`Stwórz do 8 fiszek edukacyjnych z poniższego tekstu:\n\n${sourceText}`);

  try {
    const { flashcards } = await aiService.generateObject<{
      flashcards: { front: string; back: string }[];
    }>();

    console.log("Wygenerowane fiszki:", flashcards);
    return flashcards;
  } catch (err) {
    if (isDomainError(err)) {
      console.error("Błąd domeny AI:", err.code, err.message);
    }
    throw err;
  }
}

/**
 * Przykład 2: Generowanie z override'ami
 */
export async function example2_withOverrides() {
  const aiService = new AIService();

  const schema = z.object({
    summary: z.string(),
    keywords: z.array(z.string()),
  });

  const result = await aiService.generateObject({
    system: "Jesteś ekspertem w podsumowywaniu tekstów",
    user: "Podsumuj poniższy tekst",
    schema,
    params: {
      temperature: 0.3,
      maxTokens: 500,
    },
    timeoutMs: 10000,
  });

  console.log("Podsumowanie:", result);
  return result;
}

/**
 * Przykład 3: Z obsługą błędów
 */
export async function example3_errorHandling() {
  const aiService = new AIService()
    .setRetryPolicy({
      maxRetries: 3,
      baseDelayMs: 300,
      maxDelayMs: 5000,
      jitter: true,
    })
    .setTimeout(20000);

  const schema = z.object({
    code: z.string(),
    name: z.string(),
    description: z.string(),
  });

  try {
    const result = await aiService.setUserPrompt("Wygeneruj dane dla modelu").setSchema(schema).generateObject();

    console.log("Success:", result);
    return result;
  } catch (err) {
    if (isDomainError(err)) {
      switch (err.code) {
        case "ai/rate-limited":
          console.error("Rate limit - czekaj przed kolejną próbą");
          // Tutaj można zalogować metrykę, wysłać alert, itp.
          break;

        case "ai/timeout":
          console.error("Timeout - spróbuj z krótszym inputem");
          break;

        case "ai/unauthorized":
          console.error("Błąd autoryzacji - sprawdź OPENROUTER_API_KEY");
          break;

        case "ai/validation-failed":
          console.error("Walidacja wyjścia nie przeszła", err.meta);
          break;

        case "ai/retry-exhausted":
          console.error("Wyczerpane próby retry");
          break;

        default:
          console.error("Błąd AI:", err.title, err.message);
      }
    } else {
      console.error("Nieoczekiwany błąd:", err);
    }

    throw err;
  }
}

/**
 * Przykład 4: Batch configuration
 */
export async function example4_batchConfiguration() {
  const aiService = new AIService();

  // Konfiguracja batch
  aiService.configure({
    defaultModel: "openai/gpt-4o-mini",
    defaultParams: {
      temperature: 0.2,
      maxTokens: 1500,
    },
    timeoutMs: 15000,
    requestHeaders: {
      "HTTP-Referer": "https://10xcards.dev",
      "X-Title": "10xCards",
    },
  });

  // Teraz można używać bez konfiguracji per-call
  const schema = z.object({ result: z.string() });

  const result = await aiService.setUserPrompt("Test prompt").setSchema(schema).generateObject();

  console.log("Result:", result);
  return result;
}

/**
 * Przykład 5: Z loggerem
 */
export async function example5_withLogger() {
  // Prosty logger
  const logger = {
    debug: (msg: string, meta?: unknown) => {
      console.debug(`[DEBUG] ${msg}`, meta);
    },
    info: (msg: string, meta?: unknown) => {
      console.info(`[INFO] ${msg}`, meta);
    },
    warn: (msg: string, meta?: unknown) => {
      console.warn(`[WARN] ${msg}`, meta);
    },
    error: (msg: string, meta?: unknown) => {
      console.error(`[ERROR] ${msg}`, meta);
    },
  };

  const aiService = new AIService({ logger });

  const schema = z.object({ output: z.string() });

  const result = await aiService.setUserPrompt("Wygeneruj coś").setSchema(schema).generateObject();

  return result;
}

/**
 * Przykład 6: Healthcheck
 */
export async function example6_healthcheck() {
  const aiService = new AIService();

  const isHealthy = await aiService.isHealthy();

  if (isHealthy) {
    console.log("✓ AIService is healthy");
  } else {
    console.log("✗ AIService is unhealthy");
  }

  return isHealthy;
}

/**
 * Przykład 7: Fluent API chain
 */
export async function example7_fluentChain() {
  const schema = z.object({
    items: z.array(z.string()),
  });

  const result = await new AIService()
    .setModel("openai/gpt-4o-mini")
    .setParameters({ temperature: 0.5 })
    .setSystemPrompt("Generuj listy")
    .setUserPrompt("Stwórz listę 5 owoców")
    .setSchema(schema)
    .setTimeout(15000)
    .setRetryPolicy({ maxRetries: 2 })
    .generateObject<{ items: string[] }>();

  console.log("Items:", result.items);
  return result;
}

/**
 * Przykład 8: Reusing service dla wielokrotnych generacji
 */
export async function example8_reusingService() {
  // Utwórz service raz
  const aiService = new AIService()
    .setModel("openai/gpt-4o-mini")
    .setParameters({ temperature: 0.2 })
    .setSystemPrompt("Jesteś doradcą edukacyjnym");

  const schema = z.object({
    advice: z.string(),
  });

  // Wykorzystaj wiele razy z innymi promptami
  const topics = ["Historia", "Matematyka", "Fizyka"];

  const results = [];

  for (const topic of topics) {
    const result = await aiService
      .setUserPrompt(`Daj radę dotyczącą nauki ${topic}`)
      .setSchema(schema)
      .generateObject();

    results.push(result);
  }

  console.log("Results:", results);
  return results;
}

/**
 * Przykład 9: Error mapping
 */
export async function example9_errorMapping() {
  const aiService = new AIService();

  const schema = z.object({ data: z.string() });

  try {
    await aiService.setUserPrompt("test").setSchema(schema).generateObject();
  } catch (err) {
    if (isDomainError(err)) {
      // Mapa HTTP status -> akcja
      const statusActions: Record<number, () => void> = {
        400: () => console.log("Bad request - sprawdź input"),
        401: () => console.log("Unauthorized - sprawdź API key"),
        408: () => console.log("Timeout - spróbuj później"),
        429: () => console.log("Rate limited - czekaj"),
        503: () => console.log("Service unavailable - spróbuj później"),
      };

      const action = statusActions[err.status];
      if (action) action();
    }
  }
}

/**
 * Przykład 10: Production-ready service factory
 */
export function createProductionAIService() {
  const logger = {
    debug: (msg: string, meta?: unknown) => process.env.DEBUG && console.debug(msg, meta),
    info: (msg: string, meta?: unknown) => console.info(msg, meta),
    warn: (msg: string, meta?: unknown) => console.warn(msg, meta),
    error: (msg: string, meta?: unknown) => console.error(msg, meta),
  };

  return new AIService({
    logger,
    timeoutMs: 15000,
  }).configure({
    defaultModel: "openai/gpt-4o-mini",
    defaultParams: {
      temperature: 0.2,
      topP: 0.9,
    },
    retryPolicy: {
      maxRetries: 3,
      baseDelayMs: 300,
      maxDelayMs: 5000,
      jitter: true,
    },
    requestHeaders: {
      "HTTP-Referer": "https://production.app",
      "X-Title": "Production App",
    },
  });
}

/**
 * Notatka dla implementatorów:
 *
 * 1. Zawsze waliduj schemat Zod
 * 2. Obsłuż błędy ai/* domeny
 * 3. Nie wysyłaj apiKey do klienta
 * 4. Loguj z maskowaniem PII
 * 5. Testuj z różnymi modelami
 * 6. Monitoruj rate limit i timeout
 * 7. Używaj fluent API dla czytelności
 * 8. Cache/reuse AIService gdzie możliwe
 */
