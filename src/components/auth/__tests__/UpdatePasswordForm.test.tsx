import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UpdatePasswordForm } from "../UpdatePasswordForm";
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

describe("UpdatePasswordForm", () => {
  let locationMock: ReturnType<typeof mockWindowLocation>;

  beforeEach(() => {
    vi.clearAllMocks();
    locationMock = mockWindowLocation();
  });

  afterEach(() => {
    locationMock.restore();
  });

  describe("rendering", () => {
    it("should render password fields", () => {
      render(<UpdatePasswordForm />);

      const passwordInputs = screen.getAllByLabelText(/nowe hasło/i);
      expect(passwordInputs[0]).toBeInTheDocument();
      expect(screen.getByLabelText(/potwierdź nowe hasło/i)).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("should validate password length", async () => {
      const user = userEvent.setup();
      render(<UpdatePasswordForm />);

      const passwordInputs = screen.getAllByLabelText(/nowe hasło/i);
      await user.type(passwordInputs[0], "short");
      await user.type(screen.getByLabelText(/potwierdź nowe hasło/i), "short");
      await user.click(screen.getByRole("button", { name: /zaktualizuj hasło/i }));

      expect(screen.getByText(/hasło musi mieć co najmniej 8 znaków/i)).toBeInTheDocument();
    });

    it("should validate password contains letter and number", async () => {
      const user = userEvent.setup();
      render(<UpdatePasswordForm />);

      const passwordInputs = screen.getAllByLabelText(/nowe hasło/i);
      await user.type(passwordInputs[0], "12345678");
      await user.type(screen.getByLabelText(/potwierdź nowe hasło/i), "12345678");
      await user.click(screen.getByRole("button", { name: /zaktualizuj hasło/i }));

      expect(screen.getByText(/hasło musi zawierać co najmniej jedną literę/i)).toBeInTheDocument();
    });

    it("should validate password confirmation match", async () => {
      const user = userEvent.setup();
      render(<UpdatePasswordForm />);

      const passwordInputs = screen.getAllByLabelText(/nowe hasło/i);
      await user.type(passwordInputs[0], "Password123");
      await user.type(screen.getByLabelText(/potwierdź nowe hasło/i), "Password456");
      await user.click(screen.getByRole("button", { name: /zaktualizuj hasło/i }));

      expect(screen.getByText(/hasła nie są identyczne/i)).toBeInTheDocument();
    });
  });

  describe("submission", () => {
    it("should update password and redirect", async () => {
      const user = userEvent.setup();
      vi.mocked(fetchJson).mockResolvedValue({ message: "Password updated" });

      render(<UpdatePasswordForm />);

      const passwordInputs = screen.getAllByLabelText(/nowe hasło/i);
      await user.type(passwordInputs[0], "Password123");
      await user.type(screen.getByLabelText(/potwierdź nowe hasło/i), "Password123");
      await user.click(screen.getByRole("button", { name: /zaktualizuj hasło/i }));

      await waitFor(
        () => {
          expect(fetchJson).toHaveBeenCalledWith("/api/auth/update-password", {
            method: "POST",
            body: JSON.stringify({
              password: "Password123",
              confirmPassword: "Password123",
            }),
          });
          expect(toast.success).toHaveBeenCalled();
        },
        { timeout: 5000 }
      );

      // Wait for setTimeout redirect (1500ms)
      await waitFor(
        () => {
          expect(locationMock.getHref()).toBe("/auth/login");
        },
        { timeout: 2000 }
      );
    });

    it("should handle expired link error", async () => {
      const user = userEvent.setup();
      const apiError = new ApiError(
        {
          type: "https://docs.app.dev/problems/auth/link_expired",
          code: "LINK_EXPIRED",
          status: 410,
          detail: "Link expired",
          title: "errors.auth.link_expired",
        },
        "req-123"
      );
      vi.mocked(fetchJson).mockRejectedValue(apiError);

      render(<UpdatePasswordForm />);

      const passwordInputs = screen.getAllByLabelText(/nowe hasło/i);
      await user.type(passwordInputs[0], "Password123");
      await user.type(screen.getByLabelText(/potwierdź nowe hasło/i), "Password123");
      await user.click(screen.getByRole("button", { name: /zaktualizuj hasło/i }));

      await waitFor(
        () => {
          expect(toast.error).toHaveBeenCalledWith("Link wygasł lub jest nieprawidłowy", {
            description: "Poproś o nowy link resetujący hasło",
          });
        },
        { timeout: 5000 }
      );
    });
  });
});
