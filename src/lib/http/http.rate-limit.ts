/**
 * In-memory rate limiter for SSR endpoints.
 * - Single-process only (not distributed). For multi-instance deployments use Redis.
 */

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export interface RateLimiter {
  check(key: string): boolean; // returns true if allowed
  get(key: string): RateLimitEntry | undefined;
  reset(key: string): void;
}

export function createInMemoryRateLimiter(opts: RateLimitOptions): RateLimiter {
  const store = new Map<string, RateLimitEntry>();

  return {
    check(key: string) {
      const now = Date.now();
      const existing = store.get(key);

      if (!existing || now > existing.resetAt) {
        store.set(key, { count: 1, resetAt: now + opts.windowMs });
        return true;
      }

      if (existing.count >= opts.max) return false;
      existing.count += 1;
      return true;
    },
    get(key: string) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.resetAt) return undefined;
      return entry;
    },
    reset(key: string) {
      store.delete(key);
    },
  };
}

/**
 * Best-effort client IP extraction for common proxies.
 */
export function getClientIp(headers: Headers): string {
  const candidates = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "true-client-ip",
    "fastly-client-ip",
    "x-client-ip",
    "x-cluster-client-ip",
    "forwarded",
  ];

  for (const h of candidates) {
    const v = headers.get(h);
    if (!v) continue;

    if (h === "forwarded") {
      const m = /for=([^;]+)/i.exec(v);
      if (m && m[1]) {
        return m[1].replace(/^"|"$/g, "").split(",")[0].trim();
      }
    } else {
      return v.split(",")[0].trim();
    }
  }

  return "unknown";
}

/**
 * Helpers to build limiter keys.
 */
export function makeKeyIp(headers: Headers): string {
  return getClientIp(headers);
}

export function makeKeyIpEmail(headers: Headers, email: string): string {
  return `${getClientIp(headers)}:${email.toLowerCase()}`;
}
