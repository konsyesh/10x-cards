import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../update-password";
import {
  createMockRequest,
  createMockAstroContext,
  verifyProblemJsonResponse,
  verifySuccessResponse,
  createMockSupabaseClient,
} from "@/tests/helpers";

describe("pages/api/auth/update-password.ts", () => {
  let mockSupabase: any;
  let mockLocals: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { supabase } = createMockSupabaseClient();
    mockSupabase = supabase;
    mockLocals = {
      user: { id: "user-123", email: "test@example.com" }, // Wymagana sesja recovery
      supabase: mockSupabase,
    };
  });

  describe("POST /api/auth/update-password", () => {
    // ============================================================================
    // Happy Paths
    // ============================================================================

    it("should return 200 with message on successful password update", async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: {
          user: { id: "user-123" },
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        password: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.message).toContain("Hasło zostało zaktualizowane");
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: "NewPassword123",
      });
    });

    // ============================================================================
    // Validation Errors
    // ============================================================================

    it("should return 400 for missing password", async () => {
      const request = createMockRequest("POST", {
        confirmPassword: "Password123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 400);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/validation-failed");
    });

    it("should return 400 for password shorter than 8 characters", async () => {
      const request = createMockRequest("POST", {
        password: "Pass123", // 7 characters
        confirmPassword: "Pass123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 400);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/validation-failed");
    });

    it("should return 400 for password longer than 72 characters", async () => {
      const request = createMockRequest("POST", {
        password: "A".repeat(70) + "123", // 73 characters
        confirmPassword: "A".repeat(70) + "123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 400);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/validation-failed");
    });

    it("should return 400 for password without letter", async () => {
      const request = createMockRequest("POST", {
        password: "12345678", // Only digits
        confirmPassword: "12345678",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 400);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/validation-failed");
    });

    it("should return 400 for password without digit", async () => {
      const request = createMockRequest("POST", {
        password: "Password", // No digits
        confirmPassword: "Password",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 400);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/validation-failed");
    });

    it("should return 400 for missing confirmPassword", async () => {
      const request = createMockRequest("POST", {
        password: "Password123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 400);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/validation-failed");
    });

    it("should return 400 when passwords do not match", async () => {
      const request = createMockRequest("POST", {
        password: "Password123",
        confirmPassword: "Password456", // Different password
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 400);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/validation-failed");
    });

    // ============================================================================
    // Authorization Errors
    // ============================================================================

    it("should return 401 when user session is missing", async () => {
      const request = createMockRequest("POST", {
        password: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

      const context = createMockAstroContext({
        locals: {
          user: null, // No session
          supabase: mockSupabase,
        },
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 401);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/unauthorized");
      expect(body.detail).toContain("Wymagana sesja do zmiany hasła");
    });

    // ============================================================================
    // Supabase Auth Errors
    // ============================================================================

    it("should map token_expired error to auth/token-expired (410)", async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: null,
        error: {
          code: "token_expired",
          message: "Token has expired",
        },
      });

      const request = createMockRequest("POST", {
        password: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 410);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/token-expired");
      expect(body.detail).toContain("wygasł");
    });

    it("should map session_expired error to auth/token-expired (410)", async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: null,
        error: {
          code: "session_expired",
          message: "Session has expired",
        },
      });

      const request = createMockRequest("POST", {
        password: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 410);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/token-expired");
    });

    it("should map expired message to auth/token-expired (410)", async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: null,
        error: {
          message: "Link expired",
        },
      });

      const request = createMockRequest("POST", {
        password: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 410);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/token-expired");
    });

    it("should map provider_error to auth/provider-error (502)", async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: null,
        error: {
          code: "provider_error",
          message: "Service unavailable",
          status: 502,
        },
      });

      const request = createMockRequest("POST", {
        password: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

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

    it("should require active recovery session (set by callback)", async () => {
      // Endpoint wymaga locals.user (ustawione przez callback po wymianie code na sesję)
      const request = createMockRequest("POST", {
        password: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

      const context = createMockAstroContext({
        locals: {
          user: { id: "user-123", email: "test@example.com" }, // Recovery session
          supabase: mockSupabase,
        },
        request,
      });

      mockSupabase.auth.updateUser.mockResolvedValue({
        data: {
          user: { id: "user-123" },
        },
        error: null,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      // Po sukcesie sesja recovery staje się normalną sesją (użytkownik jest zalogowany)
    });

    it("should return problem+json format on error", async () => {
      const request = createMockRequest("POST", {
        password: "", // Invalid
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      expect(response.headers.get("content-type")).toContain("application/problem+json");
      const body = await response.json();
      expect(body.type).toBeDefined();
      expect(body.title).toBeDefined();
      expect(body.status).toBe(400);
      expect(body.code).toBeDefined();
    });

    it("should include x-request-id header", async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: {
          user: { id: "user-123" },
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        password: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      expect(response.headers.get("x-request-id")).toBeDefined();
    });
  });
});
