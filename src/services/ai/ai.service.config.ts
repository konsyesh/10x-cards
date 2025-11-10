/**
 * src/services/ai/ai.service.config.ts
 *
 * Predefiniowane konfiguracje AIService dla różnych use-case'ów
 * Można je używać do szybkiej inicjalizacji serwisu
 */

import { AIService, type AIServiceConfig } from "./ai.service";
import type { Logger } from "./ai.service";

/**
 * Development configuration - więcej logów, krótsze timeout
 */
export function createDevConfig(logger?: Logger): AIServiceConfig {
  return {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    defaultParams: {
      temperature: 0.2,
      topP: 0.9,
    },
    timeoutMs: 10000, // Krótsze dla szybszych testów
    retryPolicy: {
      maxRetries: 2,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      jitter: true,
    },
    logger,
  };
}

/**
 * Production configuration - wyższe timeout, agresywne retry
 */
export function createProdConfig(logger?: Logger): AIServiceConfig {
  return {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    defaultParams: {
      temperature: 0.2,
      topP: 0.9,
    },
    timeoutMs: 20000, // Dłuższe dla reliability
    retryPolicy: {
      maxRetries: 3,
      baseDelayMs: 300,
      maxDelayMs: 5000,
      jitter: true,
    },
    logger,
  };
}

/**
 * Testing configuration - mock, bez realnych callów
 */
export function createTestConfig(logger?: Logger): AIServiceConfig {
  return {
    apiKey: "test_key_1234567890",
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    defaultParams: {
      temperature: 0.5,
      topP: 0.9,
    },
    timeoutMs: 5000,
    retryPolicy: {
      maxRetries: 1,
      baseDelayMs: 10,
      maxDelayMs: 100,
      jitter: false,
    },
    logger,
  };
}

/**
 * High-performance configuration - lówne temp, mniej retry
 */
export function createHighPerfConfig(logger?: Logger): AIServiceConfig {
  return {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    defaultParams: {
      temperature: 0.1, // Deterministic
      topP: 0.9,
    },
    timeoutMs: 15000,
    retryPolicy: {
      maxRetries: 1, // Mniej retry
      baseDelayMs: 200,
      maxDelayMs: 2000,
      jitter: false, // Deterministic
    },
    logger,
  };
}

/**
 * Creative configuration - wyższa temp dla bardziej kreatywnych fiszek
 */
export function createCreativeConfig(logger?: Logger): AIServiceConfig {
  return {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    defaultParams: {
      temperature: 0.7, // Więcej kreatywności
      topP: 0.95,
    },
    timeoutMs: 20000,
    retryPolicy: {
      maxRetries: 3,
      baseDelayMs: 300,
      maxDelayMs: 5000,
      jitter: true,
    },
    logger,
  };
}

/**
 * Reliable configuration - długie timeout, dużo retry
 */
export function createReliableConfig(logger?: Logger): AIServiceConfig {
  return {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    defaultParams: {
      temperature: 0.2,
      topP: 0.9,
    },
    timeoutMs: 30000, // Długie timeout
    retryPolicy: {
      maxRetries: 5, // Dużo retry
      baseDelayMs: 500,
      maxDelayMs: 10000,
      jitter: true,
    },
    logger,
  };
}

/**
 * Service factory - wybiera konfigurację na podstawie environment
 */
export function createAIService(environment?: string, logger?: Logger): AIService {
  const env = environment ?? process.env.NODE_ENV ?? "development";

  let config: AIServiceConfig;

  switch (env) {
    case "production":
    case "prod":
      config = createProdConfig(logger);
      break;
    case "test":
    case "testing":
      config = createTestConfig(logger);
      break;
    case "development":
    case "dev":
    default:
      config = createDevConfig(logger);
      break;
  }

  return new AIService(config);
}

/**
 * Szybkie factory dla Common use-case'ów
 */
export const AIServicePresets = {
  /**
   * Dla flashcard generation - balanced
   */
  flashcards: (logger?: Logger) => {
    return new AIService(createProdConfig(logger))
      .setSystemPrompt(
        "Jesteś asystentem do generowania fiszek edukacyjnych. " +
          "Odpowiadasz WYŁĄCZNIE w JSON ze schematem: { flashcards: [{front, back}, ...] }"
      )
      .setParameters({ temperature: 0.2, maxTokens: 2000 });
  },

  /**
   * Dla summary/analysis - deterministic
   */
  analysis: (logger?: Logger) => {
    return new AIService(createHighPerfConfig(logger))
      .setSystemPrompt("Jesteś ekspertem w analizie tekstu. " + "Odpowiadaj precyzyjnie i zwięźle. JSON tylko.")
      .setParameters({ temperature: 0.1 });
  },

  /**
   * Dla creative content - creative
   */
  creative: (logger?: Logger) => {
    return new AIService(createCreativeConfig(logger))
      .setSystemPrompt("Bądź kreatywny i oryginalny. JSON format.")
      .setParameters({ temperature: 0.7 });
  },

  /**
   * Dla mission-critical tasks - reliable
   */
  missionCritical: (logger?: Logger) => {
    return new AIService(createReliableConfig(logger))
      .setRetryPolicy({
        maxRetries: 5,
        baseDelayMs: 500,
        maxDelayMs: 10000,
        jitter: true,
      })
      .setParameters({ temperature: 0.2 });
  },
};

/**
 * Preset dla testing z mockowanym providerem
 */
export function createMockAIService(): AIService {
  return new AIService(createTestConfig());
}

/**
 * Helper - załaduj logger z environment
 */
export function loadLogger(): Logger | undefined {
  if (process.env.DEBUG) {
    return {
      debug: (msg: string, meta?: unknown) => console.debug(`[DEBUG] ${msg}`, meta),
      info: (msg: string, meta?: unknown) => console.info(`[INFO] ${msg}`, meta),
      warn: (msg: string, meta?: unknown) => console.warn(`[WARN] ${msg}`, meta),
      error: (msg: string, meta?: unknown) => console.error(`[ERROR] ${msg}`, meta),
    };
  }
  return undefined;
}

/**
 * Przykład użycia:
 *
 * // Development
 * const service = createAIService("development", logger);
 *
 * // Production
 * const service = createAIService("production", logger);
 *
 * // Preset
 * const flashcardService = AIServicePresets.flashcards(logger);
 *
 * // Auto-detect environment
 * const service = createAIService(undefined, loadLogger());
 */
