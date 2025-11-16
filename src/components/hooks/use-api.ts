import { fetchJson, ApiError } from "@/lib/http/http.fetcher";

/**
 * Utility hook do obsługi API callów
 * Zwraca fetchJson() który:
 * - Zwraca raw data na sukces
 * - Rzuca ApiError na problem+json
 * - Automatycznie dodaje credentials: include
 */
export const useApi = () => {
  return { fetchJson, ApiError };
};
