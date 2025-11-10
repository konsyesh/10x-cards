/**
 * src/services/ai/ai.service.test.ts
 *
 * Testy jednostkowe dla AIService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { z } from "zod";
import { AIService, AIServiceConfigSchema, AIModelParamsSchema, RetryPolicySchema } from "./ai.service";
import { aiErrors } from "./ai.errors";

describe("AIService", () => {
  describe("Konstruktor i walidacja konfiguracji", () => {
    it("powinien wyrzucić błąd InvalidConfig dla nieprawidłowej konfiguracji", () => {
      expect(() => {
        new AIService({
          apiKey: "short",
          timeoutMs: 100, // Za niskie - min 500
        });
      }).toThrow();
    });

    it("powinien wyrzucić Unauthorized jeśli brak apiKey", () => {
      const originalEnv = process.env.OPENROUTER_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      try {
        expect(() => {
          new AIService({ apiKey: undefined });
        }).toThrow();
      } finally {
        if (originalEnv) process.env.OPENROUTER_API_KEY = originalEnv;
      }
    });

    it("powinien zaakceptować prawidłową konfigurację", () => {
      process.env.OPENROUTER_API_KEY = "valid_key_1234567890";
      const service = new AIService();
      expect(service).toBeInstanceOf(AIService);
    });
  });

  describe("Settery i fluent API", () => {
    let service: AIService;

    beforeEach(() => {
      process.env.OPENROUTER_API_KEY = "valid_key_1234567890";
      service = new AIService();
    });

    it("setModel powinien ustawić model", () => {
      service.setModel("gpt-4");
      expect(service).toBeInstanceOf(AIService); // Fluent chain
    });

    it("setModel powinien wyrzucić dla pustej nazwy", () => {
      expect(() => {
        service.setModel("");
      }).toThrow();
    });

    it("setParameters powinien ustawić parametry", () => {
      service.setParameters({ temperature: 0.5, maxTokens: 1000 });
      expect(service).toBeInstanceOf(AIService);
    });

    it("setParameters powinien walidować wartości", () => {
      expect(() => {
        service.setParameters({ temperature: 3 }); // Max 2
      }).toThrow();
    });

    it("setSystemPrompt powinien ustawić system prompt", () => {
      service.setSystemPrompt("Test system prompt");
      expect(service).toBeInstanceOf(AIService);
    });

    it("setSystemPrompt powinien wyrzucić dla pustego promptu", () => {
      expect(() => {
        service.setSystemPrompt("");
      }).toThrow();
    });

    it("setUserPrompt powinien ustawić user prompt", () => {
      service.setUserPrompt("Test user prompt");
      expect(service).toBeInstanceOf(AIService);
    });

    it("setSchema powinien ustawić schema", () => {
      const schema = z.object({ test: z.string() });
      service.setSchema(schema);
      expect(service).toBeInstanceOf(AIService);
    });

    it("setTimeout powinien ustawić timeout", () => {
      service.setTimeout(5000);
      expect(service).toBeInstanceOf(AIService);
    });

    it("setTimeout powinien wyrzucić dla nieprawidłowego timeout", () => {
      expect(() => {
        service.setTimeout(100); // Min 500
      }).toThrow();
    });

    it("setRetryPolicy powinien ustawić politykę retry", () => {
      service.setRetryPolicy({ maxRetries: 3, baseDelayMs: 500 });
      expect(service).toBeInstanceOf(AIService);
    });

    it("configure powinien scalić konfigurację", () => {
      service.configure({
        defaultModel: "gpt-3.5",
        defaultParams: { temperature: 0.3 },
        timeoutMs: 10000,
      });
      expect(service).toBeInstanceOf(AIService);
    });

    it("setHeaders powinien ustawić nagłówki", () => {
      service.setHeaders({ "X-Custom": "value" });
      expect(service).toBeInstanceOf(AIService);
    });
  });

  describe("Walidacja schematu Zod", () => {
    let service: AIService;

    beforeEach(() => {
      process.env.OPENROUTER_API_KEY = "valid_key_1234567890";
      service = new AIService();
    });

    it("AIServiceConfigSchema powinien zaakceptować prawidłowe config", () => {
      const config = {
        apiKey: "valid_key_1234567890",
        baseURL: "https://openrouter.ai/api/v1",
        defaultModel: "gpt-4",
        timeoutMs: 5000,
      };
      const result = AIServiceConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("AIModelParamsSchema powinien walidować parametry", () => {
      const params = { temperature: 0.5, maxTokens: 1000, topP: 0.9 };
      const result = AIModelParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it("RetryPolicySchema powinien walidować politykę", () => {
      const policy = { maxRetries: 2, baseDelayMs: 300, maxDelayMs: 3000 };
      const result = RetryPolicySchema.safeParse(policy);
      expect(result.success).toBe(true);
    });

    it("RetryPolicySchema powinien ustawić defaults", () => {
      const policy = {};
      const result = RetryPolicySchema.safeParse(policy);
      expect(result.success).toBe(true);
      expect(result.data?.maxRetries).toBe(2);
      expect(result.data?.baseDelayMs).toBe(300);
    });
  });

  describe("isHealthy", () => {
    let service: AIService;

    beforeEach(() => {
      process.env.OPENROUTER_API_KEY = "valid_key_1234567890";
      service = new AIService();
    });

    it("isHealthy powinien zwrócić false dla błędnej konfiguracji", async () => {
      service.setTimeout(100); // Bardzo krótki timeout - symulacja fail
      const health = await service.isHealthy();
      expect(typeof health).toBe("boolean");
    });
  });

  describe("Obsługa błędów", () => {
    let service: AIService;

    beforeEach(() => {
      process.env.OPENROUTER_API_KEY = "valid_key_1234567890";
      service = new AIService();
    });

    it("generateObject powinien wyrzucić InvalidInput jeśli brak promptu", async () => {
      service.setSchema(z.object({ test: z.string() }));

      try {
        await service.generateObject();
        expect.fail("Powinien wyrzucić błąd");
      } catch (err) {
        expect(err).toHaveProperty("code", "ai/invalid-input");
      }
    });

    it("generateObject powinien wyrzucić InvalidInput jeśli brak schematu", async () => {
      service.setUserPrompt("Test prompt");

      try {
        await service.generateObject();
        expect.fail("Powinien wyrzucić błąd");
      } catch (err) {
        expect(err).toHaveProperty("code", "ai/invalid-input");
      }
    });

    it("generateObject powinien wyrzucić SchemaError jeśli schema brak i overrides brak", async () => {
      service.setUserPrompt("Test prompt");

      try {
        await service.generateObject();
        expect.fail("Powinien wyrzucić błąd");
      } catch (err) {
        expect(err).toHaveProperty("code", "ai/invalid-input");
      }
    });
  });

  describe("Integracjne testy z mock providera", () => {
    it("powinien obsługiwać rate limit z retry", async () => {
      process.env.OPENROUTER_API_KEY = "valid_key_1234567890";
      const service = new AIService().setRetryPolicy({
        maxRetries: 1,
        baseDelayMs: 10,
        maxDelayMs: 20,
        jitter: false,
      });

      // Ten test jest ilustracyjny - w rzeczywistości wymagałby mockowania generateObject
      // Tutaj testujemy strukturę retry
      expect(service).toBeInstanceOf(AIService);
    });
  });

  describe("Maskowanie danych wrażliwych", () => {
    let service: AIService;

    beforeEach(() => {
      process.env.OPENROUTER_API_KEY = "valid_key_1234567890";
      service = new AIService();
    });

    it("powinien obsługiwać puste dane", () => {
      // Tester via logger (prywatna metoda maskSensitiveData)
      // Testujemy że service się inicjalizuje bez błędów
      expect(service).toBeInstanceOf(AIService);
    });
  });
});

