import { useState, useCallback } from "react";
import { toast } from "sonner";
import { FlashcardsToolbar } from "./FlashcardsToolbar";
import { FlashcardsList } from "./FlashcardsList";
import { FlashcardModal } from "./FlashcardModal";
import { ConfirmModal } from "./ConfirmModal";
import { useFlashcardsList } from "@/components/hooks/use-flashcards-list";
import { useApi } from "@/components/hooks/use-api";
import type { FlashcardsViewState, UpdateFlashcardCommand, CreateFlashcardsCommand } from "@/types";

/**
 * Główny komponent strony fiszek z zarządzaniem stanem i interakcjami
 */
export const FlashcardsPage = () => {
  const { fetchJson } = useApi();
  const { flashcards, pagination, loading, error, search, sort, order, changePage, changeSort, changeSearch, refresh } =
    useFlashcardsList();

  // Stan modali i edycji
  const [viewState, setViewState] = useState<
    Omit<FlashcardsViewState, "flashcards" | "pagination" | "loading" | "error">
  >({
    search,
    sort,
    order,
    selectedFlashcard: null,
    modalType: null,
    showModal: false,
  });

  // Stan ładowania dla akcji
  const [actionLoading, setActionLoading] = useState(false);

  // Obsługa toolbar - wyszukiwanie
  const handleSearch = useCallback(
    (searchTerm: string) => {
      changeSearch(searchTerm);
      setViewState((prev) => ({ ...prev, search: searchTerm }));
    },
    [changeSearch]
  );

  // Obsługa toolbar - sortowanie
  const handleSortChange = useCallback(
    (newSort: typeof sort, newOrder: typeof order) => {
      changeSort(newSort, newOrder);
      setViewState((prev) => ({ ...prev, sort: newSort, order: newOrder }));
    },
    [changeSort]
  );

  // Obsługa toolbar - dodawanie nowej fiszki
  const handleAddClick = useCallback(() => {
    setViewState((prev) => ({
      ...prev,
      modalType: "create",
      showModal: true,
      selectedFlashcard: null,
    }));
  }, []);

  // Obsługa listy - edycja fiszki
  const handleEdit = useCallback(
    (id: number) => {
      const flashcard = flashcards.find((f) => f.id === id);
      if (flashcard) {
        setViewState((prev) => ({
          ...prev,
          modalType: "edit",
          showModal: true,
          selectedFlashcard: flashcard,
        }));
      }
    },
    [flashcards]
  );

  // Obsługa listy - usunięcie fiszki
  const handleDelete = useCallback(
    (id: number) => {
      const flashcard = flashcards.find((f) => f.id === id);
      if (flashcard) {
        setViewState((prev) => ({
          ...prev,
          modalType: "delete",
          showModal: true,
          selectedFlashcard: flashcard,
        }));
      }
    },
    [flashcards]
  );

  // Obsługa zapisania fiszki (create/edit)
  const handleSaveFlashcard = useCallback(
    async (data: UpdateFlashcardCommand) => {
      if (!viewState.selectedFlashcard && viewState.modalType !== "create") return;

      setActionLoading(true);
      try {
        if (viewState.modalType === "create") {
          // Tworzenie nowej fiszki
          const command: CreateFlashcardsCommand = {
            flashcards: [
              {
                front: data.front!,
                back: data.back!,
                source: "manual",
              },
            ],
            collection_id: null,
          };

          await fetchJson("/api/flashcards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(command),
          });

          toast.success("Fiszka została dodana pomyślnie");
        } else if (viewState.modalType === "edit" && viewState.selectedFlashcard) {
          // Edycja istniejącej fiszki
          await fetchJson(`/api/flashcards/${viewState.selectedFlashcard.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });

          toast.success("Fiszka została zaktualizowana pomyślnie");
        }

        // Odśwież listę i zamknij modal
        refresh();
        setViewState((prev) => ({
          ...prev,
          showModal: false,
          modalType: null,
          selectedFlashcard: null,
        }));
      } catch (err) {
        const apiError = err as { error: { code: string; message: string } };
        toast.error(`Błąd: ${apiError.error?.message || "Wystąpił błąd podczas zapisywania"}`);
      } finally {
        setActionLoading(false);
      }
    },
    [viewState.modalType, viewState.selectedFlashcard, fetchJson, refresh]
  );

  // Obsługa anulowania modala
  const handleCancelModal = useCallback(() => {
    setViewState((prev) => ({
      ...prev,
      showModal: false,
      modalType: null,
      selectedFlashcard: null,
    }));
  }, []);

  // Obsługa potwierdzenia usunięcia
  const handleConfirmDelete = useCallback(async () => {
    if (!viewState.selectedFlashcard) return;

    setActionLoading(true);
    try {
      await fetchJson(`/api/flashcards/${viewState.selectedFlashcard.id}`, {
        method: "DELETE",
      });

      toast.success("Fiszka została usunięta pomyślnie");

      // Odśwież listę i zamknij modal
      refresh();
      setViewState((prev) => ({
        ...prev,
        showModal: false,
        modalType: null,
        selectedFlashcard: null,
      }));
    } catch (err) {
      const apiError = err as { error: { code: string; message: string } };
      toast.error(`Błąd: ${apiError.error?.message || "Wystąpił błąd podczas usuwania"}`);
    } finally {
      setActionLoading(false);
    }
  }, [viewState.selectedFlashcard, fetchJson, refresh]);

  // Obsługa konfliktu edycji (jeśli będzie potrzebna)
  const handleConflict = useCallback(
    (action: "refresh" | "overwrite") => {
      if (action === "refresh") {
        // Odśwież dane
        refresh();
        toast.info("Dane zostały odświeżone");
      } else if (action === "overwrite") {
        // Można by tu zaimplementować force update, ale na razie tylko info
        toast.info("Próba nadpisania - funkcjonalność w trakcie implementacji");
      }
    },
    [refresh]
  );

  // Komunikaty dla modalu potwierdzenia
  const getConfirmMessage = () => {
    if (viewState.modalType === "delete" && viewState.selectedFlashcard) {
      return `Czy na pewno chcesz usunąć fiszkę "${viewState.selectedFlashcard.front.substring(0, 50)}${viewState.selectedFlashcard.front.length > 50 ? "..." : ""}"? Tej akcji nie można cofnąć.`;
    }
    return "Czy na pewno chcesz kontynuować?";
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <FlashcardsToolbar
        onSearch={handleSearch}
        onSortChange={handleSortChange}
        onAdd={handleAddClick}
        searchValue={search}
        sortValue={sort}
        orderValue={order}
      />

      {/* Lista fiszek */}
      <FlashcardsList flashcards={flashcards} onEdit={handleEdit} onDelete={handleDelete} />

      {/* Komunikat o ładowaniu */}
      {loading && (
        <div className="text-center py-4">
          <p className="text-muted-foreground">Ładowanie fiszek...</p>
        </div>
      )}

      {/* Komunikat o błędzie */}
      {error && (
        <div className="text-center py-4">
          <p className="text-destructive">Błąd ładowania: {error.error?.message || "Wystąpił błąd"}</p>
          <button onClick={refresh} className="mt-2 text-sm text-primary hover:underline">
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* Modal edycji/tworzenia fiszki */}
      <FlashcardModal
        isOpen={viewState.showModal && (viewState.modalType === "create" || viewState.modalType === "edit")}
        mode={viewState.modalType as "create" | "edit"}
        flashcard={viewState.selectedFlashcard || undefined}
        onSave={handleSaveFlashcard}
        onCancel={handleCancelModal}
        onConflict={viewState.modalType === "edit" ? handleConflict : undefined}
        isLoading={actionLoading}
      />

      {/* Modal potwierdzenia */}
      <ConfirmModal
        isOpen={viewState.showModal && viewState.modalType === "delete"}
        type="delete"
        message={getConfirmMessage()}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelModal}
        isLoading={actionLoading}
      />
    </div>
  );
};
