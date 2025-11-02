import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface SourceTextareaProps {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
}

const MIN_CHARS = 1000;
const MAX_CHARS = 50000;

export const SourceTextarea: React.FC<SourceTextareaProps> = ({
  value,
  onChange,
  min = MIN_CHARS,
  max = MAX_CHARS,
}) => {
  const charCount = value.length;
  const isTooShort = charCount < min && charCount > 0;
  const isTooLong = charCount > max;
  const isInRange = charCount >= min && charCount <= max;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="source-text" className="text-base font-semibold">
          Tekst źródłowy
        </Label>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`font-medium ${isInRange ? "text-success" : isTooShort || isTooLong ? "text-destructive" : "text-muted-foreground"}`}
          >
            {charCount.toLocaleString("pl-PL")} / {max.toLocaleString("pl-PL")} znaków
          </span>
          {isInRange && <CheckCircle2 className="h-4 w-4 text-success" />}
        </div>
      </div>

      <Textarea
        id="source-text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Wklej tekst (min. ${min.toLocaleString("pl-PL")} znaków)...`}
        className="min-h-[200px] max-h-[200px] resize-none bg-secondary"
        aria-invalid={isTooShort || isTooLong}
        aria-describedby={isTooShort || isTooLong ? "char-error" : undefined}
      />

      {(isTooShort || isTooLong) && (
        <div id="char-error" className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            {isTooShort && (
              <p>Za mało znaków. Potrzebujesz co najmniej {(min - charCount).toLocaleString("pl-PL")} więcej.</p>
            )}
            {isTooLong && <p>Za dużo znaków. Usuń co najmniej {(charCount - max).toLocaleString("pl-PL")} znaków.</p>}
          </div>
        </div>
      )}
    </div>
  );
};
