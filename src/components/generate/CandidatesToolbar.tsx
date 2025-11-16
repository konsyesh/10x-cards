import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Edit3, Zap, CheckSquare, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TotalsSummary } from "@/types";

interface CandidatesToolbarProps {
  totals: TotalsSummary;
  total: number;
  onAcceptAll?: () => void;
  onSave?: () => void;
  isLoading?: boolean;
}

export const CandidatesToolbar: React.FC<CandidatesToolbarProps> = ({
  totals,
  total,
  onAcceptAll,
  onSave,
  isLoading = false,
}) => {
  const pending = total - totals.accepted - totals.rejected;
  const hasItems = totals.accepted > 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
      {/* Badgi - info section */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1">
          <Zap className="h-3 w-3" />
          Razem: <span className="font-semibold">{total}</span>
        </Badge>

        {pending > 0 && (
          <Badge variant="outline" className="gap-1">
            <span className="font-semibold">{pending}</span> oczekuje
          </Badge>
        )}
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="h-3 w-3 text-success" />
          Zaakceptowane: <span className="font-semibold text-success">{totals.accepted}</span>
        </Badge>

        <Badge variant="outline" className="gap-1">
          <Edit3 className="h-3 w-3 text-info" />
          Edytowane: <span className="font-semibold text-info">{totals.edited}</span>
        </Badge>

        <Badge variant="outline" className="gap-1">
          <XCircle className="h-3 w-3 text-destructive" />
          Odrzucone: <span className="font-semibold text-destructive">{totals.rejected}</span>
        </Badge>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 w-full justify-end sm:w-auto sm:ml-auto">
        <Button
          onClick={onAcceptAll}
          variant="outline"
          size="sm"
          className="gap-2"
          aria-label="Zaakceptuj wszystkie karty"
        >
          <CheckSquare className="h-4 w-4" />
          {/* <span className="hidden sm:inline">Zaakceptuj wszystko</span> */}
        </Button>
        <Button
          onClick={onSave}
          disabled={!hasItems || isLoading}
          size="sm"
          className="gap-2"
          aria-label={`Zapisz ${totals.accepted} zaakceptowanych kart`}
        >
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">Zapisz</span> {hasItems && `(${totals.accepted})`}
        </Button>
      </div>
    </div>
  );
};
