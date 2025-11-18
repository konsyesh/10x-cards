import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import type { PaginationDTO } from "@/types";

interface FlashcardsPaginationProps {
  /** Dane paginacji */
  pagination: PaginationDTO;
  /** Callback dla zmiany strony */
  onPageChange: (page: number) => void;
  /** Czy trwa ładowanie */
  isLoading?: boolean;
}

/**
 * Komponent paginacji dla listy fiszek używający Shadcn/ui Pagination
 */
export const FlashcardsPagination = ({ pagination, onPageChange, isLoading = false }: FlashcardsPaginationProps) => {
  const { page, total_pages, total, per_page } = pagination;

  // Nie wyświetlaj paginacji jeśli jest tylko jedna strona
  if (total_pages <= 1) {
    return null;
  }

  // Oblicz zakres stron do wyświetlenia (maksymalnie 5 stron wokół bieżącej)
  const getVisiblePages = () => {
    const delta = 2; // ile stron po każdej stronie
    const range = [];
    const rangeWithDots = [];

    // Oblicz zakres
    const start = Math.max(2, page - delta);
    const end = Math.min(total_pages - 1, page + delta);

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    // Dodaj pierwszą stronę
    if (start > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    // Dodaj środkowe strony
    rangeWithDots.push(...range);

    // Dodaj ostatnią stronę
    if (end < total_pages - 1) {
      rangeWithDots.push("...", total_pages);
    } else if (total_pages > 1) {
      rangeWithDots.push(total_pages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();
  const hasPrevious = page > 1;
  const hasNext = page < total_pages;

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* Informacje o paginacji */}
      <div className="text-sm text-muted-foreground">
        Wyświetlanie {Math.min((page - 1) * per_page + 1, total)} - {Math.min(page * per_page, total)} z {total} fiszek
      </div>

      {/* Kontrolki paginacji */}
      <Pagination>
        <PaginationContent>
          {/* Poprzednia strona */}
          <PaginationItem>
            <PaginationPrevious
              onClick={() => hasPrevious && onPageChange(page - 1)}
              className={!hasPrevious || isLoading ? "pointer-events-none opacity-50" : "cursor-pointer"}
              aria-disabled={!hasPrevious}
            />
          </PaginationItem>

          {/* Numery stron */}
          {visiblePages.map((pageNum, index) => (
            <PaginationItem key={index}>
              {pageNum === "..." ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  onClick={() => onPageChange(pageNum as number)}
                  isActive={pageNum === page}
                  className={isLoading ? "pointer-events-none opacity-50" : "cursor-pointer"}
                >
                  {pageNum}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          {/* Następna strona */}
          <PaginationItem>
            <PaginationNext
              onClick={() => hasNext && onPageChange(page + 1)}
              className={!hasNext || isLoading ? "pointer-events-none opacity-50" : "cursor-pointer"}
              aria-disabled={!hasNext}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};
