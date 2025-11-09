import React, { useState, useCallback, useEffect, useRef } from "react";
import { GenerateControls } from "./GenerateControls";
import { CandidatesSection } from "./CandidatesSection";
import { SaveSummaryModal } from "./SaveSummaryModal";
import { UnsavedChangesModal } from "./UnsavedChangesModal";
import { KeyboardShortcutsHint } from "./KeyboardShortcutsHint";
import { useGeneration } from "../hooks/use-generation";
import { useCandidates } from "../hooks/use-candidates";
import { usePagination } from "../hooks/use-pagination";
import { useSaveFlashcards } from "../hooks/use-save-flashcards";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";
import { useNavigationInterceptor } from "@/lib/useNavigationInterceptor";
import type { CandidateVM } from "@/types";
import { toast } from "sonner";

export const GenerateView: React.FC = () => {
  const [sourceText, setSourceText] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [focusedCardIndex, setFocusedCardIndex] = useState<number>(0);
  const isNavigatingRef = useRef(false);
  // Hooki
  const { state: generationState, generate, retry } = useGeneration();
  const { candidates, setCandidates, accept, reject, getAcceptedOnly, getTotals, acceptAll } = useCandidates([]);

  const { currentPageItems, state: paginationState, goToPage, nextPage, prevPage } = usePagination(candidates, 30);

  const { state: saveState, saveFlashcards } = useSaveFlashcards();

  const totals = getTotals();
  const isGenerating = generationState.status === "loading";
  //   const hasUnsavedChanges = totals.accepted > 0;
  const hasUnsavedChanges = candidates.length > 0;
  const totalPages = Math.ceil(paginationState.total / paginationState.perPage);

  // ==========================================
  // Obsługa linków wewnętrznych (custom modal)
  // ==========================================
  const handleNavigationAttempt = useCallback((href: string) => {
    setPendingNavigationHref(href);
    setShowUnsavedModal(true);
  }, []);

  useNavigationInterceptor(handleNavigationAttempt, hasUnsavedChanges);

  // ==========================================
  // Fallback: beforeunload dla hard cases
  // ==========================================
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isNavigatingRef.current) return; // ← User już wybrał opcję, pozwól na nawigację
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // ==========================================
  // Obsługa toast'ów na zmiany saveState
  // ==========================================
  useEffect(() => {
    if (saveState.status === "success" && saveState.message) {
      toast.success("Sukces", {
        description: saveState.message, // "Pomyślnie zapisano X fiszek"
      });
    }
  }, [saveState.status, saveState.message]);

  useEffect(() => {
    if (saveState.status === "error" && saveState.message) {
      toast.error("Błąd przy zapisywaniu", {
        description: saveState.message,
      });
      // Opcjonalnie — logi diagnostyczne
      if (saveState.errorCode) {
        console.error("[GenerateView] Save error:", {
          code: saveState.errorCode,
          message: saveState.message,
        });
      }
    }
  }, [saveState.status, saveState.errorCode, saveState.message]);

  // ==========================================
  // Obsługa Unsaved Modal - Save
  // ==========================================
  const handleUnsavedModalSave = useCallback(async () => {
    const acceptedCandidates = getAcceptedOnly();
    const success = await saveFlashcards(acceptedCandidates);
    if (success) {
      isNavigatingRef.current = true; // ← FLAGA: Będziemy navigować
      setCandidates([]);
      setShowUnsavedModal(false);
      setSourceText("");
      setPendingNavigationHref(null);
      // Nawiguj
      if (pendingNavigationHref) {
        window.location.href = pendingNavigationHref;
      }
    }
  }, [saveFlashcards, getAcceptedOnly, setCandidates, pendingNavigationHref]);

  // ==========================================
  // Obsługa Unsaved Modal - Discard
  // ==========================================
  const handleUnsavedModalDiscard = useCallback(() => {
    isNavigatingRef.current = true; // ← FLAGA: Będziemy navigować
    setCandidates([]);
    setShowUnsavedModal(false);
    setPendingNavigationHref(null);
    // Nawiguj bez zapisu
    if (pendingNavigationHref) {
      window.location.href = pendingNavigationHref;
    }
  }, [setCandidates, pendingNavigationHref]);

  // ==========================================
  // Obsługa Unsaved Modal - Cancel
  // ==========================================
  const handleUnsavedModalCancel = useCallback(() => {
    setShowUnsavedModal(false);
    setPendingNavigationHref(null);
  }, []);

  // ==========================================
  // Effect: Scroll do karty z fokusem
  // ==========================================
  useEffect(() => {
    const focusedCard = document.getElementById(`card-${focusedCardIndex}`);
    focusedCard?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [focusedCardIndex]);

  // ==========================================
  // Obsługa generacji
  // ==========================================
  const handleGenerate = useCallback(async () => {
    const result = await generate(sourceText);
    if (result) {
      setCandidates(result);
    }
  }, [sourceText, generate, setCandidates]);

  const handleRetry = useCallback(async () => {
    const result = await retry(sourceText);
    if (result) {
      setCandidates(result);
    }
  }, [sourceText, retry, setCandidates]);

  const handleCandidateChange = useCallback(
    (updated: CandidateVM) => {
      setCandidates(candidates.map((c) => (c.localId === updated.localId ? updated : c)));
    },
    [candidates, setCandidates]
  );

  // ==========================================
  // Obsługa zapisu (z SaveSummaryModal)
  // ==========================================
  const handleConfirmSave = async () => {
    const acceptedCandidates = getAcceptedOnly();
    const success = await saveFlashcards(acceptedCandidates);
    if (success) {
      setCandidates([]);
      setShowSaveModal(false);
      setSourceText("");
    }
  };

  // ==========================================
  // Skróty klawiaturowe
  // ==========================================
  useKeyboardShortcuts(
    {
      onAccept: () => {
        if (currentPageItems.length > 0 && focusedCardIndex < currentPageItems.length) {
          accept(currentPageItems[focusedCardIndex].localId);
        }
      },
      onEdit: () => {
        if (currentPageItems.length > 0) {
          const cardToEdit = currentPageItems[focusedCardIndex];
          if (cardToEdit) {
            setEditingCardId(cardToEdit.localId);
          }
        }
      },
      onReject: () => {
        if (currentPageItems.length > 0 && focusedCardIndex < currentPageItems.length) {
          reject(currentPageItems[focusedCardIndex].localId);
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
        if (focusedCardIndex > 0) {
          setFocusedCardIndex(focusedCardIndex - 1);
        } else if (paginationState.page > 1) {
          prevPage();
          setFocusedCardIndex(currentPageItems.length - 1);
        }
      },
      onNextCard: () => {
        if (focusedCardIndex < currentPageItems.length - 1) {
          setFocusedCardIndex(focusedCardIndex + 1);
        } else if (paginationState.page < totalPages) {
          nextPage();
          setFocusedCardIndex(0);
        }
      },
    },
    candidates.length > 0 && !showSaveModal && !showUnsavedModal && !editingCardId
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
          focusedCardIndex={focusedCardIndex}
          editingCardId={editingCardId}
          onEditingCardChange={setEditingCardId}
          onAcceptAll={acceptAll}
          onSave={() => setShowSaveModal(true)}
          isLoading={saveState.status === "loading"}
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

      {/* Unsaved Changes Modal - dla linków wewnętrznych */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onSave={handleUnsavedModalSave}
        onDiscard={handleUnsavedModalDiscard}
        onCancel={handleUnsavedModalCancel}
        isLoading={saveState.status === "loading"}
      />

      {/* Keyboard Shortcuts Hint */}
      <KeyboardShortcutsHint show={candidates.length > 0} />
    </div>
  );
};

export default GenerateView;
