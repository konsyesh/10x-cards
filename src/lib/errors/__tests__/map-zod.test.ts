import { describe, it, expect } from "vitest";
import { z } from "zod";
import { fromZod, fromZodAuth } from "../map-zod";

describe("lib/errors/map-zod.ts", () => {
  describe("fromZod", () => {
    it("should map ZodError to flashcard/validation-failed", () => {
      const schema = z.object({
        front: z.string().min(1),
        back: z.string().min(1),
      });

      const result = schema.safeParse({ front: "", back: "" });

      if (!result.success) {
        const error = fromZod(result.error);

        expect(error.domain).toBe("flashcard");
        expect(error.code).toBe("flashcard/validation-failed");
        expect(error.status).toBe(400);
        expect(error.title).toBe("errors.flashcard.validation_failed");
        expect(error.meta).toBeDefined();
        expect(error.meta?.formErrors || error.meta?.fieldErrors).toBeDefined();
      }
    });

    it("should include flatten() in meta", () => {
      const schema = z.object({
        front: z.string().min(5, "Front must be at least 5 characters"),
        back: z.string().min(10, "Back must be at least 10 characters"),
      });

      const result = schema.safeParse({ front: "abc", back: "def" });

      if (!result.success) {
        const error = fromZod(result.error);

        expect(error.meta).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const flatten = result.error.flatten();
        expect(error.meta?.formErrors || error.meta?.fieldErrors).toBeDefined();
      }
    });

    it("should preserve cause", () => {
      const schema = z.object({
        value: z.string().min(1),
      });

      const result = schema.safeParse({ value: "" });

      if (!result.success) {
        const error = fromZod(result.error);

        expect(error.cause).toBe(result.error);
      }
    });

    it("should set detail message", () => {
      const schema = z.object({
        value: z.string().min(1),
      });

      const result = schema.safeParse({ value: "" });

      if (!result.success) {
        const error = fromZod(result.error);

        expect(error.message).toBe("Sprawdź pola formularza");
      }
    });
  });

  describe("fromZodAuth", () => {
    it("should map ZodError to auth/validation-failed", () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });

      const result = schema.safeParse({ email: "invalid", password: "123" });

      if (!result.success) {
        const error = fromZodAuth(result.error);

        expect(error.domain).toBe("auth");
        expect(error.code).toBe("auth/validation-failed");
        expect(error.status).toBe(400);
        expect(error.title).toBe("errors.auth.validation_failed");
        expect(error.meta).toBeDefined();
      }
    });

    it("should include flatten() in meta", () => {
      const schema = z.object({
        email: z.string().email("Invalid email"),
        password: z.string().min(8, "Password too short"),
      });

      const result = schema.safeParse({ email: "invalid", password: "123" });

      if (!result.success) {
        const error = fromZodAuth(result.error);

        expect(error.meta).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const flatten = result.error.flatten();
        expect(error.meta?.formErrors || error.meta?.fieldErrors).toBeDefined();
      }
    });

    it("should preserve cause", () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const result = schema.safeParse({ email: "invalid" });

      if (!result.success) {
        const error = fromZodAuth(result.error);

        expect(error.cause).toBe(result.error);
      }
    });

    it("should set detail message", () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const result = schema.safeParse({ email: "invalid" });

      if (!result.success) {
        const error = fromZodAuth(result.error);

        expect(error.message).toBe("Sprawdź pola formularza");
      }
    });
  });
});
