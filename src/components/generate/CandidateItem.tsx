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
}

const getDecisionColor = (decision: CandidateVM["decision"]): string => {
  const colors = {
    pending: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
    accepted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    edited: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
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

export const CandidateItem: React.FC<CandidateItemProps> = ({ vm, onChange, onAccept, onReject, index }) => {
  const [isEditing, setIsEditing] = useState(false);
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
      <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
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
                  //   disabled={!canAccept}
                  className="h-7 w-7 hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-950"
                  aria-label={`Zaakceptuj kartę ${index + 1}`}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant={vm.isDirty ? "outline" : "ghost"}
                  onClick={() => setIsEditing(true)}
                  className={
                    vm.isDirty
                      ? "h-7 w-7 bg-blue-50 text-blue-300 dark:bg-blue-900 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-950"
                      : "h-7 w-7 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-950"
                  }
                  aria-label={`Edytuj kartę ${index + 1}`}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onReject(vm.localId)}
                  className="h-7 w-7 text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
                  aria-label={`Odrzuć kartę ${index + 1}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Front */}
            <div className="font-medium text-sm text-slate-900 dark:text-slate-50">{vm.front}</div>

            {/* Back */}
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Odpowiedź</div>
              <div className="text-sm text-slate-700 dark:text-slate-300">{vm.back}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Rozszerzony widok (edycja)
  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
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
              <label htmlFor="front-input" className="text-xs font-semibold uppercase tracking-wide">
                Pytanie
              </label>
              <span className="text-xs text-muted-foreground"> {vm.front.length}/200 znaków</span>
            </div>
            <Input
              id="front-input"
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
              <label htmlFor="back-input" className="text-xs font-semibold uppercase tracking-wide">
                Odpowiedź
              </label>
              <span className="text-xs text-muted-foreground">{vm.back.length}/500 znaków</span>
            </div>
            <Textarea
              id="back-input"
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
              onClick={() => setIsEditing(false)}
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
