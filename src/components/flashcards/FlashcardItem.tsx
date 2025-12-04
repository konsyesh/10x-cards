import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { FlashcardListVM } from "@/types";

/**
 * Formatuje źródło fiszki na czytelny tekst z polskim tłumaczeniem
 */
const getSourceLabel = (source: string) => {
  switch (source) {
    case "manual":
      return "Ręcznie dodana";
    case "ai-full":
      return "Wygenerowana przez AI";
    case "ai-edited":
      return "Edytowana z AI";
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
const truncateText = (text: string, maxLength = 50) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
};

interface FlashcardItemProps {
  /** Dane fiszki */
  flashcard: FlashcardListVM;
  /** Callback dla edycji */
  onEdit: () => void;
  /** Callback dla usunięcia */
  onDelete: () => void;
}

/**
 * Pojedynczy element listy fiszki z przyciskami akcji
 */
export const FlashcardItem = ({ flashcard, onEdit, onDelete }: FlashcardItemProps) => {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Front (pytanie) */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Pytanie</h3>
            <p className="text-base leading-relaxed break-words">{truncateText(flashcard.front, 100)}</p>
          </div>

          {/* Back (odpowiedź) */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Odpowiedź</h3>
            <p className="text-base leading-relaxed break-words text-muted-foreground">
              {truncateText(flashcard.back, 150)}
            </p>
          </div>

          {/* Metadane */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Badge variant={getSourceBadgeVariant(flashcard.source) as any}>{getSourceLabel(flashcard.source)}</Badge>
              <span className="text-xs text-muted-foreground">Zaktualizowano: {formatDate(flashcard.updated_at)}</span>
            </div>

            {/* Przyciski akcji */}
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0" aria-label="Edytuj fiszkę">
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                aria-label="Usuń fiszkę"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
