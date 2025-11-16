import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogoutButton } from "../LogoutButton";
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

describe("LogoutButton", () => {
  let locationMock: ReturnType<typeof mockWindowLocation>;

  beforeEach(() => {
    vi.clearAllMocks();
    locationMock = mockWindowLocation();
  });

  afterEach(() => {
    locationMock.restore();
  });

  describe("rendering", () => {
    it("should render logout button", () => {
      render(<LogoutButton />);

      expect(screen.getByRole("button", { name: /wyloguj/i })).toBeInTheDocument();
    });

    it("should show loading text when loading", async () => {
      const user = userEvent.setup();
      vi.mocked(fetchJson).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<LogoutButton />);

      await user.click(screen.getByRole("button"));

      expect(screen.getByText(/wylogowywanie.../i)).toBeInTheDocument();
    });
  });

  describe("logout flow", () => {
    it("should call logout endpoint and redirect", async () => {
      const user = userEvent.setup();
      vi.mocked(fetchJson).mockResolvedValue(undefined);

      render(<LogoutButton />);

      await user.click(screen.getByRole("button"));

      expect(fetchJson).toHaveBeenCalledWith("/api/auth/logout", {
        method: "POST",
      });
      expect(toast.success).toHaveBeenCalledWith("Wylogowano pomyślnie");
      expect(locationMock.getHref()).toBe("/auth/login");
    });

    it("should call onLogoutSuccess callback", async () => {
      const user = userEvent.setup();
      const onLogoutSuccess = vi.fn();
      vi.mocked(fetchJson).mockResolvedValue(undefined);

      render(<LogoutButton onLogoutSuccess={onLogoutSuccess} />);

      await user.click(screen.getByRole("button"));

      expect(onLogoutSuccess).toHaveBeenCalledTimes(1);
    });

    it("should handle API errors", async () => {
      const user = userEvent.setup();
      const apiError = new ApiError(
        {
          type: "https://docs.app.dev/problems/auth/logout_failed",
          code: "LOGOUT_FAILED",
          status: 500,
          detail: "Logout failed",
          title: "errors.auth.logout_failed",
        },
        "req-123"
      );
      vi.mocked(fetchJson).mockRejectedValue(apiError);

      render(<LogoutButton />);

      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Błąd wylogowania", {
          description: "Logout failed",
        });
      });
    });
  });
});

