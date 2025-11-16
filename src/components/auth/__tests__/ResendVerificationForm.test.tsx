import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResendVerificationForm } from "../ResendVerificationForm";
import { toast } from "sonner";

// Mock ApiError class - musi być zgodny z rzeczywistą klasą
vi.mock("@/lib/http/http.fetcher", () => {
  class MockApiError extends Error {
    constructor(
      public problem: {
        type: string;
        code: string;
        status: number;
        detail?: string;
        title: string;
        meta?: Record<string, unknown>;
      },
      public requestId?: string
    ) {
      super(problem.detail ?? problem.title);
      this.name = "ApiError";
    }
  }

  return {
    fetchJson: vi.fn(),
    ApiError: MockApiError,
  };
});
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { fetchJson, ApiError } from "@/lib/http/http.fetcher";

describe("ResendVerificationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render email input", () => {
      render(<ResendVerificationForm />);

      expect(screen.getByLabelText(/e‑mail/i)).toBeInTheDocument();
    });
  });

  describe("submission", () => {
    it("should send verification email on submit", async () => {
      const user = userEvent.setup();
      vi.mocked(fetchJson).mockResolvedValue({});

      render(<ResendVerificationForm />);

      await user.type(screen.getByLabelText(/e‑mail/i), "test@example.com");
      await user.click(screen.getByRole("button", { name: /wyślij ponownie/i }));

      await waitFor(() => {
        expect(fetchJson).toHaveBeenCalledWith("/api/auth/resend-verification", {
          method: "POST",
          body: JSON.stringify({ email: "test@example.com" }),
        });
        expect(toast.success).toHaveBeenCalled();
      });
    });

    it("should handle API errors", async () => {
      const user = userEvent.setup();
      const apiError = new ApiError(
        {
          type: "https://docs.app.dev/problems/auth/email_not_found",
          code: "EMAIL_NOT_FOUND",
          status: 404,
          detail: "Email not found",
          title: "errors.auth.email_not_found",
        },
        "req-123"
      );
      vi.mocked(fetchJson).mockRejectedValue(apiError);

      render(<ResendVerificationForm />);

      await user.type(screen.getByLabelText(/e‑mail/i), "test@example.com");
      await user.click(screen.getByRole("button", { name: /wyślij ponownie/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });
});

