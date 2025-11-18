import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FlashcardsToolbarProps {
  /** Callback dla wyszukiwania */
  onSearch: (search: string) => void;
  /** Callback dla zmiany sortowania */
  onSortChange: (sort: string, order: "asc" | "desc") => void;
  /** Callback dla dodania nowej fiszki */
  onAdd: () => void;
  /** Aktualne wartości dla kontrolowanych komponentów */
  searchValue: string;
  sortValue: "created_at" | "updated_at" | "front";
  orderValue: "asc" | "desc";
}

/**
 * Pasek narzędzi z wyszukiwaniem, sortowaniem i przyciskiem dodawania nowej fiszki
 */
export const FlashcardsToolbar = ({
  onSearch,
  onSortChange,
  onAdd,
  searchValue,
  sortValue,
  orderValue,
}: FlashcardsToolbarProps) => {
  const [localSearch, setLocalSearch] = useState(searchValue);

  const handleSearchChange = (value: string) => {
    // Walidacja długości wyszukiwania (maks 255 znaków)
    if (value.length > 255) return;

    setLocalSearch(value);
    onSearch(value);
  };

  const handleSortChange = (value: string) => {
    // Format: "sort-order" np. "created_at-desc"
    const [sort, order] = value.split("-") as [typeof sortValue, typeof orderValue];
    onSortChange(sort, order);
  };

  const getSortDisplayValue = () => {
    return `${sortValue}-${orderValue}`;
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
      {/* Wyszukiwanie */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Szukaj w fiszkach..."
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
          aria-label="Pole wyszukiwania fiszek"
        />
      </div>

      {/* Sortowanie i dodawanie */}
      <div className="flex gap-2 items-center">
        <Select value={getSortDisplayValue()} onValueChange={handleSortChange}>
          <SelectTrigger className="w-48" aria-label="Wybór sortowania">
            <SelectValue placeholder="Sortuj według" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at-desc">Najnowsze najpierw</SelectItem>
            <SelectItem value="created_at-asc">Najstarsze najpierw</SelectItem>
            <SelectItem value="updated_at-desc">Ostatnio edytowane</SelectItem>
            <SelectItem value="updated_at-asc">Najdawniej edytowane</SelectItem>
            <SelectItem value="front-asc">Pytanie A-Z</SelectItem>
            <SelectItem value="front-desc">Pytanie Z-A</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={onAdd} className="flex items-center gap-2" aria-label="Dodaj nową fiszkę">
          <Plus className="h-4 w-4" />
          Dodaj fiszkę
        </Button>
      </div>
    </div>
  );
};
