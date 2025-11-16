import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../logout";
import {
  createMockRequest,
  createMockAstroContext,
  verifyProblemJsonResponse,
  createMockSupabaseClient,
} from "@/tests/helpers";

describe("pages/api/auth/logout.ts", () => {
  let mockSupabase: any;
  let mockLocals: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { supabase } = createMockSupabaseClient();
    mockSupabase = supabase;
    mockLocals = {
      user: { id: "user-123", email: "test@example.com" }, // Logout może mieć sesję
      supabase: mockSupabase,
    };
  });

  describe("POST /api/auth/logout", () => {
    // ============================================================================
    // Happy Paths
    // ============================================================================

    it("should return 204 No Content on successful logout", async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = createMockRequest("POST");

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      expect(response.status).toBe(204);
      expect(response.headers.get("content-type")).toBeNull(); // No content
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it("should work even without active session", async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = createMockRequest("POST");

      const context = createMockAstroContext({
        locals: {
          user: null, // No session
          supabase: mockSupabase,
        },
        request,
      });

      const response = await POST(context as any);

      expect(response.status).toBe(204);
    });

    it("should include x-request-id header", async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = createMockRequest("POST");

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      expect(response.headers.get("x-request-id")).toBeDefined();
    });

    // ============================================================================
    // Supabase Auth Errors
    // ============================================================================

    it("should map provider_error to auth/provider-error (502)", async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        data: null,
        error: {
          code: "provider_error",
          message: "Service unavailable",
          status: 502,
        },
      });

      const request = createMockRequest("POST");

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 502);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/provider-error");
    });

    it("should map unknown Supabase error to auth/provider-error (502)", async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        data: null,
        error: {
          code: "unknown_error",
          message: "Something went wrong",
        },
      });

      const request = createMockRequest("POST");

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 502);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/provider-error");
    });

    // ============================================================================
    // Edge Cases
    // ============================================================================

    it("should return problem+json format on error", async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        data: null,
        error: {
          code: "provider_error",
          message: "Service unavailable",
        },
      });

      const request = createMockRequest("POST");

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      expect(response.headers.get("content-type")).toContain("application/problem+json");
      const body = await response.json();
      expect(body.type).toBeDefined();
      expect(body.title).toBeDefined();
      expect(body.status).toBe(502);
      expect(body.code).toBeDefined();
    });
  });
});
