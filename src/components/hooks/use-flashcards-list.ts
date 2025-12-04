import { useState, useEffect, useCallback } from "react";
import { useApi } from "./use-api";
import type {
  FlashcardListVM,
  ListFlashcardsQuery,
  FlashcardsListResponseDTO,
  ApiErrorResponse,
  PaginationDTO,
} from "@/types";

/**
 * Custom hook do zarządzania listą fiszek z API
 * Obsługuje paginację, wyszukiwanie (z debounce), sortowanie i ładowanie
 */
export const useFlashcardsList = () => {
  const { fetchJson } = useApi();

  // Stan hooka
  const [flashcards, setFlashcards] = useState<FlashcardListVM[]>([]);
  const [pagination, setPagination] = useState<PaginationDTO>({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorResponse | null>(null);

  // Parametry wyszukiwania
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"created_at" | "updated_at" | "front">("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  // Funkcja do ładowania fiszek z API
  const loadFlashcards = useCallback(
    async (query: ListFlashcardsQuery = {}) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (query.page) params.append("page", query.page.toString());
        if (query.per_page) params.append("per_page", query.per_page.toString());
        if (query.search) params.append("search", query.search);
        if (query.sort) params.append("sort", query.sort);
        if (query.order) params.append("order", query.order);

        const response: FlashcardsListResponseDTO = await fetchJson(`/api/flashcards?${params.toString()}`);

        // Konwertuj FlashcardDTO na FlashcardListVM
        const vmFlashcards: FlashcardListVM[] = response.flashcards.map((flashcard) => ({
          ...flashcard,
          isEditing: false,
          validationErrors: {},
        }));

        setFlashcards(vmFlashcards);
        setPagination(response.pagination);
      } catch (err) {
        const apiError = err as ApiErrorResponse;
        setError(apiError);
      } finally {
        setLoading(false);
      }
    },
    [fetchJson]
  );

  // Funkcja do debounced wyszukiwania
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (searchTerm: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setSearch(searchTerm);
        }, 300); // 300ms debounce
      };
    })(),
    []
  );

  // Efekt do automatycznego ładowania przy zmianie parametrów
  useEffect(() => {
    loadFlashcards({ page: 1, per_page: pagination.per_page, search, sort, order });
  }, [search, sort, order, loadFlashcards, pagination.per_page]);

  // Funkcje pomocnicze do zmiany parametrów
  const changePage = useCallback(
    (page: number) => {
      loadFlashcards({ page, per_page: pagination.per_page, search, sort, order });
    },
    [loadFlashcards, pagination.per_page, search, sort, order]
  );

  const changePerPage = useCallback(
    (per_page: number) => {
      setPagination((prev) => ({ ...prev, per_page }));
      loadFlashcards({ page: 1, per_page, search, sort, order });
    },
    [loadFlashcards, search, sort, order]
  );

  const changeSort = useCallback((newSort: typeof sort, newOrder: typeof order) => {
    setSort(newSort);
    setOrder(newOrder);
  }, []);

  const changeSearch = useCallback(
    (searchTerm: string) => {
      debouncedSearch(searchTerm);
    },
    [debouncedSearch]
  );

  // Funkcja do odświeżania danych
  const refresh = useCallback(() => {
    loadFlashcards({ page: pagination.page, per_page: pagination.per_page, search, sort, order });
  }, [loadFlashcards, pagination.page, pagination.per_page, search, sort, order]);

  return {
    // Stan
    flashcards,
    pagination,
    loading,
    error,
    search,
    sort,
    order,

    // Akcje
    loadFlashcards,
    changePage,
    changePerPage,
    changeSort,
    changeSearch,
    refresh,

    // Funkcje pomocnicze do aktualizacji lokalnego stanu
    setFlashcards,
  };
};
