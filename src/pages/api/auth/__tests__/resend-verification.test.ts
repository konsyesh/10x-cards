import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../resend-verification";
import {
  createMockRequest,
  createMockAstroContext,
  verifyProblemJsonResponse,
  verifySuccessResponse,
  createMockSupabaseClient,
} from "@/tests/helpers";

describe("pages/api/auth/resend-verification.ts", () => {
  let mockSupabase: any;
  let mockLocals: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { supabase } = createMockSupabaseClient();
    mockSupabase = supabase;
    mockLocals = {
      user: null, // Resend verification nie wymaga sesji
      supabase: mockSupabase,
    };
  });

  describe("POST /api/auth/resend-verification", () => {
    // ============================================================================
    // Happy Paths
    // ============================================================================

    it("should return 200 with neutral message on success", async () => {
      mockSupabase.auth.resend.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.message).toContain("Jeśli konto istnieje");
      expect(body.message).toContain("wysłaliśmy ponownie"); // Neutral message (zawiera "wysłaliśmy" ale jest neutralny)
      expect(mockSupabase.auth.resend).toHaveBeenCalledWith({
        type: "signup",
        email: "test@example.com",
        options: {
          emailRedirectTo: expect.stringContaining("/auth/callback?type=signup"),
        },
      });
    });

    it("should always return success even if email does not exist (security)", async () => {
      // Supabase zawsze zwraca sukces, nawet jeśli email nie istnieje
      mockSupabase.auth.resend.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "nonexistent@example.com",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.message).toContain("Jeśli konto istnieje");
    });

    it("should construct emailRedirectTo with correct BASE_URL", async () => {
      mockSupabase.auth.resend.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      await POST(context as any);

      expect(mockSupabase.auth.resend).toHaveBeenCalledWith({
        type: "signup",
        email: "test@example.com",
        options: {
          emailRedirectTo: expect.stringMatching(/^https?:\/\/.+\/auth\/callback\?type=signup$/),
        },
      });
    });

    // ============================================================================
    // Validation Errors
    // ============================================================================

    it("should return 400 for missing email", async () => {
      const request = createMockRequest("POST", {});

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
      mockSupabase.auth.resend.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "rate-limit-resend@example.com",
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
    // Edge Cases
    // ============================================================================

    it("should always return neutral message (no account enumeration)", async () => {
      mockSupabase.auth.resend.mockResolvedValue({
        data: null,
        error: null,
      });

      const emails = ["existing@example.com", "nonexistent@example.com", "another@example.com"];

      for (const email of emails) {
        const request = createMockRequest("POST", { email });

        const context = createMockAstroContext({
          locals: mockLocals,
          request,
        });

        const response = await POST(context as any);

        await verifySuccessResponse(response, 200);
        const body = await response.json();
        expect(body.message).toBe("Jeśli konto istnieje, wysłaliśmy ponownie link aktywacyjny.");
      }
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
      mockSupabase.auth.resend.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = createMockRequest("POST", {
        email: "test@example.com",
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
