import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createInMemoryRateLimiter, getClientIp, makeKeyIp, makeKeyIpEmail } from "../http.rate-limit";

describe("lib/http/http.rate-limit.ts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createInMemoryRateLimiter", () => {
    it("should allow first request", () => {
      const limiter = createInMemoryRateLimiter({ windowMs: 60000, max: 5 });
      expect(limiter.check("key1")).toBe(true);
    });

    it("should allow requests within limit", () => {
      const limiter = createInMemoryRateLimiter({ windowMs: 60000, max: 5 });

      expect(limiter.check("key1")).toBe(true);
      expect(limiter.check("key1")).toBe(true);
      expect(limiter.check("key1")).toBe(true);
      expect(limiter.check("key1")).toBe(true);
      expect(limiter.check("key1")).toBe(true);
    });

    it("should block requests exceeding limit", () => {
      const limiter = createInMemoryRateLimiter({ windowMs: 60000, max: 5 });

      // Make 5 requests (all allowed)
      for (let i = 0; i < 5; i++) {
        expect(limiter.check("key1")).toBe(true);
      }

      // 6th request should be blocked
      expect(limiter.check("key1")).toBe(false);
    });

    it("should reset after window expires", () => {
      const limiter = createInMemoryRateLimiter({ windowMs: 60000, max: 5 });

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        expect(limiter.check("key1")).toBe(true);
      }

      // 6th should be blocked
      expect(limiter.check("key1")).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(61000);

      // Should be allowed again
      expect(limiter.check("key1")).toBe(true);
    });

    it("should track different keys independently", () => {
      const limiter = createInMemoryRateLimiter({ windowMs: 60000, max: 5 });

      // Fill up key1
      for (let i = 0; i < 5; i++) {
        expect(limiter.check("key1")).toBe(true);
      }

      // key2 should still be allowed
      expect(limiter.check("key2")).toBe(true);
      expect(limiter.check("key2")).toBe(true);
    });

    describe("get", () => {
      it("should return entry for active key", () => {
        const limiter = createInMemoryRateLimiter({ windowMs: 60000, max: 5 });
        limiter.check("key1");

        const entry = limiter.get("key1");

        expect(entry).toBeDefined();
        expect(entry?.count).toBe(1);
        expect(entry?.resetAt).toBeGreaterThan(Date.now());
      });

      it("should return undefined for non-existent key", () => {
        const limiter = createInMemoryRateLimiter({ windowMs: 60000, max: 5 });
        expect(limiter.get("key1")).toBeUndefined();
      });

      it("should return undefined for expired entry", () => {
        const limiter = createInMemoryRateLimiter({ windowMs: 60000, max: 5 });
        limiter.check("key1");

        vi.advanceTimersByTime(61000);

        expect(limiter.get("key1")).toBeUndefined();
      });
    });

    describe("reset", () => {
      it("should remove entry", () => {
        const limiter = createInMemoryRateLimiter({ windowMs: 60000, max: 5 });
        limiter.check("key1");

        expect(limiter.get("key1")).toBeDefined();

        limiter.reset("key1");

        expect(limiter.get("key1")).toBeUndefined();
      });

      it("should allow new requests after reset", () => {
        const limiter = createInMemoryRateLimiter({ windowMs: 60000, max: 5 });

        // Fill up
        for (let i = 0; i < 5; i++) {
          limiter.check("key1");
        }

        expect(limiter.check("key1")).toBe(false);

        // Reset
        limiter.reset("key1");

        // Should be allowed again
        expect(limiter.check("key1")).toBe(true);
      });
    });
  });

  describe("getClientIp", () => {
    it("should extract IP from x-forwarded-for", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "192.168.1.1, 10.0.0.1");

      const ip = getClientIp(headers);

      expect(ip).toBe("192.168.1.1");
    });

    it("should extract IP from x-real-ip", () => {
      const headers = new Headers();
      headers.set("x-real-ip", "192.168.1.1");

      const ip = getClientIp(headers);

      expect(ip).toBe("192.168.1.1");
    });

    it("should extract IP from cf-connecting-ip", () => {
      const headers = new Headers();
      headers.set("cf-connecting-ip", "192.168.1.1");

      const ip = getClientIp(headers);

      expect(ip).toBe("192.168.1.1");
    });

    it("should extract IP from forwarded header", () => {
      const headers = new Headers();
      headers.set("forwarded", "for=192.168.1.1;proto=http");

      const ip = getClientIp(headers);

      expect(ip).toBe("192.168.1.1");
    });

    it("should return first IP from comma-separated list", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "192.168.1.1, 10.0.0.1, 172.16.0.1");

      const ip = getClientIp(headers);

      expect(ip).toBe("192.168.1.1");
    });

    it("should return 'unknown' if no IP headers found", () => {
      const headers = new Headers();
      const ip = getClientIp(headers);

      expect(ip).toBe("unknown");
    });

    it("should prioritize x-forwarded-for over other headers", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "192.168.1.1");
      headers.set("x-real-ip", "10.0.0.1");

      const ip = getClientIp(headers);

      expect(ip).toBe("192.168.1.1");
    });
  });

  describe("makeKeyIp", () => {
    it("should return client IP", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "192.168.1.1");

      const key = makeKeyIp(headers);

      expect(key).toBe("192.168.1.1");
    });
  });

  describe("makeKeyIpEmail", () => {
    it("should combine IP and email", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "192.168.1.1");

      const key = makeKeyIpEmail(headers, "test@example.com");

      expect(key).toBe("192.168.1.1:test@example.com");
    });

    it("should lowercase email", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "192.168.1.1");

      const key = makeKeyIpEmail(headers, "TEST@EXAMPLE.COM");

      expect(key).toBe("192.168.1.1:test@example.com");
    });
  });
});
