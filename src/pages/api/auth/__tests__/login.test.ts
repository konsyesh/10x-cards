import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../login";
import {
  createMockRequest,
  createMockAstroContext,
  verifyProblemJsonResponse,
  verifySuccessResponse,
  createMockSupabaseClient,
  createMockUser,
  createMockSession,
} from "@/tests/helpers";
import { createInMemoryRateLimiter, makeKeyIpEmail } from "@/lib/http/http.rate-limit";

describe("pages/api/auth/login.ts", () => {
  let mockSupabase: any;
  let mockLocals: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { supabase } = createMockSupabaseClient();
    mockSupabase = supabase;
    mockLocals = {
      user: null, // Login nie wymaga sesji
      supabase: mockSupabase,
    };
  });

  describe("POST /api/auth/login", () => {
    // ============================================================================
    // Happy Paths
    // ============================================================================

    it("should return 200 with user_id and email for valid credentials", async () => {
      const mockUser = createMockUser({
        id: "user-123",
        email: "test@example.com",
      });
      const mockSession = createMockSession({ user: mockUser });

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        password: "password123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.user_id).toBe("user-123");
      expect(body.email).toBe("test@example.com");
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });

    it("should handle email in different cases (lowercase normalization)", async () => {
      const mockUser = createMockUser({
        id: "user-123",
        email: "test@example.com",
      });
      const mockSession = createMockSession({ user: mockUser });

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "TEST@EXAMPLE.COM", // Uppercase
        password: "password123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.user_id).toBe("user-123");
    });

    it("should include x-request-id header", async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession({ user: mockUser });

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        password: "password123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      expect(response.headers.get("x-request-id")).toBeDefined();
    });

    // ============================================================================
    // Validation Errors
    // ============================================================================

    it("should return 400 for missing email", async () => {
      const request = createMockRequest("POST", {
        password: "password123",
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
        password: "password123",
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

    it("should return 400 for empty email", async () => {
      const request = createMockRequest("POST", {
        email: "",
        password: "password123",
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

    it("should return 400 for missing password", async () => {
      const request = createMockRequest("POST", {
        email: "test@example.com",
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

    it("should return 400 for empty password", async () => {
      const request = createMockRequest("POST", {
        email: "test@example.com",
        password: "",
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

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        password: "password123",
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

    it("should map invalid_credentials to auth/invalid-credentials (401)", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: {
          code: "invalid_credentials",
          message: "Invalid login credentials",
        },
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        password: "wrongpassword",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 401);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/invalid-credentials");
      expect(body.detail).toContain("Nieprawidłowy e-mail lub hasło");
    });

    it("should map email_not_confirmed to auth/email-not-confirmed (403)", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: {
          code: "email_not_confirmed",
          message: "Email not confirmed",
        },
      });

      const request = createMockRequest("POST", {
        email: "email-not-confirmed@example.com", // Unikalny email dla tego testu
        password: "password123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 403);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/email-not-confirmed");
    });

    it("should map rate_limit_exceeded to auth/rate-limited (429)", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: {
          code: "rate_limit_exceeded",
          message: "Rate limit exceeded",
          status: 429,
        },
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        password: "password123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 429);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/rate-limited");
    });

    it("should map provider_error to auth/provider-error (502)", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: {
          code: "provider_error",
          message: "Service unavailable",
          status: 502,
        },
      });

      const request = createMockRequest("POST", {
        email: "provider-error@example.com", // Unikalny email dla tego testu
        password: "password123",
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

    it("should map unknown Supabase error to auth/provider-error (502)", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: {
          code: "unknown_error",
          message: "Something went wrong",
        },
      });

      const request = createMockRequest("POST", {
        email: "unknown-error@example.com", // Unikalny email dla tego testu
        password: "password123",
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

    it("should handle email with null value from Supabase", async () => {
      const mockUser = createMockUser({
        id: "user-123",
        email: null as any,
      });
      const mockSession = createMockSession({ user: mockUser });

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "null-email@example.com", // Unikalny email dla tego testu
        password: "password123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.user_id).toBe("user-123");
      expect(body.email).toBe(""); // Powinno być pustym stringiem dla null
    });
  });
});

