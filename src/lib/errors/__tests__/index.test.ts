import { describe, it, expect } from "vitest";
import { isDomainError, createDomainError, type DomainError } from "../index";

describe("lib/errors/index.ts", () => {
  describe("isDomainError", () => {
    it("should return true for valid DomainError", () => {
      const error: DomainError = {
        domain: "flashcard",
        code: "flashcard/not-found",
        status: 404,
        title: "errors.flashcard.not_found",
      };

      expect(isDomainError(error)).toBe(true);
    });

    it("should return false for plain Error", () => {
      const error = new Error("Something went wrong");
      expect(isDomainError(error)).toBe(false);
    });

    it("should return false for object without code", () => {
      const error = { status: 404, title: "Not found" };
      expect(isDomainError(error)).toBe(false);
    });

    it("should return false for object without status", () => {
      const error = { code: "flashcard/not-found", title: "Not found" };
      expect(isDomainError(error)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isDomainError(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isDomainError(undefined)).toBe(false);
    });

    it("should return false for string", () => {
      expect(isDomainError("error")).toBe(false);
    });
  });

  describe("createDomainError", () => {
    it("should create DomainError with cause hidden from JSON", () => {
      const cause = new Error("Original error");
      const error: DomainError = {
        domain: "flashcard",
        code: "flashcard/not-found",
        status: 404,
        title: "errors.flashcard.not_found",
        message: "Flashcard not found",
        cause,
      };

      const created = createDomainError(error);

      // Cause should be present but not enumerable
      expect(created.cause).toBe(cause);
      expect(Object.keys(created)).not.toContain("cause");

      // JSON serialization should exclude cause
      const json = JSON.parse(JSON.stringify(created));
      expect(json.cause).toBeUndefined();
      expect(json.code).toBe("flashcard/not-found");
      expect(json.status).toBe(404);
    });

    it("should preserve all other properties", () => {
      const error: DomainError = {
        domain: "generation",
        code: "generation/provider-error",
        status: 500,
        title: "errors.generation.provider_error",
        message: "Provider error occurred",
        meta: { requestId: "req-123" },
      };

      const created = createDomainError(error);
      const json = JSON.parse(JSON.stringify(created));

      expect(json.domain).toBe("generation");
      expect(json.code).toBe("generation/provider-error");
      expect(json.status).toBe(500);
      expect(json.title).toBe("errors.generation.provider_error");
      expect(json.message).toBe("Provider error occurred");
      expect(json.meta).toEqual({ requestId: "req-123" });
    });

    it("should handle error without cause", () => {
      const error: DomainError = {
        domain: "auth",
        code: "auth/unauthorized",
        status: 401,
        title: "errors.auth.unauthorized",
      };

      const created = createDomainError(error);
      const json = JSON.parse(JSON.stringify(created));

      expect(json.cause).toBeUndefined();
      expect(json.code).toBe("auth/unauthorized");
    });
  });
});

