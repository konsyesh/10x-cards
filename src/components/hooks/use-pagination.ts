import { useState, useMemo, useCallback } from "react";
import type { PaginationState } from "@/types";

/**
 * Hook do obsługi lokalnej paginacji
 */
export const usePagination = <T,>(items: T[], perPage: number = 30) => {
  const [page, setPage] = useState(1);

  const state: PaginationState = useMemo(
    () => ({
      page,
      perPage,
      total: items.length,
    }),
    [page, perPage, items.length]
  );

  const totalPages = Math.ceil(items.length / perPage);

  const currentPageItems = useMemo(() => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return items.slice(start, end);
  }, [items, page, perPage]);

  const goToPage = useCallback((newPage: number) => {
    const maxPage = Math.max(1, totalPages);
    setPage(Math.min(Math.max(newPage, 1), maxPage));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(page + 1);
  }, [page, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(page - 1);
  }, [page, goToPage]);

  const reset = useCallback(() => {
    setPage(1);
  }, []);

  return {
    state,
    currentPageItems,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    reset,
  };
};
