import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, X, Edit2, RotateCcw } from "lucide-react";
import type { CandidateVM } from "@/types";

interface CandidateItemProps {
  vm: CandidateVM;
  onChange: (updated: CandidateVM) => void;
  onAccept: (localId: string) => void;
  onReject: (localId: string) => void;
  index: number;
  isFocused?: boolean;
  isEditing?: boolean;
  onEditingChange?: (cardId: string | null) => void;
}

const getDecisionColor = (decision: CandidateVM["decision"]): string => {
  const colors = {
    pending: "bg-muted text-muted-foreground",
    accepted: "bg-accent text-accent-foreground",
    rejected: "bg-destructive text-destructive-foreground",
    edited: "bg-secondary text-secondary-foreground",
  };
  return colors[decision];
};

const getDecisionLabel = (decision: CandidateVM["decision"]): string => {
  const labels = {
    pending: "Oczekuje",
    accepted: "Zaakceptowana",
    rejected: "Odrzucona",
    edited: "Zaakceptowana (edytowana)",
  };
  return labels[decision];
};

export const CandidateItem: React.FC<CandidateItemProps> = ({
  vm,
  onChange,
  onAccept,
  onReject,
  index,
  isFocused = false,
  isEditing: controlledIsEditing = false,
  onEditingChange,
}) => {
  const [isEditing, setIsEditing] = useState(controlledIsEditing);

  // Sync controlled isEditing state
  React.useEffect(() => {
    setIsEditing(controlledIsEditing);
  }, [controlledIsEditing]);

  const frontError = vm.validation.frontError;
  const backError = vm.validation.backError;
  const canAccept = !frontError && !backError;

  const handleFrontChange = (value: string) => {
    const isDirty = value !== vm.original.front || vm.back !== vm.original.back;
    onChange({
      ...vm,
      front: value,
      isDirty,
      source: isDirty ? "ai-edited" : "ai-full",
      validation: {
        ...vm.validation,
        frontError: value.length === 0 ? "Pole nie może być puste" : undefined,
      },
    });
  };

  const handleBackChange = (value: string) => {
    const isDirty = vm.front !== vm.original.front || value !== vm.original.back;
    onChange({
      ...vm,
      back: value,
      isDirty,
      source: isDirty ? "ai-edited" : "ai-full",
      validation: {
        ...vm.validation,
        backError: value.length === 0 ? "Pole nie może być puste" : undefined,
      },
    });
  };

  const handleUndo = () => {
    onChange({
      ...vm,
      front: vm.original.front,
      back: vm.original.back,
      source: "ai-full",
      isDirty: false,
      decision: "pending",
      validation: {},
    });
  };

  // Kompaktowy widok (domyślny dla row i card)
  if (!isEditing) {
    return (
      <Card
        id={`card-${index}`}
        className={`overflow-hidden border-border transition-all ${
          isFocused ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-background" : ""
        }`}
      >
        <CardContent className="p-3">
          <div className="space-y-3">
            {/* Header - Numer, Badge, i Ikony */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
                <Badge className={getDecisionColor(vm.decision)}>{getDecisionLabel(vm.decision)}</Badge>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onAccept(vm.localId)}
                  className="h-7 w-7 hover:bg-accent hover:text-accent-foreground"
                  aria-label={`Zaakceptuj kartę ${index + 1}`}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant={vm.isDirty ? "outline" : "ghost"}
                  onClick={() => {
                    setIsEditing(true);
                    onEditingChange?.(vm.localId);
                  }}
                  className={
                    vm.isDirty
                      ? //   ? "h-7 w-7 bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        "h-7 w-7 bg-accent/50 hover:bg-accent hover:text-accent-foreground"
                      : "h-7 w-7 hover:bg-accent hover:text-accent-foreground"
                  }
                  aria-label={`Edytuj kartę ${index + 1}`}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onReject(vm.localId)}
                  className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Odrzuć kartę ${index + 1}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Front */}
            <div className="font-medium text-sm text-foreground">{vm.front}</div>

            {/* Back */}
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Odpowiedź</div>
              <div className="text-sm text-foreground">{vm.back}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Rozszerzony widok (edycja)
  return (
    <Card id={`card-${index}`} className="overflow-hidden border-border">
      <CardContent className="p-3">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2 h-7">
            <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
            <Badge className={getDecisionColor(vm.decision)}>{getDecisionLabel(vm.decision)}</Badge>
          </div>

          {/* Front field */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor={`front-input-${vm.localId}`} className="text-xs font-semibold uppercase tracking-wide">
                Pytanie
              </label>
              <span className="text-xs text-muted-foreground"> {vm.front.length}/200 znaków</span>
            </div>
            <Input
              id={`front-input-${vm.localId}`}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus={isEditing}
              value={vm.front}
              onChange={(e) => handleFrontChange(e.target.value)}
              maxLength={200}
              className={frontError ? "border-red-500 focus:border-red-500" : ""}
              placeholder="Pytanie (maksymalnie 200 znaków)"
            />
            {frontError && (
              <div className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="h-3 w-3" />
                {frontError}
              </div>
            )}
          </div>

          {/* Back field */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor={`back-input-${vm.localId}`} className="text-xs font-semibold uppercase tracking-wide">
                Odpowiedź
              </label>
              <span className="text-xs text-muted-foreground">{vm.back.length}/500 znaków</span>
            </div>
            <Textarea
              id={`back-input-${vm.localId}`}
              value={vm.back}
              onChange={(e) => handleBackChange(e.target.value)}
              maxLength={500}
              className={`min-h-[80px] resize-none ${backError ? "border-red-500 focus:border-red-500" : ""}`}
              placeholder="Odpowiedź (maksymalnie 500 znaków)"
            />
            {backError && (
              <div className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="h-3 w-3" />
                {backError}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                setIsEditing(false);
                onEditingChange?.(null);
              }}
              disabled={!canAccept}
              className="flex-1"
            >
              <Check className="mr-1 h-3 w-3" />
              Gotowe
            </Button>
            {vm.isDirty && (
              <Button size="sm" variant="outline" onClick={handleUndo} className="flex-1">
                <RotateCcw className="mr-1 h-3 w-3" />
                Cofnij
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
