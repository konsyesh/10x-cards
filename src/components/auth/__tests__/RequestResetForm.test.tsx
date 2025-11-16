import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestResetForm } from "../RequestResetForm";
import { fetchJson, ApiError } from "@/lib/http/http.fetcher";
import { toast } from "sonner";

vi.mock("@/lib/http/http.fetcher");
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("RequestResetForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render email input", () => {
      render(<RequestResetForm />);

      expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    });

    it("should show success message after submission", async () => {
      const user = userEvent.setup();
      vi.mocked(fetchJson).mockResolvedValue({ message: "Email sent" });

      render(<RequestResetForm />);

      await user.type(screen.getByLabelText(/e-mail/i), "test@example.com");
      await user.click(screen.getByRole("button", { name: /wyślij link resetujący/i }));

      await waitFor(() => {
        expect(screen.getByText(/sprawdź skrzynkę e-mail/i)).toBeInTheDocument();
      });
    });
  });

  describe("submission", () => {
    it("should send reset password request", async () => {
      const user = userEvent.setup();
      vi.mocked(fetchJson).mockResolvedValue({ message: "Email sent" });

      render(<RequestResetForm />);

      await user.type(screen.getByLabelText(/e-mail/i), "test@example.com");
      await user.click(screen.getByRole("button", { name: /wyślij link resetujący/i }));

      await waitFor(() => {
        expect(fetchJson).toHaveBeenCalledWith("/api/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ email: "test@example.com" }),
        });
      });
    });
  });
});

