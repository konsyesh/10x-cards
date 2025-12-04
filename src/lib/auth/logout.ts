import { fetchJson, ApiError } from "@/lib/http/http.fetcher";
import { toast } from "sonner";

const LOGOUT_ENDPOINT = "/api/auth/logout";
const LOGIN_ROUTE = "/auth/login";

/**
 * Wykonuje wylogowanie użytkownika z backendu, pokazuje toasty i przekierowuje na ekran logowania.
 * @param onSuccess Opcjonalna callback wywoływana zanim nastąpi przekierowanie.
 */
export async function performLogout(onSuccess?: () => void) {
  try {
    await fetchJson(LOGOUT_ENDPOINT, {
      method: "POST",
    });

    toast.success("Wylogowano pomyślnie");
    onSuccess?.();

    window.location.href = LOGIN_ROUTE;
  } catch (error) {
    if (error instanceof ApiError) {
      toast.error("Błąd wylogowania", {
        description: error.problem.detail || error.problem.title,
      });
    } else {
      toast.error("Błąd wylogowania", {
        description: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
      });
    }

    throw error;
  }
}
