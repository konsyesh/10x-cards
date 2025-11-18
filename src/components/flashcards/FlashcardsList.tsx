import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FlashcardItem } from "./FlashcardItem";
import type { FlashcardListVM } from "@/types";

/**
 * Formatuje źródło fiszki na czytelny tekst z polskim tłumaczeniem
 */
const getSourceLabel = (source: string) => {
  switch (source) {
    case "manual":
      return "Ręcznie";
    case "ai-full":
      return "AI";
    case "ai-edited":
      return "Edytowana";
    default:
      return source;
  }
};

/**
 * Formatuje źródło na kolor badge'a
 */
const getSourceBadgeVariant = (source: string) => {
  switch (source) {
    case "manual":
      return "secondary";
    case "ai-full":
      return "default";
    case "ai-edited":
      return "outline";
    default:
      return "secondary";
  }
};

/**
 * Formatuje datę na czytelny format
 */
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Skraca tekst do maksymalnej długości z ellipsis
 */
const truncateText = (text: string, maxLength = 30) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
};

interface FlashcardsListProps {
  /** Lista fiszek do wyświetlenia */
  flashcards: FlashcardListVM[];
  /** Callback dla edycji fiszki */
  onEdit: (id: number) => void;
  /** Callback dla usunięcia fiszki */
  onDelete: (id: number) => void;
}

/**
 * Kontener dla listy fiszek z responsywnym widokiem (tabela/desktop, lista/mobile)
 */
export const FlashcardsList = ({ flashcards, onEdit, onDelete }: FlashcardsListProps) => {
  if (flashcards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">Brak fiszek do wyświetlenia</p>
        <p className="text-muted-foreground text-sm mt-2">Dodaj pierwszą fiszkę, aby rozpocząć naukę</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Widok desktop - tabela */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/3">Pytanie</TableHead>
              <TableHead className="w-1/3">Odpowiedź</TableHead>
              <TableHead className="w-1/6">Źródło</TableHead>
              <TableHead className="w-1/6">Zaktualizowano</TableHead>
              <TableHead className="w-16">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flashcards.map((flashcard) => (
              <TableRow key={flashcard.id}>
                <TableCell className="font-medium">{truncateText(flashcard.front, 50)}</TableCell>
                <TableCell className="text-muted-foreground">{truncateText(flashcard.back, 50)}</TableCell>
                <TableCell>
                  <Badge variant={getSourceBadgeVariant(flashcard.source) as any} className="text-xs">
                    {getSourceLabel(flashcard.source)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(flashcard.updated_at)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(flashcard.id)}
                      className="h-8 w-8 p-0"
                      aria-label="Edytuj fiszkę"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(flashcard.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      aria-label="Usuń fiszkę"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Widok mobilny - lista kart */}
      <div className="md:hidden space-y-3">
        {flashcards.map((flashcard) => (
          <FlashcardItem
            key={flashcard.id}
            flashcard={flashcard}
            onEdit={() => onEdit(flashcard.id)}
            onDelete={() => onDelete(flashcard.id)}
          />
        ))}
      </div>
    </div>
  );
};
