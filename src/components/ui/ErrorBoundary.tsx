"use client";

import { Component, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Small render-error boundary for lists/modal content. One malformed record
 * (e.g. legacy data missing a field) should never take down the whole page —
 * the boundary shows a compact inline notice instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[TheBranchFarm] section render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="form-alert error" role="alert">
            <CircleAlert size={17} />
            {this.props.label || "This section could not be displayed. Refresh and try again."}
          </div>
        )
      );
    }
    return this.props.children;
  }
}
