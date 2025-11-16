/**
 * src/pages/api/__tests__/error-handling.test.ts
 *
 * Testy integracyjne dla RFC 7807 error handling
 * Weryfikuje format problem+json i mapowanie błędów
 */

import { describe, it, expect } from "vitest";
import { isDomainError } from "@/lib/errors/index";
import { defineDomain } from "@/lib/errors/registry";
import { fromZod } from "@/lib/errors/map-zod";
import { flashcardErrors } from "@/services/flashcard/flashcard.errors";
import { generationErrors } from "@/services/generation/generation.errors";
import { authErrors } from "@/services/auth/auth.errors";
import { z } from "zod";

describe("Error Handling Architecture", () => {
  describe("isDomainError()", () => {
    it("should recognize DomainError", () => {
      const err = flashcardErrors.creators.NotFound({
        detail: "Test",
      });
      expect(isDomainError(err)).toBe(true);
    });

    it("should reject non-DomainError objects", () => {
      expect(isDomainError(new Error("test"))).toBe(false);
      expect(isDomainError({})).toBe(false);
      expect(isDomainError(null)).toBe(false);
    });
  });

  describe("defineDomain()", () => {
    it("should create error creators", () => {
      const err = flashcardErrors.creators.NotFound({
        detail: "Card not found",
        meta: { cardId: "123" },
      });

      expect(err.code).toBe("flashcard/not-found");
      expect(err.status).toBe(404);
      expect(err.domain).toBe("flashcard");
      expect(err.title).toBe("errors.flashcard.not_found");
      expect(err.message).toBe("Card not found");
      expect(err.meta?.cardId).toBe("123");
    });

    it("should convert to ProblemDetails", () => {
      const err = flashcardErrors.creators.NotFound({
        detail: "Card not found",
      });

      const problem = flashcardErrors.toProblem(err, "/api/flashcards");

      expect(problem.code).toBe("flashcard/not-found");
      expect(problem.status).toBe(404);
      expect(problem.title).toBe("errors.flashcard.not_found");
      expect(problem.detail).toBe("Card not found");
      expect(problem.instance).toBe("/api/flashcards");
      expect(problem.type).toContain("flashcard/not-found");
    });
  });

  describe("Domain Errors", () => {
    it("flashcard domain should have correct errors", () => {
      const errors = [
        { creator: "NotFound", code: "flashcard/not-found", status: 404 },
        { creator: "ValidationFailed", code: "flashcard/validation-failed", status: 400 },
        { creator: "DatabaseError", code: "flashcard/database-error", status: 500 },
        { creator: "GenerationNotFound", code: "flashcard/generation-not-found", status: 404 },
        { creator: "CollectionNotFound", code: "flashcard/collection-not-found", status: 404 },
        { creator: "CollectionAccessDenied", code: "flashcard/collection-access-denied", status: 404 },
        { creator: "SchedulerUnavailable", code: "flashcard/scheduler-unavailable", status: 503 },
      ];

      errors.forEach(({ creator, code, status }) => {
        const err = (flashcardErrors.creators as any)[creator]({ detail: "test" });
        expect(err.code).toBe(code);
        expect(err.status).toBe(status);
      });
    });

    it("generation domain should have correct errors", () => {
      const errors = [
        { creator: "ValidationFailed", code: "generation/validation-failed", status: 400 },
        { creator: "ContentBlocked", code: "generation/content-blocked", status: 422 },
        { creator: "ModelUnavailable", code: "generation/model-unavailable", status: 503 },
        { creator: "ProviderError", code: "generation/provider-error", status: 502 },
        { creator: "TimeoutError", code: "generation/timeout", status: 504 },
      ];

      errors.forEach(({ creator, code, status }) => {
        const err = (generationErrors.creators as any)[creator]({ detail: "test" });
        expect(err.code).toBe(code);
        expect(err.status).toBe(status);
      });
    });

    it("auth domain should have correct errors", () => {
      const errors = [
        { creator: "Unauthorized", code: "auth/unauthorized", status: 401 },
        { creator: "Forbidden", code: "auth/forbidden", status: 403 },
        { creator: "InvalidCredentials", code: "auth/invalid-credentials", status: 401 },
      ];

      errors.forEach(({ creator, code, status }) => {
        const err = (authErrors.creators as any)[creator]({ detail: "test" });
        expect(err.code).toBe(code);
        expect(err.status).toBe(status);
      });
    });
  });

  describe("Zod Mapper", () => {
    it("should map Zod validation errors", () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number().int().positive(),
      });

      const result = schema.safeParse({ name: "ab", age: -1 });

      expect(result.success).toBe(false);
      if (!result.success) {
        const err = fromZod(result.error);

        expect(err.code).toBe("flashcard/validation-failed");
        expect(err.status).toBe(400);
        expect(err.meta?.fieldErrors).toBeDefined();
      }
    });
  });

  describe("Error Metadata", () => {
    it("should include meta for debugging", () => {
      const err = flashcardErrors.creators.NotFound({
        detail: "Not found",
        meta: { cardId: "abc123", userId: "user456" },
      });

      expect(err.meta).toEqual({
        cardId: "abc123",
        userId: "user456",
      });
    });

    it("should preserve cause for server-side logging", () => {
      const cause = new Error("Database connection failed");
      const err = flashcardErrors.creators.DatabaseError({
        detail: "Failed to save",
        cause,
      });

      expect(err.cause).toBe(cause);
    });

    it("should not serialize cause to JSON", () => {
      const cause = new Error("DB error");
      const err = flashcardErrors.creators.DatabaseError({
        detail: "Failed",
        cause,
      });

      const json = JSON.stringify(err);
      expect(json).not.toContain("cause");
      expect(json).toContain("message");
      expect(json).toContain("code");
    });
  });
});
