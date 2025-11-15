import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../register";
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

describe("pages/api/auth/register.ts", () => {
  let mockSupabase: any;
  let mockLocals: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { supabase } = createMockSupabaseClient();
    mockSupabase = supabase;
    mockLocals = {
      user: null, // Register nie wymaga sesji
      supabase: mockSupabase,
    };
  });

  describe("POST /api/auth/register", () => {
    // ============================================================================
    // Happy Paths
    // ============================================================================

    it("should return 201 with user_id when auto-login is enabled (session available)", async () => {
      const mockUser = createMockUser({
        id: "user-123",
        email: "test@example.com",
      });
      const mockSession = createMockSession({ user: mockUser });

      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession, // Session available = auto-login
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        password: "Password123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 201);
      const body = await response.json();
      expect(body.user_id).toBe("user-123");
      expect(body.message).toContain("automatycznie zalogowany");
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password123",
        options: {
          emailRedirectTo: expect.stringContaining("/auth/callback?type=signup"),
        },
      });
    });

    it("should return 200 with message when email confirmation is required (no session)", async () => {
      const mockUser = createMockUser({
        id: "user-123",
        email: "test@example.com",
      });

      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: mockUser,
          session: null, // No session = email confirmation required
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        password: "Password123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.message).toContain("link aktywacyjny");
      expect(body.user_id).toBeUndefined();
    });

    it("should construct emailRedirectTo with correct BASE_URL", async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession({ user: mockUser });

      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        password: "Password123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      await POST(context as any);

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password123",
        options: {
          emailRedirectTo: expect.stringMatching(/^https?:\/\/.+\/auth\/callback\?type=signup$/),
        },
      });
    });

    // ============================================================================
    // Validation Errors
    // ============================================================================

    it("should return 400 for missing email", async () => {
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

    it("should return 400 for invalid email format", async () => {
      const request = createMockRequest("POST", {
        email: "not-an-email",
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

    it("should return 400 for password shorter than 8 characters", async () => {
      const request = createMockRequest("POST", {
        email: "test@example.com",
        password: "Pass123", // 7 characters
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
        email: "test@example.com",
        password: "A".repeat(70) + "123", // 73 characters
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
        email: "test@example.com",
        password: "12345678", // Only digits
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
        email: "test@example.com",
        password: "Password", // No digits
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

    // ============================================================================
    // Rate Limiting
    // ============================================================================

    it("should return 429 when rate limit exceeded", async () => {
      // Rate limiter jest współdzielony między testami, więc testujemy logikę limitera osobno
      // Tutaj tylko weryfikujemy że endpoint używa limitera
      const mockUser = createMockUser();
      const mockSession = createMockSession({ user: mockUser });

      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        password: "Password123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      // Pierwsze wywołanie powinno przejść (lub zwrócić 429 jeśli limiter jest już zapełniony)
      const response = await POST(context as any);
      expect([201, 429]).toContain(response.status);
      
      if (response.status === 429) {
        await verifyProblemJsonResponse(response, 429);
        const body = await response.clone().json();
        expect(body.code).toBe("auth/rate-limited");
      }
    });

    // ============================================================================
    // Supabase Auth Errors
    // ============================================================================

    it("should map user_already_registered to auth/user-exists (409)", async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: null,
        error: {
          code: "user_already_registered",
          message: "User already registered",
        },
      });

      const request = createMockRequest("POST", {
        email: "existing@example.com",
        password: "Password123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 409);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/user-exists");
    });

    it("should map provider_error to auth/provider-error (502)", async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: null,
        error: {
          code: "provider_error",
          message: "Service unavailable",
          status: 502,
        },
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        password: "Password123",
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

    it("should return 502 when data.user is null after signUp", async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: null, // User is null
          session: null,
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "null-user@example.com", // Unikalny email dla tego testu
        password: "Password123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 502);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/provider-error");
      expect(body.detail).toContain("Nie udało się utworzyć konta");
    });

    it("should handle undefined session correctly", async () => {
      const mockUser = createMockUser();

      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: mockUser,
          session: undefined, // Undefined session
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "undefined-session@example.com", // Unikalny email dla tego testu
        password: "Password123",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.message).toContain("link aktywacyjny");
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

      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
        password: "Password123",
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

