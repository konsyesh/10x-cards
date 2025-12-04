import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockWindowLocation } from "@/tests/helpers/components.test-helpers";

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
import { toast } from "sonner";
import { performLogout } from "../logout";

describe("performLogout", () => {
  let locationMock: ReturnType<typeof mockWindowLocation>;

  beforeEach(() => {
    vi.clearAllMocks();
    locationMock = mockWindowLocation();
  });

  afterEach(() => {
    locationMock.restore();
  });

  it("calls fetchJson, shows success toast, fires callback, and redirects", async () => {
    const onSuccess = vi.fn();
    vi.mocked(fetchJson).mockResolvedValue(undefined);

    await performLogout(onSuccess);

    expect(fetchJson).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
    });
    expect(toast.success).toHaveBeenCalledWith("Wylogowano pomyślnie");
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(locationMock.getHref()).toBe("/auth/login");
  });

  it("shows RFC 7807 toast and rethrows ApiError", async () => {
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

    await expect(performLogout()).rejects.toBe(apiError);

    expect(toast.error).toHaveBeenCalledWith("Błąd wylogowania", {
      description: "Logout failed",
    });
  });

  it("shows fallback toast and rethrows on unexpected error", async () => {
    const genericError = new Error("network");
    vi.mocked(fetchJson).mockRejectedValue(genericError);

    await expect(performLogout()).rejects.toBe(genericError);

    expect(toast.error).toHaveBeenCalledWith("Błąd wylogowania", {
      description: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
    });
  });
});
