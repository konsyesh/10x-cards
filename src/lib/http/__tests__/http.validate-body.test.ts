import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateBody, validateAuthBody } from "../http.validate-body";
import { isDomainError } from "@/lib/errors/index";

describe("lib/http/http.validate-body.ts", () => {
  describe("validateBody", () => {
    it("should return validated data on success", async () => {
      const schema = z.object({
        front: z.string().min(1),
        back: z.string().min(1),
      });

      const request = new Request("http://localhost/api/test", {
        method: "POST",
        body: JSON.stringify({ front: "Question?", back: "Answer" }),
        headers: { "content-type": "application/json" },
      });

      const result = await validateBody(request, schema);

      expect(result).toEqual({ front: "Question?", back: "Answer" });
    });

    it("should throw DomainError for invalid JSON", async () => {
      const schema = z.object({
        value: z.string(),
      });

      const request = new Request("http://localhost/api/test", {
        method: "POST",
        body: "invalid json",
        headers: { "content-type": "application/json" },
      });

      await expect(validateBody(request, schema)).rejects.toThrow();

      try {
        await validateBody(request, schema);
      } catch (error) {
        expect(isDomainError(error)).toBe(true);
        if (isDomainError(error)) {
          expect(error.code).toBe("flashcard/validation-failed");
          expect(error.status).toBe(400);
        }
      }
    });

    it("should throw DomainError for Zod validation failure", async () => {
      const schema = z.object({
        front: z.string().min(5),
        back: z.string().min(10),
      });

      const request = new Request("http://localhost/api/test", {
        method: "POST",
        body: JSON.stringify({ front: "abc", back: "def" }),
        headers: { "content-type": "application/json" },
      });

      await expect(validateBody(request, schema)).rejects.toThrow();

      try {
        await validateBody(request, schema);
      } catch (error) {
        expect(isDomainError(error)).toBe(true);
        if (isDomainError(error)) {
          expect(error.code).toBe("flashcard/validation-failed");
          expect(error.status).toBe(400);
          expect(error.meta).toBeDefined();
        }
      }
    });

    it("should include Zod flatten() in meta", async () => {
      const schema = z.object({
        front: z.string().min(5, "Front too short"),
        back: z.string().min(10, "Back too short"),
      });

      const request = new Request("http://localhost/api/test", {
        method: "POST",
        body: JSON.stringify({ front: "abc", back: "def" }),
        headers: { "content-type": "application/json" },
      });

      try {
        await validateBody(request, schema);
      } catch (error) {
        if (isDomainError(error)) {
          expect(error.meta).toBeDefined();
          expect(error.meta?.formErrors || error.meta?.fieldErrors).toBeDefined();
        }
      }
    });
  });

  describe("validateAuthBody", () => {
    it("should return validated data on success", async () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });

      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "password123" }),
        headers: { "content-type": "application/json" },
      });

      const result = await validateAuthBody(request, schema);

      expect(result).toEqual({ email: "test@example.com", password: "password123" });
    });

    it("should throw DomainError for invalid JSON", async () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: "invalid json",
        headers: { "content-type": "application/json" },
      });

      await expect(validateAuthBody(request, schema)).rejects.toThrow();

      try {
        await validateAuthBody(request, schema);
      } catch (error) {
        expect(isDomainError(error)).toBe(true);
        if (isDomainError(error)) {
          expect(error.code).toBe("auth/validation-failed");
          expect(error.status).toBe(400);
        }
      }
    });

    it("should throw DomainError for Zod validation failure", async () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });

      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "invalid", password: "123" }),
        headers: { "content-type": "application/json" },
      });

      await expect(validateAuthBody(request, schema)).rejects.toThrow();

      try {
        await validateAuthBody(request, schema);
      } catch (error) {
        expect(isDomainError(error)).toBe(true);
        if (isDomainError(error)) {
          expect(error.code).toBe("auth/validation-failed");
          expect(error.status).toBe(400);
          expect(error.meta).toBeDefined();
        }
      }
    });

    it("should include Zod flatten() in meta", async () => {
      const schema = z.object({
        email: z.string().email("Invalid email"),
        password: z.string().min(8, "Password too short"),
      });

      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "invalid", password: "123" }),
        headers: { "content-type": "application/json" },
      });

      try {
        await validateAuthBody(request, schema);
      } catch (error) {
        if (isDomainError(error)) {
          expect(error.meta).toBeDefined();
          expect(error.meta?.formErrors || error.meta?.fieldErrors).toBeDefined();
        }
      }
    });
  });
});

