import React from "react";
import { CandidateItem } from "./CandidateItem";
import type { CandidateVM } from "@/types";
import { useMediaQuery } from "@/hooks/use-mobile";

interface CandidatesListProps {
  items: CandidateVM[];
  onItemChange: (updated: CandidateVM) => void;
  onAccept: (localId: string) => void;
  onReject: (localId: string) => void;
  startIndex?: number;
  focusedCardIndex?: number;
  editingCardId?: string | null;
  onEditingCardChange?: (cardId: string | null) => void;
}

export const CandidatesList: React.FC<CandidatesListProps> = ({
  items,
  onItemChange,
  onAccept,
  onReject,
  startIndex = 0,
  focusedCardIndex = 0,
  editingCardId = null,
  onEditingCardChange,
}) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const layout = isMobile ? "card" : "row";

  if (items.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Brak kandydatów</p>
        <p className="text-xs text-slate-600 dark:text-slate-400">Wygeneruj kandydatów, aby zobaczyć je tutaj</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${layout === "card" ? "grid-cols-1" : "grid-cols-3"}`}>
      {items.map((item, idx) => (
        <CandidateItem
          key={item.localId}
          vm={item}
          onChange={onItemChange}
          onAccept={onAccept}
          onReject={onReject}
          index={startIndex + idx}
          isFocused={focusedCardIndex === idx}
          isEditing={editingCardId === item.localId}
          onEditingChange={onEditingCardChange}
        />
      ))}
    </div>
  );
};
