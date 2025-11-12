/**
 * src/services/ai/ai.service.ts
 *
 * AIService - Serwis do generowania ustrukturyzowanych odpowiedzi z AI SDK v5 + OpenRouter
 * Obsługuje:
 * - Konfiguracja post-construction (settery)
 * - Walidacja wejścia/wyjścia przez Zod
 * - Retry z backoffem i timeout
 * - Spójne logowanie z maskowaniem PII
 * - Integracja z Error Handling Architecture
 */

import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { aiErrors } from "./ai.errors";

/**
 * Kontrakt loggera (minimalny)
 */
export interface Logger {
  debug: (msg: string, meta?: unknown) => void;
  info: (msg: string, meta?: unknown) => void;
  warn: (msg: string, meta?: unknown) => void;
  error: (msg: string, meta?: unknown) => void;
}

/**
 * Schematy Zod dla konfiguracji
 */
export const AIModelParamsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(4000).optional(),
  topP: z.number().min(0).max(1).optional(),
  seed: z.number().int().nonnegative().optional(),
});

export const RetryPolicySchema = z.object({
  maxRetries: z.number().int().min(0).max(5).default(2),
  baseDelayMs: z.number().int().min(10).max(10000).default(300),
  maxDelayMs: z.number().int().min(50).max(60000).default(3000),
  jitter: z.boolean().default(true),
});

export const AIServiceConfigSchema = z.object({
  apiKey: z.string().min(10).optional(),
  baseURL: z.string().url().default("https://openrouter.ai/api/v1"),
  defaultModel: z.string().min(1).default("openai/gpt-4o-mini"),
  defaultParams: AIModelParamsSchema.default({ temperature: 0.2, topP: 0.9 }),
  requestHeaders: z.record(z.string()).optional(),
  timeoutMs: z.number().int().min(500).max(60000).default(15000),
  retryPolicy: RetryPolicySchema.default({}),
  logger: z.custom<Logger>().optional(),
});

export type AIServiceConfig = z.infer<typeof AIServiceConfigSchema>;
export type AIModelParams = z.infer<typeof AIModelParamsSchema>;
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

export interface GenerateObjectOptions<T> {
  system?: string;
  user?: string;
  model?: string;
  params?: Partial<AIModelParams>;
  schema?: z.ZodType<T>;
  timeoutMs?: number;
}

/**
 * AIService - Główna klasa serwisu
 */
export class AIService {
  private provider: ReturnType<typeof createOpenAI>;
  private currentModel: string;
  private currentParams: AIModelParams;
  private systemPrompt?: string;
  private userPrompt?: string;
  private schema?: z.ZodType<unknown>;
  private headers: Record<string, string>;
  private timeoutMs: number;
  private retryPolicy: RetryPolicy;
  private logger?: Logger;

  constructor(config?: z.input<typeof AIServiceConfigSchema>) {
    // Walidacja i parsowanie konfiguracji
    const parseResult = AIServiceConfigSchema.safeParse(config ?? {});
    if (!parseResult.success) {
      throw aiErrors.creators.InvalidConfig({
        detail: `Nieprawidłowa konfiguracja AIService: ${parseResult.error.message}`,
        meta: { errors: parseResult.error.flatten() },
        cause: parseResult.error,
      });
    }

    const cfg = parseResult.data;

    // Uzupełnienie apiKey z env
    const apiKey = cfg.apiKey ?? import.meta.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey.length < 10) {
      throw aiErrors.creators.Unauthorized({
        detail: "Brak lub nieprawidłowy OPENROUTER_API_KEY w konfiguracji lub zmiennych środowiskowych",
        meta: { field: "apiKey" },
      });
    }

    // Inicjalizacja providera
    this.provider = createOpenAI({
      apiKey,
      baseURL: cfg.baseURL,
    });

