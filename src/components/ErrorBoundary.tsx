import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Shown above the retry button — customize per section (e.g. "This section"). */
  label?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render crashes AND failed lazy-chunk loads (e.g. a stale cached
 * page trying to fetch a JS chunk that no longer exists after a new
 * deploy, or a flaky mobile connection). Without this, React unmounts the
 * whole tree on any such error and the user is left on a permanent blank
 * white screen with no way to recover except manually closing the app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-warning" />
          <p className="text-sm font-medium text-foreground">
            {this.props.label || "Something went wrong loading this section."}
          </p>
          <p className="text-xs text-muted-foreground">
            This can happen after an app update or on a slow connection.
          </p>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={this.handleRetry}>
              <RotateCw className="h-3.5 w-3.5 mr-1.5" />
              Try Again
            </Button>
            <Button size="sm" onClick={this.handleReload}>
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
