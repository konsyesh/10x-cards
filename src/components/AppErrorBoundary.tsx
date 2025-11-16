/**
 * src/components/AppErrorBoundary.tsx
 *
 * React 19 Error Boundary do obsługi błędów w komponentach
 * Łapie niezaobsługiwane błędy i wyświetla fallback UI
 */

import React from "react";

interface AppErrorBoundaryProps {
  /** Elementy do monitorowania */
  children: React.ReactNode;
  /** Fallback UI w przypadku błędu */
  fallback?: React.ReactNode;
  /** Callback do obsługi błędu (np. logowanie) */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary komponent
 * Łapie JavaScript errors wewnątrz subtree i wyświetla fallback UI
 *
 * @example
 * <AppErrorBoundary
 *   fallback={<p>Coś poszło nie tak</p>}
 *   onError={(err, info) => console.error("Error:", err, info)}
 * >
 *   <MyComponent />
 * </AppErrorBoundary>
 */
export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Loguj do konsoli
    // eslint-disable-next-line no-console
    console.error("[AppErrorBoundary] Error caught:", error, errorInfo);

    // Callback dla custom obsługi (np. Sentry)
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <h2 className="text-lg font-semibold text-red-800">Coś poszło nie tak</h2>
            <p className="mt-2 text-sm text-red-700">{this.state.error?.message ?? "Nieznany błąd"}</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
