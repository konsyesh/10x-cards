import React, { useState, useReducer, useCallback, useEffect } from "react";
import { GenerateControls } from "./GenerateControls";
import { CandidatesSection } from "./CandidatesSection";
import { BulkSaveToolbar } from "./BulkSaveToolbar";
import { SaveSummaryModal } from "./SaveSummaryModal";
import { UnsavedChangesModal } from "./UnsavedChangesModal";
import { KeyboardShortcutsHint } from "./KeyboardShortcutsHint";
import { useGeneration } from "../hooks/use-generation";
import { useCandidates } from "../hooks/use-candidates";
import { usePagination } from "../hooks/use-pagination";
import { useSaveFlashcards } from "../hooks/use-save-flashcards";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";
import type { CandidateVM } from "@/types";

export const GenerateView: React.FC = () => {
  const [sourceText, setSourceText] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<() => void | null>(null);

  // Hooki
  const { state: generationState, generate, retry, reset: resetGeneration } = useGeneration();
  const { candidates, setCandidates, accept, reject, updateField, undo, getTotals, getAcceptedOnly } = useCandidates(
    []
  );

  const { currentPageItems, state: paginationState, goToPage, nextPage, prevPage } = usePagination(candidates, 30);

  const { state: saveState, saveFlashcards, reset: resetSave } = useSaveFlashcards();

  const totals = getTotals();
  const isGenerating = generationState.status === "loading";
  const hasUnsavedChanges = totals.accepted > 0;

  // Obsługa beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Obsługa generacji
  const handleGenerate = useCallback(async () => {
    const result = await generate(sourceText);
    if (result) {
      setCandidates(result);
    }
  }, [sourceText, generate, setCandidates]);

  // Obsługa retry
  const handleRetry = useCallback(async () => {
    const result = await retry(sourceText);
    if (result) {
      setCandidates(result);
    }
  }, [sourceText, retry, setCandidates]);

  // Obsługa edycji kandydata
  const handleCandidateChange = useCallback(
    (updated: CandidateVM) => {
      setCandidates(candidates.map((c) => (c.localId === updated.localId ? updated : c)));
    },
    [candidates, setCandidates]
  );

  // Obsługa zapisu
  const handleConfirmSave = async () => {
    const acceptedCandidates = getAcceptedOnly();
    const success = await saveFlashcards(acceptedCandidates);
    if (success) {
      setCandidates([]);
      setShowSaveModal(false);
      setSourceText("");
    }
  };

  // Skróty klawiaturowe
  useKeyboardShortcuts(
    {
      onAccept: () => {
        if (currentPageItems.length > 0) {
          accept(currentPageItems[0].localId);
        }
      },
      onEdit: () => {
        if (currentPageItems.length > 0) {
          // Logika edycji - otwórz modal lub ustaw mode edycji
        }
      },
      onReject: () => {
        if (currentPageItems.length > 0) {
          reject(currentPageItems[0].localId);
        }
      },
      onSave: () => {
        if (totals.accepted > 0) {
          setShowSaveModal(true);
        }
      },
      onPrevPage: prevPage,
      onNextPage: nextPage,
      onPrevCard: () => {
        // Poprzednia karta w bieżącej stronie
      },
      onNextCard: () => {
        // Następna karta w bieżącej stronie
      },
    },
    candidates.length > 0
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 pb-32 md:pb-8">
      {/* Nagłówek */}
      <div>
        <h1 className="text-3xl font-bold">Generuj Karty</h1>
        <p className="text-muted-foreground">Wklej tekst, a AI wygeneruje dla Ciebie kandydatów fiszek</p>
      </div>

      {/* Sekcja generacji */}
      <GenerateControls
        sourceText={sourceText}
        onSourceChange={setSourceText}
        generationState={generationState}
        onGenerate={handleGenerate}
        onRetry={handleRetry}
        isGenerating={isGenerating}
      />

      {/* Sekcja kandydatów */}
      {candidates.length > 0 && (
        <CandidatesSection
          items={currentPageItems}
          totals={totals}
          paginationState={paginationState}
          onItemChange={handleCandidateChange}
          onAccept={accept}
          onReject={reject}
          onGoToPage={goToPage}
          onNextPage={nextPage}
          onPrevPage={prevPage}
          startIndex={paginationState.page * paginationState.perPage - paginationState.perPage}
        />
      )}

      {/* Bulk Save Toolbar */}
      {candidates.length > 0 && (
        <BulkSaveToolbar
          acceptedCount={totals.accepted}
          acceptedEditedCount={totals.edited}
          isLoading={saveState.status === "loading"}
          onOpenSummary={() => setShowSaveModal(true)}
        />
      )}

      {/* Save Summary Modal */}
      <SaveSummaryModal
        isOpen={showSaveModal}
        acceptedUnedited={totals.accepted - totals.edited}
        acceptedEdited={totals.edited}
        isLoading={saveState.status === "loading"}
        error={saveState.status === "error" ? saveState.message : undefined}
        onConfirm={handleConfirmSave}
        onCancel={() => setShowSaveModal(false)}
      />

      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onSave={async () => {
          await handleConfirmSave();
          if (pendingNavigation) {
            pendingNavigation();
          }
        }}
        onDiscard={() => {
          setCandidates([]);
          setShowUnsavedModal(false);
          if (pendingNavigation) {
            pendingNavigation();
          }
        }}
        onCancel={() => setShowUnsavedModal(false)}
      />

      {/* Keyboard Shortcuts Hint */}
      <KeyboardShortcutsHint show={candidates.length > 0} />
    </div>
  );
};

export default GenerateView;
