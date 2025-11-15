import { describe, it, expect, beforeEach, vi } from "vitest";
import { toProblem, jsonProblem, requestId, withProblemHandling } from "../http";
import { defineDomain } from "../registry";
import type { DomainError, ProblemDetails } from "../index";
import type { APIRoute } from "astro";

describe("lib/errors/http.ts", () => {
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

      const problem = toProblem(error, "/api/test");

      expect(problem.type).toContain("/test/not-found");
      expect(problem.title).toBe("errors.test.not_found");
      expect(problem.status).toBe(404);
      expect(problem.detail).toBe("Resource not found");
      expect(problem.instance).toBe("/api/test");
      expect(problem.code).toBe("test/not-found");
      expect(problem.meta).toEqual({ resourceId: 123 });
    });

    it("should use default PROBLEM_URI_TYPE if not set", () => {
      const TestDomain = defineDomain("test", {
        Error: {
          code: "test/error",
          status: 500,
          title: "errors.test.error",
        },
      });

      const error = TestDomain.creators.Error();
      const problem = toProblem(error);

      expect(problem.type).toContain("https://docs.app.dev/problems");
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
      const problem = toProblem(error);

      expect(problem.instance).toBeUndefined();
    });
  });

  describe("jsonProblem", () => {
    it("should create Response with problem+json content-type", () => {
      const problem: ProblemDetails = {
        type: "https://docs.app.dev/problems/test/error",
        title: "errors.test.error",
        status: 500,
        code: "test/error",
      };

      const response = jsonProblem(problem);

      expect(response.status).toBe(500);
      expect(response.headers.get("content-type")).toContain("application/problem+json");

      return response.json().then((body) => {
        expect(body.type).toBe(problem.type);
        expect(body.title).toBe(problem.title);
        expect(body.status).toBe(500);
      });
    });

    it("should merge custom headers", () => {
      const problem: ProblemDetails = {
        type: "https://docs.app.dev/problems/test/error",
        title: "errors.test.error",
        status: 400,
        code: "test/error",
      };

      const response = jsonProblem(problem, {
        headers: { "x-custom": "value" },
      });

      expect(response.headers.get("x-custom")).toBe("value");
      expect(response.headers.get("content-type")).toContain("application/problem+json");
    });

    it("should use custom status from init", () => {
      const problem: ProblemDetails = {
        type: "https://docs.app.dev/problems/test/error",
        title: "errors.test.error",
        status: 500,
        code: "test/error",
      };

      const response = jsonProblem(problem, { status: 503 });

      expect(response.status).toBe(503);
    });
  });

  describe("requestId", () => {
    it("should return existing x-request-id from headers", () => {
      const headers = new Headers();
      headers.set("x-request-id", "existing-id-123");

      const id = requestId(headers);

      expect(id).toBe("existing-id-123");
    });

    it("should generate new UUID if x-request-id not present", () => {
      const headers = new Headers();
      const id = requestId(headers);

      // UUID v4 format: 8-4-4-4-12 hex characters
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("should generate different UUIDs for different calls", () => {
      const headers = new Headers();
      const id1 = requestId(headers);
      const id2 = requestId(headers);

      expect(id1).not.toBe(id2);
    });
  });

  describe("withProblemHandling", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should add x-request-id to successful response", async () => {
      const handler: APIRoute = async () => {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      };

      const wrapped = withProblemHandling(handler);
      const ctx = {
        request: new Request("http://localhost/api/test", {
          headers: { "x-request-id": "test-id-123" },
        }),
        url: new URL("http://localhost/api/test"),
        params: {},
        props: {},
        locals: {},
      } as any;

      const response = await wrapped(ctx);

      expect(response.headers.get("x-request-id")).toBe("test-id-123");
      expect(response.status).toBe(200);
    });

    it("should handle DomainError and return problem+json", async () => {
      const TestDomain = defineDomain("test", {
        NotFound: {
          code: "test/not-found",
          status: 404,
          title: "errors.test.not_found",
        },
      });

      const handler: APIRoute = async () => {
        throw TestDomain.creators.NotFound({ detail: "Resource not found" });
      };

      const wrapped = withProblemHandling(handler);
      const ctx = {
        request: new Request("http://localhost/api/test"),
        url: new URL("http://localhost/api/test"),
        params: {},
        props: {},
        locals: {},
      } as any;

      const response = await wrapped(ctx);

      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain("application/problem+json");
      expect(response.headers.get("x-request-id")).toBeDefined();

      const body = await response.json();
      expect(body.code).toBe("test/not-found");
      expect(body.status).toBe(404);
      expect(body.detail).toBe("Resource not found");
    });

    it("should map non-DomainError to system/unexpected", async () => {
      const handler: APIRoute = async () => {
        throw new Error("Unexpected error");
      };

      const wrapped = withProblemHandling(handler);
      const ctx = {
        request: new Request("http://localhost/api/test"),
        url: new URL("http://localhost/api/test"),
        params: {},
        props: {},
        locals: {},
      } as any;

      const response = await wrapped(ctx);

      expect(response.status).toBe(500);
      expect(response.headers.get("content-type")).toContain("application/problem+json");

      const body = await response.json();
      expect(body.code).toBe("system/unexpected");
      expect(body.status).toBe(500);
    });

    it("should handle error without message", async () => {
      const handler: APIRoute = async () => {
        throw { something: "weird" };
      };

      const wrapped = withProblemHandling(handler);
      const ctx = {
        request: new Request("http://localhost/api/test"),
        url: new URL("http://localhost/api/test"),
        params: {},
        props: {},
        locals: {},
      } as any;

      const response = await wrapped(ctx);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.code).toBe("system/unexpected");
    });

    it("should set instance from URL pathname", async () => {
      const TestDomain = defineDomain("test", {
        Error: {
          code: "test/error",
          status: 500,
          title: "errors.test.error",
        },
      });

      const handler: APIRoute = async () => {
        throw TestDomain.creators.Error();
      };

      const wrapped = withProblemHandling(handler);
      const ctx = {
        request: new Request("http://localhost/api/test"),
        url: new URL("http://localhost/api/test"),
        params: {},
        props: {},
        locals: {},
      } as any;

      const response = await wrapped(ctx);
      const body = await response.json();

      expect(body.instance).toBe("/api/test");
    });
  });
});

