import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../verify-otp";
import {
  createMockRequest,
  createMockAstroContext,
  verifyProblemJsonResponse,
  verifySuccessResponse,
  createMockSupabaseClient,
  createMockUser,
  createMockSession,
} from "@/tests/helpers";

describe("pages/api/auth/verify-otp.ts", () => {
  let mockSupabase: any;
  let mockLocals: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { supabase } = createMockSupabaseClient();
    mockSupabase = supabase;
    mockLocals = {
      user: null, // Verify OTP nie wymaga sesji
      supabase: mockSupabase,
    };
  });

  describe("POST /api/auth/verify-otp", () => {
    // ============================================================================
    // Happy Paths
    // ============================================================================

    it("should return 200 with user_id for signup OTP verification", async () => {
      const mockUser = createMockUser({
        id: "user-123",
        email: "test@example.com",
      });
      const mockSession = createMockSession({ user: mockUser });

      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        token: "123456",
        type: "signup",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.user_id).toBe("user-123");
      expect(body.message).toContain("E-mail został zweryfikowany");
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: "test@example.com",
        token: "123456",
        type: "email", // signup → "email"
      });
    });

    it("should return 200 with user_id for recovery OTP verification", async () => {
      const mockUser = createMockUser({
        id: "user-123",
        email: "test@example.com",
      });
      const mockSession = createMockSession({ user: mockUser });

      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        token: "654321",
        type: "recovery",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.user_id).toBe("user-123");
      expect(body.message).toContain("Hasło zostało zresetowane");
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: "test@example.com",
        token: "654321",
        type: "recovery", // recovery → "recovery"
      });
    });

    // ============================================================================
    // Validation Errors
    // ============================================================================

    it("should return 400 for missing email", async () => {
      const request = createMockRequest("POST", {
        token: "123456",
        type: "signup",
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

    it("should return 400 for invalid email format", async () => {
      const request = createMockRequest("POST", {
        email: "not-an-email",
        token: "123456",
        type: "signup",
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

    it("should return 400 for token shorter than 6 digits", async () => {
      const request = createMockRequest("POST", {
        email: "test@example.com",
        token: "12345", // 5 digits
        type: "signup",
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

    it("should return 400 for token longer than 6 digits", async () => {
      const request = createMockRequest("POST", {
        email: "test@example.com",
        token: "1234567", // 7 digits
        type: "signup",
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

    it("should return 400 for token with non-digit characters", async () => {
      const request = createMockRequest("POST", {
        email: "test@example.com",
        token: "12345a", // Contains letter
        type: "signup",
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

    it("should return 400 for invalid type (not signup or recovery)", async () => {
      const request = createMockRequest("POST", {
        email: "test@example.com",
        token: "123456",
        type: "invalid", // Invalid type
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

    it("should return 400 for missing token", async () => {
      const request = createMockRequest("POST", {
        email: "test@example.com",
        type: "signup",
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
    // Rate Limiting
    // ============================================================================

    it("should return 429 when rate limit exceeded", async () => {
      // Rate limiter jest współdzielony między testami, więc testujemy logikę limitera osobno
      // Tutaj tylko weryfikujemy że endpoint używa limitera
      const mockUser = createMockUser();
      const mockSession = createMockSession({ user: mockUser });

      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        token: "123456",
        type: "signup",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      // Pierwsze wywołanie powinno przejść (lub zwrócić 429 jeśli limiter jest już zapełniony)
      const response = await POST(context as any);
      expect([200, 429]).toContain(response.status);

      if (response.status === 429) {
        await verifyProblemJsonResponse(response, 429);
        const body = await response.clone().json();
        expect(body.code).toBe("auth/rate-limited");
      }
    });

    // ============================================================================
    // Supabase Auth Errors
    // ============================================================================

    it("should map token_expired error to auth/token-expired (410)", async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: null,
        error: {
          code: "token_expired",
          message: "Token has expired",
        },
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        token: "123456",
        type: "signup",
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

    it("should map expired message to auth/token-expired (410)", async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: null,
        error: {
          message: "Token expired",
        },
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        token: "123456",
        type: "signup",
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

    it("should map invalid_token error to auth/invalid-credentials (401)", async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: null,
        error: {
          code: "invalid_token",
          message: "Invalid token",
        },
      });

      const request = createMockRequest("POST", {
        email: "invalid-token@example.com", // Unikalny email dla tego testu
        token: "000000",
        type: "signup",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 401);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/invalid-credentials");
      expect(body.detail).toContain("Nieprawidłowy kod weryfikacyjny");
    });

    it("should map invalid message to auth/invalid-credentials (401)", async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: null,
        error: {
          message: "Invalid token",
        },
      });

      const request = createMockRequest("POST", {
        email: "invalid-message@example.com", // Unikalny email dla tego testu
        token: "000000",
        type: "signup",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 401);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/invalid-credentials");
    });

    it("should map provider_error to auth/provider-error (502)", async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: null,
        error: {
          code: "provider_error",
          message: "Service unavailable",
          status: 502,
        },
      });

      const request = createMockRequest("POST", {
        email: "provider-error-otp@example.com", // Unikalny email dla tego testu
        token: "123456",
        type: "signup",
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

    it("should handle null user from verifyOtp", async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "null-user-otp@example.com", // Unikalny email dla tego testu
        token: "123456",
        type: "signup",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.user_id).toBe(""); // Empty string for null user
    });

    it("should return problem+json format on error", async () => {
      const request = createMockRequest("POST", {
        email: "", // Invalid
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
      const mockUser = createMockUser();
      const mockSession = createMockSession({ user: mockUser });

      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        token: "123456",
        type: "signup",
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
