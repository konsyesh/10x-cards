import type { ApiErrorResponse, ApiSuccessResponse } from "@/types";

interface UseApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

/**
 * Utility hook do obsługi API callów z mapowaniem envelopów
 */
export const useApi = () => {
  const fetchJson = async <T>(
    url: string,
    options: UseApiOptions = {}
  ): Promise<{ success: true; data: T } | { success: false; error: ApiErrorResponse }> => {
    const { method = "GET", headers = {}, body } = options;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const json = await response.json();

      if (!response.ok) {
        const errorResponse = json as ApiErrorResponse;
        return { success: false, error: errorResponse };
      }

      const successResponse = json as ApiSuccessResponse<T>;
      return { success: true, data: successResponse.data };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Nieznany błąd";
      return {
        success: false,
        error: {
          error: {
            code: "NETWORK_ERROR",
            message: error,
          },
          meta: {
            timestamp: new Date().toISOString(),
            status: "error",
          },
        },
      };
    }
  };

  return { fetchJson };
};
