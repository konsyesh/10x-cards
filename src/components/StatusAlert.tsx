"use client";

import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "default" | "destructive";

interface StatusAlertProps {
  title: string;
  description: string;
  variant?: AlertVariant;
  icon?: React.ReactNode;
  className?: string;
}

const defaultIcons: Record<AlertVariant, React.ReactNode> = {
  default: <Info className="h-4 w-4" />,
  destructive: <AlertCircle className="h-4 w-4" />,
};

export function StatusAlert({ title, description, variant = "default", icon, className }: StatusAlertProps) {
  const displayIcon = icon ?? defaultIcons[variant];

  return (
    <Alert variant={variant} className={cn("mb-4", className)}>
      {displayIcon}
      <AlertTitle className="font-semibold">{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
