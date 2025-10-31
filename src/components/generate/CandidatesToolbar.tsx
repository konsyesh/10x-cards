import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Edit3, Zap } from "lucide-react";
import type { TotalsSummary } from "@/types";

interface CandidatesToolbarProps {
  totals: TotalsSummary;
  total: number;
}

export const CandidatesToolbar: React.FC<CandidatesToolbarProps> = ({ totals, total }) => {
  const pending = total - totals.accepted - totals.rejected;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <span className="text-sm font-semibold text-muted-foreground">Podsumowanie:</span>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1">
          <Zap className="h-3 w-3" />
          Razem: <span className="font-semibold">{total}</span>
        </Badge>

        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
          Zaakceptowane: <span className="font-semibold text-green-600 dark:text-green-400">{totals.accepted}</span>
        </Badge>

        <Badge variant="outline" className="gap-1">
          <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
          Odrzucone: <span className="font-semibold text-red-600 dark:text-red-400">{totals.rejected}</span>
        </Badge>

        <Badge variant="outline" className="gap-1">
          <Edit3 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          Edytowane: <span className="font-semibold text-blue-600 dark:text-blue-400">{totals.edited}</span>
        </Badge>

        {pending > 0 && (
          <Badge variant="outline" className="gap-1">
            <span className="font-semibold">{pending}</span> oczekuje
          </Badge>
        )}
      </div>
    </div>
  );
};
