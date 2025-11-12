import type { Logger as AIServiceLogger } from "@/services/ai/ai.service";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface CreateLoggerOptions {
  context: string;
  requestId?: string;
  redactKeys?: string[];
  includeStack?: boolean;
}

const ENV =
  typeof import.meta !== "undefined" && (import.meta as any).env
    ? (import.meta as any).env
    : { MODE: process.env.NODE_ENV };

const isDev = ENV?.MODE !== "production";

const DEFAULT_REDACT_KEYS = ["apikey", "password", "secret", "authorization", "openrouter_api_key"];

export class AppLogger implements AIServiceLogger {
  private readonly context: string;
  private readonly requestId?: string;
  private readonly redactKeys: string[];
  private readonly includeStack: boolean;

  constructor(opts: CreateLoggerOptions) {
    this.context = opts.context;
    this.requestId = opts.requestId;
    this.redactKeys = [...new Set([...(opts.redactKeys ?? []), ...DEFAULT_REDACT_KEYS])].map((k) => k.toLowerCase());
    this.includeStack = opts.includeStack ?? isDev;
  }

  debug(msg: string, meta?: unknown) {
    this.emit("debug", msg, meta);
  }

  info(msg: string, meta?: unknown) {
    this.emit("info", msg, meta);
  }

  warn(msg: string, meta?: unknown) {
    this.emit("warn", msg, meta);
  }

  error(msg: string, meta?: unknown) {
    this.emit("error", msg, meta);
  }

  private emit(level: LogLevel, msg: string, meta?: unknown) {
    const payload = {
      ts: new Date().toISOString(),
      level,
      context: this.context,
      requestId: this.requestId,
      message: this.sanitizeString(msg),
      ...(meta ? { metadata: this.sanitize(meta) } : {}),
    };

    if (isDev) {
      // Czytelniejszy output na DEV
      const output = { ...payload };
      if (level === "error") console.error(output);
      else if (level === "warn") console.warn(output);
      else if (level === "info") console.info(output);
      else console.debug(output);
      return;
    }

    // PROD: pojedyncza linia JSON ułatwia parsowanie
    const line = JSON.stringify(payload);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else if (level === "info") console.info(line);
    else console.debug(line);
  }

  private redactByKey(key: string, value: unknown): unknown {
    const lower = key.toLowerCase();
    return this.redactKeys.some((sensitiveKey) => lower.includes(sensitiveKey)) ? "[REDACTED]" : value;
  }

  private sanitizeString(input: string): string {
    const emailMasked = input.replace(/[\w.-]+@[\w.-]+\.\w+/g, "[EMAIL]");
    return emailMasked.length > 100
      ? `${emailMasked.slice(0, 50)}...[MASKED]...${emailMasked.slice(-20)}`
      : emailMasked;
  }

  private sanitize(input: unknown, seen = new WeakSet<object>()): unknown {
    if (typeof input === "string") return this.sanitizeString(input);
    if (Array.isArray(input)) return input.map((value) => this.sanitize(value, seen));
    if (input && typeof input === "object") {
      if (seen.has(input as object)) return "[CIRCULAR]";
      seen.add(input as object);

      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        const redacted = this.redactByKey(key, value);
        out[key] = this.sanitize(redacted, seen);
      }

      if (this.includeStack && (input as any) instanceof Error) {
        const err = input as Error;
        out.name = err.name;
        out.message = this.sanitizeString(err.message ?? "");
        if (err.stack) out.stack = err.stack;
      }

      return out;
    }

    return input;
  }
}

export function createLogger(opts: CreateLoggerOptions): AIServiceLogger {
  return new AppLogger(opts);
}

export function logAIWarnings(
  logger: AIServiceLogger | undefined,
  warnings: unknown[] | undefined,
  meta?: Record<string, unknown>
) {
  if (!logger || !warnings?.length) return;
  logger.warn("AIService warnings", {
    count: warnings.length,
    warnings,
    ...(meta ?? {}),
  });
}
