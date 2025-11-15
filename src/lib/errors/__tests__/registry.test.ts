import { describe, it, expect } from "vitest";
import { defineDomain } from "../registry";
import type { DomainError } from "../index";

describe("lib/errors/registry.ts", () => {
  describe("defineDomain", () => {
    it("should create error creators for domain", () => {
      const TestDomain = defineDomain("test", {
        NotFound: {
          code: "test/not-found",
          status: 404,
          title: "errors.test.not_found",
        },
        ValidationFailed: {
          code: "test/validation-failed",
          status: 400,
          title: "errors.test.validation_failed",
        },
      });

      expect(TestDomain.creators).toBeDefined();
      expect(TestDomain.creators.NotFound).toBeDefined();
      expect(TestDomain.creators.ValidationFailed).toBeDefined();
    });

    it("should create DomainError with correct structure", () => {
      const TestDomain = defineDomain("test", {
        NotFound: {
          code: "test/not-found",
          status: 404,
          title: "errors.test.not_found",
        },
      });

      const error = TestDomain.creators.NotFound({
        detail: "Resource not found",
        meta: { resourceId: 123 },
      });

      expect(error.domain).toBe("test");
      expect(error.code).toBe("test/not-found");
      expect(error.status).toBe(404);
      expect(error.title).toBe("errors.test.not_found");
      expect(error.message).toBe("Resource not found");
      expect(error.meta).toEqual({ resourceId: 123 });
    });

    it("should create DomainError without optional fields", () => {
      const TestDomain = defineDomain("test", {
        NotFound: {
          code: "test/not-found",
          status: 404,
          title: "errors.test.not_found",
        },
      });

      const error = TestDomain.creators.NotFound();

      expect(error.domain).toBe("test");
      expect(error.code).toBe("test/not-found");
      expect(error.status).toBe(404);
      expect(error.message).toBeUndefined();
      expect(error.meta).toBeUndefined();
    });

    it("should preserve cause in DomainError", () => {
      const TestDomain = defineDomain("test", {
        Error: {
          code: "test/error",
          status: 500,
          title: "errors.test.error",
        },
      });

      const originalError = new Error("Original");
      const error = TestDomain.creators.Error({
        detail: "Something went wrong",
        cause: originalError,
      });

      expect(error.cause).toBe(originalError);
    });

    describe("toProblem", () => {
      it("should convert DomainError to ProblemDetails", () => {
        const TestDomain = defineDomain("test", {
          NotFound: {
            code: "test/not-found",
            status: 404,
            title: "errors.test.not_found",
          },
        });

        const error = TestDomain.creators.NotFound({
          detail: "Resource not found",
          meta: { resourceId: 123 },
        });

        const problem = TestDomain.toProblem(error, "/api/test");

        expect(problem.type).toContain("/test/not-found");
        expect(problem.title).toBe("errors.test.not_found");
        expect(problem.status).toBe(404);
        expect(problem.detail).toBe("Resource not found");
        expect(problem.instance).toBe("/api/test");
        expect(problem.code).toBe("test/not-found");
        expect(problem.meta).toEqual({ resourceId: 123 });
      });

      it("should use default PROBLEM_URI_TYPE if not set", () => {
        // Temporarily ensure PROBLEM_URI_TYPE is not set
        const originalEnv = (import.meta as any).env;
        const originalProblemUriType = originalEnv?.PROBLEM_URI_TYPE;

        // Create a new env object without PROBLEM_URI_TYPE
        if ((import.meta as any).env) {
          const { PROBLEM_URI_TYPE, ...envWithoutProblemUri } = (import.meta as any).env;
          (import.meta as any).env = envWithoutProblemUri;
        } else {
          (import.meta as any).env = {};
        }

        const TestDomain = defineDomain("test", {
          Error: {
            code: "test/error",
            status: 500,
            title: "errors.test.error",
          },
        });

        const error = TestDomain.creators.Error();
        const problem = TestDomain.toProblem(error);

        expect(problem.type).toBe("https://docs.app.dev/problems/test/error");
        expect(problem.instance).toBeUndefined();

        // Restore original env
        if (originalEnv) {
          if (originalProblemUriType !== undefined) {
            (import.meta as any).env.PROBLEM_URI_TYPE = originalProblemUriType;
          }
        }
      });

      it("should handle error without instance", () => {
        const TestDomain = defineDomain("test", {
          Error: {
            code: "test/error",
            status: 500,
            title: "errors.test.error",
          },
        });

        const error = TestDomain.creators.Error();
        const problem = TestDomain.toProblem(error);

        expect(problem.instance).toBeUndefined();
      });
    });
  });
});