    // Ustawienie pól domyślnych
    this.currentModel = cfg.defaultModel;
    this.currentParams = cfg.defaultParams as AIModelParams;
    this.timeoutMs = cfg.timeoutMs;
    this.retryPolicy = cfg.retryPolicy as RetryPolicy;
    this.logger = cfg.logger;
    this.headers = {
      "HTTP-Referer": "https://10xcards.dev",
      "X-Title": "10xCards",
      ...(cfg.requestHeaders ?? {}),
    };
  }

  /**
   * Ustawienie modelu
   */
  setModel(modelName: string): this {
    const parsed = z.string().min(1).safeParse(modelName);
    if (!parsed.success) {
      throw aiErrors.creators.BadRequest({
        detail: `Nieprawidłowa nazwa modelu: ${modelName}`,
        cause: parsed.error,
      });
    }
    this.currentModel = parsed.data;
    return this;
  }

  /**
   * Ustawienie parametrów modelu
   */
  setParameters(params: z.input<typeof AIModelParamsSchema>): this {
    const parsed = AIModelParamsSchema.partial().safeParse(params);
    if (!parsed.success) {
      throw aiErrors.creators.InvalidConfig({
        detail: `Nieprawidłowe parametry modelu: ${parsed.error.message}`,
        meta: { errors: parsed.error.flatten() },
        cause: parsed.error,
      });
    }
    this.currentParams = { ...this.currentParams, ...parsed.data };
    return this;
  }

  /**
   * Ustawienie system prompt
   */
  setSystemPrompt(systemPrompt: string): this {
    const parsed = z.string().min(1).max(5000).safeParse(systemPrompt);
    if (!parsed.success) {
      throw aiErrors.creators.InvalidInput({
        detail: `System prompt musi być pomiędzy 1 a 5000 znakami`,
        meta: { length: systemPrompt.length },
        cause: parsed.error,
      });
    }
    this.systemPrompt = parsed.data;
    return this;
  }

  /**
   * Ustawienie user prompt
   */
  setUserPrompt(userPrompt: string): this {
    const parsed = z.string().min(1).max(20000).safeParse(userPrompt);
    if (!parsed.success) {
      throw aiErrors.creators.InvalidInput({
        detail: `User prompt musi być pomiędzy 1 a 20000 znakami`,
        meta: { length: userPrompt.length },
        cause: parsed.error,
      });
    }
    this.userPrompt = parsed.data;
    return this;
  }

  /**
   * Ustawienie schematu Zod dla structured output
   */
  setSchema<T>(schema: z.ZodType<T>): this {
    if (!schema) {
      throw aiErrors.creators.SchemaError({
        detail: "Schema nie może być pusta",
      });
    }
    this.schema = schema;
    return this;
  }

  /**
   * Ustawienie nagłówków requestu
   */
  setHeaders(headers: Record<string, string>): this {
    const parsed = z.record(z.string()).safeParse(headers);
    if (!parsed.success) {
      throw aiErrors.creators.InvalidConfig({
        detail: `Nieprawidłowe nagłówki: ${parsed.error.message}`,
        cause: parsed.error,
      });
    }
    this.headers = { ...this.headers, ...parsed.data };
    return this;
  }

  /**
   * Ustawienie timeout
   */
  setTimeout(timeoutMs: number): this {
    const parsed = AIServiceConfigSchema.shape.timeoutMs.safeParse(timeoutMs);
    if (!parsed.success) {
      throw aiErrors.creators.InvalidConfig({
        detail: `Timeout musi być między 500 a 60000 ms`,
        cause: parsed.error,
      });
    }
    this.timeoutMs = parsed.data;
    return this;
  }

  /**
   * Ustawienie polityki retry
   */
  setRetryPolicy(policy: z.input<typeof RetryPolicySchema>): this {
    const parsed = RetryPolicySchema.safeParse(policy);
    if (!parsed.success) {
      throw aiErrors.creators.InvalidConfig({
        detail: `Nieprawidłowa polityka retry: ${parsed.error.message}`,
        meta: { errors: parsed.error.flatten() },
        cause: parsed.error,
      });
    }
    this.retryPolicy = parsed.data;
    return this;
  }

  /**
   * Wstrzyknięcie loggera
   */
  setLogger(logger: Logger): this {
    this.logger = logger;
    return this;
  }

  /**
   * Batch configuration (deepPartial + merge)
   */
  configure(options: Partial<z.input<typeof AIServiceConfigSchema>>): this {
    const parsed = AIServiceConfigSchema.deepPartial().safeParse(options);
    if (!parsed.success) {
      throw aiErrors.creators.InvalidConfig({
        detail: `Nieprawidłowa konfiguracja: ${parsed.error.message}`,
        meta: { errors: parsed.error.flatten() },
        cause: parsed.error,
      });
    }

    const cfg = parsed.data;
    if (cfg.defaultModel) this.currentModel = cfg.defaultModel;
    if (cfg.defaultParams) this.setParameters(cfg.defaultParams);
    if (cfg.timeoutMs) this.timeoutMs = cfg.timeoutMs;
    if (cfg.retryPolicy) this.retryPolicy = cfg.retryPolicy as RetryPolicy;
    if (cfg.logger) this.logger = cfg.logger;
    if (cfg.requestHeaders) this.headers = { ...this.headers, ...cfg.requestHeaders };

    return this;
  }

  /**
   * Główna metoda - generowanie obiektu ze schemą
   */
  async generateObject<T>(overrides?: GenerateObjectOptions<T>): Promise<T> {
    try {
      // Walidacja wejścia
      this.validateInput();

      // Budowanie promptów
      const system = this.buildSystemPrompt();
      const user = this.buildUserPrompt();

      // Schemat - overrides lub domyślny
      const schema = overrides?.schema ?? this.requireSchema();

      // Model - overrides lub domyślny
      const model = overrides?.model ?? this.currentModel;

      // Parametry - merge overrides z domyślnymi
      const params = {
        ...this.currentParams,
        ...(overrides?.params ?? {}),
      };

      // Timeout - overrides lub domyślny
      const timeoutMs = overrides?.timeoutMs ?? this.timeoutMs;

      // Prompty z overrides (jeśli podane)
      const finalSystem = overrides?.system ?? system;
      const finalUser = overrides?.user ?? user;

      // Wywołanie z retry i timeout
      const result = await this.retryWithBackoff(async () => {
        return this.callGenerateObject<T>({
          model,
          system: finalSystem,
          user: finalUser,
          schema,
          params,
          timeoutMs,
        });
      });

      // Dodatkowa walidacja output
      const validated = this.validateOutput(schema, result);

      this.logger?.info("AIService.generateObject success", { model, schema: schema instanceof z.ZodType });

      return validated;
    } catch (err) {
      // Jeśli to już jest domenowy błąd - propaguj
      if (err && typeof err === "object" && "code" in err && "status" in err) {
        throw err;
      }

      // Mapowanie nieznanych błędów
      this.logger?.error("AIService.generateObject unexpected error", {
        error: err instanceof Error ? err.message : String(err),
      });

      throw aiErrors.creators.ValidationFailed({
        detail: "Unexpected error during generateObject",
        cause: err,
      });
    }
  }

  /**
   * Healthcheck - szybki ping
   */
  async isHealthy(): Promise<boolean> {
    try {
      const miniTimeout = Math.min(3000, this.timeoutMs);
      const testModel = this.provider(this.currentModel);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), miniTimeout);

      try {
        // Bardzo krótkie zapytanie bez structured output
        await generateObject({
          model: testModel,
          system: "Odpowiadaj bardzo krótko (1-2 słowa).",
          prompt: "Czy jesteś online? Odpowiedź: yes lub no",
          schema: z.object({
            status: z.enum(["yes", "no"]),
          }),
        });

        return true;
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      return false;
    }
  }

  /**
   * PRIVATE: Zbudowanie finalnego system prompt
   */
  private buildSystemPrompt(): string {
    if (!this.systemPrompt) {
      return "Jesteś asystentem. Odpowiadaj WYŁĄCZNIE w JSON zgodnym ze schematem.";
    }
    if (this.systemPrompt.length > 5000) {
      return this.systemPrompt.slice(0, 5000);
    }
    return this.systemPrompt;
  }

  /**
   * PRIVATE: Zbudowanie finalnego user prompt
   */
  private buildUserPrompt(): string {
    if (!this.userPrompt) {
      throw aiErrors.creators.InvalidInput({
        detail: "User prompt jest wymagany",
      });
    }
    if (this.userPrompt.length > 20000) {
      return this.userPrompt.slice(0, 20000);
    }
    return this.userPrompt;
  }

  /**
   * PRIVATE: Wymaganie schematu - rzuca błąd jeśli brak
   */
  private requireSchema(): z.ZodType<unknown> {
    if (!this.schema) {
      throw aiErrors.creators.SchemaError({
        detail: "Schema jest wymagana dla generateObject",
      });
    }
    return this.schema;
  }

  /**
   * PRIVATE: Pobranie instancji modelu
   */
  private getModel() {
    return this.provider(this.currentModel);
  }

  /**
   * PRIVATE: Pobranie finalnych nagłówków
   */
  private getRequestHeaders(): Record<string, string> {
    // Sanity check - whitelist znanych nagłówków
    const allowed = ["HTTP-Referer", "X-Title", "Authorization"];
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(this.headers)) {
      if (allowed.includes(key) || key.startsWith("X-")) {
        result[key] = String(value);
      }
    }

    return result;
  }

  /**
   * PRIVATE: Wywołanie generateObject z timeout i AbortController
   */
  private async callGenerateObject<T>(args: {
    model: string;
    system: string;
    user: string;
    schema: z.ZodType<T>;
    params: AIModelParams;
    timeoutMs: number;
  }): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), args.timeoutMs);

    try {
      const model = this.provider(args.model);

      this.logger?.debug("AIService.callGenerateObject starting", {
        model: args.model,
        timeoutMs: args.timeoutMs,
      });

      const { object } = await generateObject({
        model,
        system: args.system,
        prompt: args.user,
        schema: args.schema,
        ...(args.params.temperature !== undefined && { temperature: args.params.temperature }),
        ...(args.params.maxTokens !== undefined && { maxTokens: args.params.maxTokens }),
        ...(args.params.topP !== undefined && { topP: args.params.topP }),
        ...(args.params.seed !== undefined && { seed: args.params.seed }),
      });

      return object as T;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw aiErrors.creators.Timeout({
          detail: `Request timeout po ${args.timeoutMs}ms`,
          meta: { timeoutMs: args.timeoutMs, model: args.model },
        });
      }

      // Mapowanie błędów od providera
      if (err && typeof err === "object") {
        const errObj = err as Record<string, unknown>;

        // Rate limit
        if (errObj.status === 429 || errObj.code === "rate_limit_exceeded") {
          throw aiErrors.creators.RateLimited({
            detail: errObj.message ?? "Rate limit exceeded",
            meta: { status: errObj.status, code: errObj.code },
            cause: err,
          });
        }

        // 5xx errors
        if (errObj.status && errObj.status >= 500) {
          if (errObj.status === 503) {
            throw aiErrors.creators.ServiceUnavailable({
              detail: errObj.message ?? "Service unavailable",
              meta: { status: errObj.status },
              cause: err,
            });
          }
          throw aiErrors.creators.ProviderError({
            detail: errObj.message ?? "Provider error",
            meta: { status: errObj.status },
            cause: err,
          });
        }

        // 4xx errors (400, 401, 403, etc.)
        if (errObj.status && errObj.status >= 400 && errObj.status < 500) {
          if (errObj.status === 401) {
            throw aiErrors.creators.Unauthorized({
              detail: errObj.message ?? "Unauthorized",
              cause: err,
            });
          }
          if (errObj.status === 403) {
            throw aiErrors.creators.Forbidden({
              detail: errObj.message ?? "Forbidden",
              cause: err,
            });
          }
          throw aiErrors.creators.BadRequest({
            detail: errObj.message ?? "Bad request",
            meta: { status: errObj.status },
            cause: err,
          });
        }
      }

      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * PRIVATE: Retry z exponential backoff
   */
  private async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Record<string, unknown> | undefined;

    for (let attempt = 0; attempt <= this.retryPolicy.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;

        // Nie retry domenowych błędów poza retryable
        if (err && typeof err === "object" && "code" in err) {
          const code = (err as any).code;
          const retryable = ["ai/rate-limited", "ai/timeout", "ai/provider-error", "ai/service-unavailable"];

          if (!retryable.includes(code)) {
            throw err;
          }
        }

        // Jeśli to ostatni attempt - rzuć błąd exhausted
        if (attempt === this.retryPolicy.maxRetries) {
          throw aiErrors.creators.RetryExhausted({
            detail: `Retry exhausted po ${this.retryPolicy.maxRetries} próbach`,
            meta: {
              maxRetries: this.retryPolicy.maxRetries,
              lastError: err instanceof Error ? err.message : String(err),
            },
            cause: err,
          });
        }

        // Obliczenie backoff
        const delay = this.calculateBackoff(attempt);
        this.logger?.warn("AIService.retryWithBackoff retrying", {
          attempt: attempt + 1,
          maxRetries: this.retryPolicy.maxRetries,
          nextDelayMs: delay,
        });

        // Sleep
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * PRIVATE: Obliczenie exponential backoff z jitter
   */
  private calculateBackoff(attempt: number): number {
    const base = Math.min(this.retryPolicy.baseDelayMs * Math.pow(2, attempt), this.retryPolicy.maxDelayMs);

    if (!this.retryPolicy.jitter) {
      return base;
    }

    // Jitter - losowy offset
    const jitterAmount = base * 0.1;
    return base + Math.random() * jitterAmount;
  }

  /**
   * PRIVATE: Walidacja wejścia (prompty, schema, etc.)
   */
  private validateInput(): void {
    if (!this.systemPrompt && !this.userPrompt) {
      throw aiErrors.creators.InvalidInput({
        detail: "System prompt lub user prompt jest wymagany",
      });
    }

    if (!this.schema) {
      throw aiErrors.creators.InvalidInput({
        detail: "Schema jest wymagana",
      });
    }

    if (!this.currentModel) {
      throw aiErrors.creators.InvalidInput({
        detail: "Model jest wymagany",
      });
    }
  }

  /**
   * PRIVATE: Walidacja output przez Zod (druga bariera)
   */
  private validateOutput<T>(schema: z.ZodType<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw aiErrors.creators.ValidationFailed({
          detail: "Output validation failed",
          meta: { errors: err.flatten() },
          cause: err as Record<string, unknown>,
        });
      }
      throw err;
    }
  }

  /**
   * PRIVATE: Maskowanie wrażliwych danych w logach
   */
  private maskSensitiveData(input: string): string {
    if (!input) return input;

    // Maskowanie email
    const emailMasked = input.replace(/[\w.-]+@[\w.-]+\.\w+/g, "[EMAIL]");

    // Maskowanie długich ciągów (prompty)
    if (emailMasked.length > 100) {
      return `${emailMasked.slice(0, 50)}...[MASKED]...${emailMasked.slice(-20)}`;
    }

    return emailMasked;
  }
}
