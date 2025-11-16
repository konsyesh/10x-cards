import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "../LoginForm";
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

describe("LoginForm", () => {
  let locationMock: ReturnType<typeof mockWindowLocation>;

  beforeEach(() => {
    vi.clearAllMocks();
    locationMock = mockWindowLocation();
  });

  afterEach(() => {
    locationMock.restore();
  });

  describe("rendering", () => {
    it("should render email and password fields", () => {
      render(<LoginForm />);

      expect(screen.getByRole("textbox", { name: /e-mail/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/hasło/i)).toBeInTheDocument();
    });
  });

  describe("submission - success", () => {
    it("should login and redirect to default path", async () => {
      const user = userEvent.setup();
      vi.mocked(fetchJson).mockResolvedValue({ user_id: "123", email: "test@example.com" });

      render(<LoginForm />);

      await user.type(screen.getByRole("textbox", { name: /e-mail/i }), "test@example.com");
      await user.type(screen.getByLabelText(/hasło/i), "password123");
      await user.click(screen.getByRole("button", { name: /zaloguj/i }));

      await waitFor(() => {
        expect(fetchJson).toHaveBeenCalledWith("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
          }),
        });
        expect(toast.success).toHaveBeenCalled();
        expect(locationMock.getHref()).toBe("/generate");
      });
    });

    it("should redirect to custom redirectTo path", async () => {
      const user = userEvent.setup();
      vi.mocked(fetchJson).mockResolvedValue({ user_id: "123", email: "test@example.com" });

      render(<LoginForm redirectTo="/custom-path" />);

      await user.type(screen.getByRole("textbox", { name: /e-mail/i }), "test@example.com");
      await user.type(screen.getByLabelText(/hasło/i), "password123");
      await user.click(screen.getByRole("button", { name: /zaloguj/i }));

      await waitFor(() => {
        expect(locationMock.getHref()).toBe("/custom-path");
      });
    });
  });

  describe("submission - errors", () => {
    it("should show neutral message for 401/403 errors", async () => {
      const user = userEvent.setup();
      const apiError = new ApiError(
        {
          type: "https://docs.app.dev/problems/auth/unauthorized",
          code: "UNAUTHORIZED",
          status: 401,
          detail: "Invalid credentials",
          title: "errors.auth.unauthorized",
        },
        "req-123"
      );
      vi.mocked(fetchJson).mockRejectedValue(apiError);

      render(<LoginForm />);

      await user.type(screen.getByRole("textbox", { name: /e-mail/i }), "test@example.com");
      await user.type(screen.getByLabelText(/hasło/i), "wrong");
      await user.click(screen.getByRole("button", { name: /zaloguj/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Nieprawidłowy e-mail lub hasło");
      });
    });

    it("should show error message for other API errors", async () => {
      const user = userEvent.setup();
      const apiError = new ApiError(
        {
          type: "https://docs.app.dev/problems/server/error",
          code: "SERVER_ERROR",
          status: 500,
          detail: "Server error",
          title: "errors.server.error",
        },
        "req-123"
      );
      vi.mocked(fetchJson).mockRejectedValue(apiError);

      render(<LoginForm />);

      await user.type(screen.getByRole("textbox", { name: /e-mail/i }), "test@example.com");
      await user.type(screen.getByLabelText(/hasło/i), "password123");
      await user.click(screen.getByRole("button", { name: /zaloguj/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Błąd logowania", {
          description: "Server error",
        });
      });
    });
  });
});

