/**
 * src/components/AppErrorBoundary.tsx
 *
 * React Error Boundary dla obsługi błędów komponentów
 * Łapie błędy w całym poddrzewie komponentów i wyświetla fallback UI
 */

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary - łapie błędy w poddrzewie React
 * Wyświetla fallback UI zamiast białego ekranu
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log do console w dev mode
    console.error("[AppErrorBoundary]", {
      error,
      errorInfo,
      timestamp: new Date().toISOString(),
    });

    // W production moglibyśmy wysłać do Sentry
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, { contexts: { react: errorInfo } });
    // }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              borderRadius: "0.5rem",
              backgroundColor: "#fee2e2",
              borderColor: "#fecaca",
              borderWidth: "1px",
            }}
          >
            <h2 style={{ color: "#991b1b", marginBottom: "0.5rem" }}>
              Coś poszło nie tak
            </h2>
            <p style={{ color: "#7f1d1d", fontSize: "0.875rem" }}>
              {this.state.error?.message || "Nieznany błąd"}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
              }}
            >
              Odśwież stronę
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

