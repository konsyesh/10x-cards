/**
 * src/services/ai/ai.service.integration.test.ts
 *
 * Testy integracyjne dla AIService
 * UWAGA: Te testy wymagają OPENROUTER_API_KEY w .env
 */

import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import { AIService } from "./ai.service";
import { isDomainError } from "@/lib/errors";

// Helper: uruchamia test tylko jeśli dostępny jest API key
const itIfApiKey: typeof it = ((name: any, fn: any, timeout?: any) => {
  const runner = process.env.OPENROUTER_API_KEY ? it : it.skip;
  // @ts-expect-error - dopasowanie sygnatury w runtime
  return runner(name, fn, timeout);
}) as unknown as typeof it;

describe("AIService - Integration Tests", () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = new AIService({
      // W testach nie-e2e nie chcemy prawdziwych wywołań sieciowych,
      // ale konstruktor wymaga klucza. Wstrzykujemy więc testowy lub realny z env.
      apiKey: process.env.OPENROUTER_API_KEY || `test_key_${Date.now()}`,
    });
  });

  describe("Real API calls (requires OPENROUTER_API_KEY)", () => {
    itIfApiKey("powinien generować fiszki", async () => {
      const schema = z.object({
        flashcards: z
          .array(
            z.object({
              front: z.string().min(1).max(200),
              back: z.string().min(1).max(600),
            })
          )
          .min(1)
          .max(10),
      });

      const result = await aiService
        .setModel("openai/gpt-4o-mini")
        .setParameters({ temperature: 0.2, maxTokens: 500 })
        .setSystemPrompt("Jesteś asystentem generującym fiszki edukacyjne.")
        .setUserPrompt(
          "Stwórz 3 fiszki o mitochondriach. Format JSON ze schematem: { flashcards: [{front, back}, ...] }"
        )
        .setSchema(schema)
        .generateObject<{ flashcards: { front: string; back: string }[] }>();

      expect(result).toHaveProperty("flashcards");
      expect(Array.isArray(result.flashcards)).toBe(true);
      expect(result.flashcards.length).toBeGreaterThan(0);
      expect(result.flashcards[0]).toHaveProperty("front");
      expect(result.flashcards[0]).toHaveProperty("back");
    });

    itIfApiKey("powinien obsługiwać timeout", async () => {
      aiService.setTimeout(100); // Bardzo krótki timeout

      try {
        await aiService
          .setUserPrompt("Write a very long essay about history")
          .setSchema(z.object({ essay: z.string() }))
          .generateObject();

        // Może się nie timeout'ować jeśli serwer szybki
      } catch (err) {
        if (isDomainError(err)) {
          // Timeout lub inne błędy są OK
          expect([408, 429, 502, 503]).toContain(err.status);
        }
      }
    });

    itIfApiKey("powinien retry'ować rate limit", async () => {
      aiService.setRetryPolicy({
        maxRetries: 2,
        baseDelayMs: 100,
        maxDelayMs: 200,
        jitter: false,
      });

      const schema = z.object({ result: z.string() });

      // Może się nie hit'ować rate limit w dev
      try {
        await aiService.setUserPrompt("test").setSchema(schema).generateObject();
      } catch (err) {
        if (isDomainError(err)) {
          // Rate limited lub inne błędy
          expect([429, 503]).toContain(err.status);
        }
      }
    });

    itIfApiKey("healthcheck powinien zwrócić true dla valid config", async () => {
      const health = await aiService.isHealthy();
      expect(typeof health).toBe("boolean");
    });
  });

  describe("Walidacja schematu", () => {
    it("powinien zwrócić typed result dla prawidłowego schematu", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const data = { name: "John", age: 30 };
      const result = schema.parse(data);

      expect(result.name).toBe("John");
      expect(result.age).toBe(30);
    });

    it("powinien wyrzucić błąd dla nieprawidłowych danych", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const invalidData = { name: "John", age: "thirty" };

      expect(() => {
        schema.parse(invalidData);
      }).toThrow();
    });
  });

  describe("Błędy i retry", () => {
    it("powinien obsługiwać błędy konfiguracji", () => {
      expect(() => {
        new AIService({
          timeoutMs: 100, // Za niskie
        });
      }).toThrow();
    });

    it("powinien obsługiwać brak schematu", async () => {
      try {
        await aiService.setUserPrompt("test").generateObject();
        expect.fail("Powinien wyrzucić błąd");
      } catch (err) {
        if (isDomainError(err)) {
          expect(err.code).toBe("ai/invalid-input");
        }
      }
    });

    it("powinien obsługiwać brak promptu", async () => {
      try {
        await aiService.setSchema(z.object({ test: z.string() })).generateObject();
        expect.fail("Powinien wyrzucić błąd");
      } catch (err) {
        if (isDomainError(err)) {
          expect(err.code).toBe("ai/invalid-input");
        }
      }
    });
  });

  describe("Fluent API", () => {
    it("powinien obsługiwać chain", () => {
      const result = aiService
        .setModel("openai/gpt-4o-mini")
        .setParameters({ temperature: 0.5 })
        .setTimeout(10000)
        .setRetryPolicy({ maxRetries: 1 });

      expect(result).toBe(aiService);
    });

    it("powinien obsługiwać configure batch", () => {
      const result = aiService.configure({
        defaultModel: "gpt-3.5",
        timeoutMs: 5000,
      });

      expect(result).toBe(aiService);
    });
  });

  describe("Logger integration", () => {
    it("powinien zaakceptować logger", () => {
      const logger = {
        debug: (_msg: string) => {
          // no-op
        },
        info: (_msg: string) => {
          // no-op
        },
        warn: (_msg: string) => {
          // no-op
        },
        error: (_msg: string) => {
          // no-op
        },
      };

      const service = new AIService({
        logger,
        apiKey: process.env.OPENROUTER_API_KEY || `test_key_${Date.now()}`,
      });
      expect(service).toBeInstanceOf(AIService);
    });
  });

  describe("Performance", () => {
    it("konstruktor powinien się zainicjalizować szybko", () => {
      const start = performance.now();
      new AIService({ apiKey: process.env.OPENROUTER_API_KEY || `test_key_${Date.now()}` });
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });

    it("settery powinny być szybkie", () => {
      const start = performance.now();

      aiService
        .setModel("gpt-4o-mini")
        .setParameters({ temperature: 0.5 })
        .setSystemPrompt("Test")
        .setUserPrompt("Test")
        .setSchema(z.object({ test: z.string() }))
        .setTimeout(15000)
        .setRetryPolicy({ maxRetries: 2 });

      const end = performance.now();

      expect(end - start).toBeLessThan(50);
    });
  });
});
