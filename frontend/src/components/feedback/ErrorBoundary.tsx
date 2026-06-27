import { Component, type ErrorInfo, type ReactNode } from "react";
import i18n from "i18next";

import { Button } from "@/components/ui/Button";
import { logger } from "@/lib/logger";

type Props = { children: ReactNode };
type State = { hasError: boolean };

// Top-level catch for any render-time throw. Without it, a single uncaught error
// unmounts the whole app to a blank white screen with no recovery and no log.
// Renders a minimal, locale-aware fallback with a reload button and always logs
// the error (logger.error emits in production). Reads i18n.t directly — this is a
// class component, so no hooks; the catalog is already initialized at render.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error("ErrorBoundary", error, info.componentStack);
  }

  private readonly handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        className="grid min-h-dvh place-items-center bg-background p-4"
        role="alert"
      >
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <h1 className="text-row font-semibold text-text-primary">
            {i18n.t("errorBoundary.title")}
          </h1>
          <p className="text-body text-text-secondary">
            {i18n.t("errorBoundary.body")}
          </p>
          <Button onClick={this.handleReload}>
            {i18n.t("errorBoundary.reload")}
          </Button>
        </div>
      </main>
    );
  }
}
