import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterForm } from "../RegisterForm";
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

describe("RegisterForm", () => {
  let locationMock: ReturnType<typeof mockWindowLocation>;

  beforeEach(() => {
    vi.clearAllMocks();
    locationMock = mockWindowLocation();
  });

  afterEach(() => {
    locationMock.restore();
  });

  describe("rendering", () => {
    it("should render all form fields", () => {
      render(<RegisterForm />);

      expect(screen.getByRole("textbox", { name: /e-mail/i })).toBeInTheDocument();
      // Use getAllByLabelText and select specific ones
      const passwordInputs = screen.getAllByLabelText(/hasło/i);
      expect(passwordInputs.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByLabelText(/potwierdź hasło/i)).toBeInTheDocument();
      // Użyj getAllByLabelText i sprawdź że jest dokładnie jeden element związany z checkboxem
      // (FormLabel zawiera też button, więc może być wiele elementów pasujących)
      const acceptLabels = screen.getAllByLabelText(/akceptuję/i);
      expect(acceptLabels.length).toBeGreaterThanOrEqual(1);
      // Sprawdź czy checkbox jest dostępny
      expect(screen.getByRole("checkbox", { name: /akceptuję/i })).toBeInTheDocument();
    });
  });

  describe("submission - auto-login", () => {
    it("should redirect when user_id is returned", async () => {
      const user = userEvent.setup();
      vi.mocked(fetchJson).mockResolvedValue({ user_id: "123", message: "Registered" });

      render(<RegisterForm />);

      await user.type(screen.getByRole("textbox", { name: /e-mail/i }), "test@example.com");
      // Use getAllByLabelText and select the first one (password field)
      const passwordInputs = screen.getAllByLabelText(/hasło/i);
      await user.type(passwordInputs[0], "Password123");
      await user.type(screen.getByLabelText(/potwierdź hasło/i), "Password123");
      // Użyj getByRole zamiast getByLabelText, żeby kliknąć checkbox bezpośrednio
      await user.click(screen.getByRole("checkbox", { name: /akceptuję/i }));
      await user.click(screen.getByRole("button", { name: /zarejestruj się/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
        expect(locationMock.getHref()).toBe("/generate");
      });
    });
  });

  describe("submission - email verification required", () => {
    it("should show VerifyEmailForm when no user_id", async () => {
      const user = userEvent.setup();
      vi.mocked(fetchJson).mockResolvedValue({ message: "Check your email" });

      render(<RegisterForm />);

      await user.type(screen.getByRole("textbox", { name: /e-mail/i }), "test@example.com");
      // Use getAllByLabelText and select the first one (password field)
      const passwordInputs = screen.getAllByLabelText(/hasło/i);
      await user.type(passwordInputs[0], "Password123");
      await user.type(screen.getByLabelText(/potwierdź hasło/i), "Password123");
      // Użyj getByRole zamiast getByLabelText, żeby kliknąć checkbox bezpośrednio
      await user.click(screen.getByRole("checkbox", { name: /akceptuję/i }));
      await user.click(screen.getByRole("button", { name: /zarejestruj się/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/kod weryfikacyjny/i)).toBeInTheDocument();
        expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
      });
    });
  });

  describe("submission - errors", () => {
    it("should handle email conflict (409)", async () => {
      const user = userEvent.setup();
      const apiError = new ApiError(
        {
          type: "https://docs.app.dev/problems/auth/email_exists",
          code: "EMAIL_EXISTS",
          status: 409,
          detail: "Email already exists",
          title: "errors.auth.email_exists",
        },
        "req-123"
      );
      vi.mocked(fetchJson).mockRejectedValue(apiError);

      render(<RegisterForm />);

      await user.type(screen.getByRole("textbox", { name: /e-mail/i }), "existing@example.com");
      // Use getAllByLabelText and select the first one (password field)
      const passwordInputs = screen.getAllByLabelText(/hasło/i);
      await user.type(passwordInputs[0], "Password123");
      await user.type(screen.getByLabelText(/potwierdź hasło/i), "Password123");
      // Użyj getByRole zamiast getByLabelText, żeby kliknąć checkbox bezpośrednio
      await user.click(screen.getByRole("checkbox", { name: /akceptuję/i }));
      await user.click(screen.getByRole("button", { name: /zarejestruj się/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Konto z tym adresem e-mail już istnieje");
      });
    });

    it("should handle validation errors (400)", async () => {
      const user = userEvent.setup();
      const apiError = new ApiError(
        {
          type: "https://docs.app.dev/problems/validation/failed",
          code: "VALIDATION_ERROR",
          status: 400,
          detail: "Validation failed",
          title: "errors.validation.failed",
          meta: {
            fieldErrors: {
              email: ["Invalid email format"],
            },
          },
        },
        "req-123"
      );
      vi.mocked(fetchJson).mockRejectedValue(apiError);

      render(<RegisterForm />);

      // Use valid email format to pass client-side validation, but server will reject it
      await user.type(screen.getByRole("textbox", { name: /e-mail/i }), "test@example.com");
      // Use getAllByLabelText and select the first one (password field)
      const passwordInputs = screen.getAllByLabelText(/hasło/i);
      await user.type(passwordInputs[0], "Password123");
      await user.type(screen.getByLabelText(/potwierdź hasło/i), "Password123");
      // Użyj getByRole zamiast getByLabelText, żeby kliknąć checkbox bezpośrednio
      await user.click(screen.getByRole("checkbox", { name: /akceptuję/i }));
      await user.click(screen.getByRole("button", { name: /zarejestruj się/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Błąd walidacji", {
          description: "Invalid email format",
        });
      });
    });
  });
});
