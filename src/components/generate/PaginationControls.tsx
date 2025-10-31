import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { PaginationState } from "@/types";

interface PaginationControlsProps {
  state: PaginationState;
  onGoToPage: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  state,
  onGoToPage,
  onNextPage,
  onPrevPage,
}) => {
  const totalPages = Math.ceil(state.total / state.perPage);
  const isFirstPage = state.page === 1;
  const isLastPage = state.page === totalPages;

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="text-sm font-medium text-muted-foreground">
        Strona <span className="font-semibold">{state.page}</span> z{" "}
        <span className="font-semibold">{totalPages}</span>
        {state.total > 0 && (
          <>
            {" "}
            (<span className="font-semibold">{state.total}</span> kandydatów)
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onGoToPage(1)}
          disabled={isFirstPage}
          aria-label="Przejdź do pierwszej strony"
          title="Pierwsza strona (Alt+Home)"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onPrevPage}
          disabled={isFirstPage}
          aria-label="Poprzednia strona"
          title="Poprzednia strona (Alt+←)"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="px-2 text-sm font-medium">{state.page}</div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={isLastPage}
          aria-label="Następna strona"
          title="Następna strona (Alt+→)"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onGoToPage(totalPages)}
          disabled={isLastPage}
          aria-label="Przejdź do ostatniej strony"
          title="Ostatnia strona (Alt+End)"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
