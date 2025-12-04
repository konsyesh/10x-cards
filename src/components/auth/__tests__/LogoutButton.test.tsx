import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogoutButton } from "../LogoutButton";

vi.mock("@/lib/auth/logout", () => ({
  performLogout: vi.fn(),
}));

import { performLogout } from "@/lib/auth/logout";

describe("LogoutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render logout button", () => {
      render(<LogoutButton />);

      expect(screen.getByRole("button", { name: /wyloguj/i })).toBeInTheDocument();
    });

    it("should show loading text when logout is in progress", async () => {
      const user = userEvent.setup();
      vi.mocked(performLogout).mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          })
      );

      render(<LogoutButton />);

      await user.click(screen.getByRole("button"));

      expect(screen.getByText(/wylogowywanie.../i)).toBeInTheDocument();
    });
  });

  describe("logout flow", () => {
    it("calls performLogout helper with callback", async () => {
      const user = userEvent.setup();
      const onLogoutSuccess = vi.fn();
      vi.mocked(performLogout).mockImplementation(async (onSuccess?: () => void) => {
        onSuccess?.();
      });

      render(<LogoutButton onLogoutSuccess={onLogoutSuccess} />);

      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(onLogoutSuccess).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(performLogout).toHaveBeenCalledWith(onLogoutSuccess);
      });
    });

    it("resets loading state when performLogout rejects", async () => {
      const user = userEvent.setup();
      vi.mocked(performLogout).mockRejectedValue(new Error("boom"));

      render(<LogoutButton />);

      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByRole("button")).toHaveTextContent(/wyloguj/i);
      });
    });
  });
});
