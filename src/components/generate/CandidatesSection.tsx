import React from "react";
import { CandidatesList } from "./CandidatesList";
import { CandidatesToolbar } from "./CandidatesToolbar";
import { PaginationControls } from "./PaginationControls";
import type { CandidateVM, TotalsSummary, PaginationState } from "@/types";

interface CandidatesSectionProps {
  items: CandidateVM[];
  totals: TotalsSummary;
  paginationState: PaginationState;
  onItemChange: (updated: CandidateVM) => void;
  onAccept: (localId: string) => void;
  onReject: (localId: string) => void;
  onGoToPage: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  startIndex?: number;
  focusedCardIndex?: number;
  editingCardId?: string | null;
  onEditingCardChange: (cardId: string | null) => void;
  onAcceptAll?: () => void;
  onSave?: () => void;
  isLoading?: boolean;
}

export const CandidatesSection: React.FC<CandidatesSectionProps> = ({
  items,
  totals,
  paginationState,
  onItemChange,
  onAccept,
  onReject,
  onGoToPage,
  onNextPage,
  onPrevPage,
  startIndex = 0,
  focusedCardIndex = 0,
  editingCardId = null,
  onEditingCardChange,
  onAcceptAll,
  onSave,
  isLoading = false,
}) => {
  const total = paginationState.total;

  return (
    <div className="space-y-4">
      {total > 0 && (
        <CandidatesToolbar
          totals={totals}
          total={total}
          onAcceptAll={onAcceptAll}
          onSave={onSave}
          isLoading={isLoading}
        />
      )}

      <CandidatesList
        items={items}
        onItemChange={onItemChange}
        onAccept={onAccept}
        onReject={onReject}
        startIndex={startIndex}
        focusedCardIndex={focusedCardIndex}
        editingCardId={editingCardId}
        onEditingCardChange={onEditingCardChange}
      />

      {total > 0 && (
        <PaginationControls
          state={paginationState}
          onGoToPage={onGoToPage}
          onNextPage={onNextPage}
          onPrevPage={onPrevPage}
        />
      )}
    </div>
  );
};
