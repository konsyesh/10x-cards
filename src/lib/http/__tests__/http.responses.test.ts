import { describe, it, expect } from "vitest";
import { successResponse, createdResponse, noContentResponse } from "../http.responses";

describe("lib/http/http.responses.ts", () => {
  describe("successResponse", () => {
    it("should create 200 response with JSON data", async () => {
      const data = { id: "123", name: "Test" };
      const response = successResponse(data);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const body = await response.json();
      expect(body).toEqual(data);
    });

    it("should merge custom headers", () => {
      const data = { success: true };
      const response = successResponse(data, {
        headers: { "x-custom": "value" },
      });

      expect(response.headers.get("x-custom")).toBe("value");
      expect(response.headers.get("content-type")).toContain("application/json");
    });

    it("should use custom status", () => {
      const data = { success: true };
      const response = successResponse(data, { status: 202 });

      expect(response.status).toBe(202);
    });
  });

  describe("createdResponse", () => {
    it("should create 201 response with JSON data", async () => {
      const data = { id: "123", name: "Test" };
      const response = createdResponse(data);

      expect(response.status).toBe(201);
      expect(response.headers.get("content-type")).toContain("application/json");

      const body = await response.json();
      expect(body).toEqual(data);
    });

    it("should add Location header when provided", () => {
      const data = { id: "123" };
      const response = createdResponse(data, "/api/resource/123");

      expect(response.status).toBe(201);
      expect(response.headers.get("location")).toBe("/api/resource/123");
    });

    it("should not add Location header when not provided", () => {
      const data = { id: "123" };
      const response = createdResponse(data);

      expect(response.status).toBe(201);
      expect(response.headers.get("location")).toBeNull();
    });

    it("should merge custom headers", () => {
      const data = { id: "123" };
      const response = createdResponse(data, undefined, {
        headers: { "x-custom": "value" },
      });

      expect(response.headers.get("x-custom")).toBe("value");
      expect(response.headers.get("content-type")).toContain("application/json");
    });
  });

  describe("noContentResponse", () => {
    it("should create 204 response with null body", () => {
      const response = noContentResponse();

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });

    it("should merge custom headers", () => {
      const response = noContentResponse({
        headers: { "x-custom": "value" },
      });

      expect(response.headers.get("x-custom")).toBe("value");
    });

    it("should not set content-type header", () => {
      const response = noContentResponse();

      expect(response.headers.get("content-type")).toBeNull();
    });
  });
});
