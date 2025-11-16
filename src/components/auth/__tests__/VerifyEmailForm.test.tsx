import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VerifyEmailForm } from "../VerifyEmailForm";
import { toast } from "sonner";
import { mockWindowLocation } from "@/tests/helpers/components.test-helpers";

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

describe("VerifyEmailForm", () => {
  let locationMock: ReturnType<typeof mockWindowLocation>;

  beforeEach(() => {
    vi.clearAllMocks();
    locationMock = mockWindowLocation();
  });

  afterEach(() => {
    locationMock.restore();
  });

  describe("rendering", () => {
    it("should render OTP input", () => {
      render(<VerifyEmailForm email="test@example.com" />);

      expect(screen.getByLabelText(/kod weryfikacyjny/i)).toBeInTheDocument();
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });

    it("should have maxLength of 6", () => {
      render(<VerifyEmailForm email="test@example.com" />);

      const input = screen.getByLabelText(/kod weryfikacyjny/i);
      expect(input).toHaveAttribute("maxLength", "6");
    });
  });

  describe("input filtering", () => {
    it("should filter out non-digits", async () => {
      const user = userEvent.setup();
      render(<VerifyEmailForm email="test@example.com" />);

      const input = screen.getByLabelText(/kod weryfikacyjny/i);
      await user.type(input, "abc123def");

      expect(input).toHaveValue("123");
    });
  });

  describe("submission", () => {
    it("should verify OTP and redirect", async () => {
      const user = userEvent.setup();
      vi.mocked(fetchJson).mockResolvedValue({ user_id: "123", message: "Verified" });

      render(<VerifyEmailForm email="test@example.com" />);

      await user.type(screen.getByLabelText(/kod weryfikacyjny/i), "123456");
      await user.click(screen.getByRole("button", { name: /zweryfikuj kod/i }));

      await waitFor(() => {
        expect(fetchJson).toHaveBeenCalledWith("/api/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({
            email: "test@example.com",
            token: "123456",
            type: "signup",
          }),
        });
        expect(toast.success).toHaveBeenCalled();
        expect(locationMock.getHref()).toBe("/generate");
      });
    });

    it("should call onVerified callback", async () => {
      const user = userEvent.setup();
      const onVerified = vi.fn();
      vi.mocked(fetchJson).mockResolvedValue({ user_id: "123", message: "Verified" });

      render(<VerifyEmailForm email="test@example.com" onVerified={onVerified} />);

      await user.type(screen.getByLabelText(/kod weryfikacyjny/i), "123456");
      await user.click(screen.getByRole("button", { name: /zweryfikuj kod/i }));

      await waitFor(() => {
        expect(onVerified).toHaveBeenCalledTimes(1);
      });
    });

    it("should handle expired code error (410)", async () => {
      const user = userEvent.setup();
      const apiError = new ApiError(
        {
          type: "https://docs.app.dev/problems/auth/otp_expired",
          code: "OTP_EXPIRED",
          status: 410,
          detail: "Code expired",
          title: "errors.auth.otp_expired",
        },
        "req-123"
      );
      vi.mocked(fetchJson).mockRejectedValue(apiError);

      render(<VerifyEmailForm email="test@example.com" />);

      await user.type(screen.getByLabelText(/kod weryfikacyjny/i), "123456");
      await user.click(screen.getByRole("button", { name: /zweryfikuj kod/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Kod wygasł", {
          description: "Kod weryfikacyjny wygasł. Zarejestruj się ponownie.",
        });
      });
    });

    it("should handle validation errors (400)", async () => {
      const user = userEvent.setup();
      const apiError = new ApiError(
        {
          type: "https://docs.app.dev/problems/validation/failed",
          code: "VALIDATION_ERROR",
          status: 400,
          detail: "Invalid code",
          title: "errors.validation.failed",
          meta: {
            fieldErrors: {
              token: ["Kod musi mieć 6 cyfr"],
            },
          },
        },
        "req-123"
      );
      vi.mocked(fetchJson).mockRejectedValue(apiError);

      render(<VerifyEmailForm email="test@example.com" />);

      await user.type(screen.getByLabelText(/kod weryfikacyjny/i), "123456");
      await user.click(screen.getByRole("button", { name: /zweryfikuj kod/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Błąd walidacji", {
          description: "Kod musi mieć 6 cyfr",
        });
      });
    });
  });
});

