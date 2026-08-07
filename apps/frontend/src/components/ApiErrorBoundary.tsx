"use client";

import { Component, ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  /**
   * Optional fallback to render.
   * If not provided, a default "Backend unavailable" card is shown.
   */
  fallback?: ReactNode;
  /** Label shown in the error card */
  label?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * ApiErrorBoundary
 *
 * Catches rendering errors from child components (including runtime errors
 * thrown inside hooks/containers when the backend is unavailable).
 *
 * Exposes a retry button that resets the boundary and re-renders children.
 *
 * Permanent Rule: Never show a blank page when the backend crashes.
 */
export class ApiErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message || "Unknown error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ApiErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-8 gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#ffb4ab] text-2xl">cloud_off</span>
          </div>
          <div>
            <p className="text-sm font-bold text-[#dfe2ee]">
              {this.props.label || "Backend Unavailable"}
            </p>
            <p className="text-xs text-[#bac9cc] mt-1 max-w-xs">
              The backend service could not be reached. Your data will load automatically when the connection is restored.
            </p>
            {this.state.errorMessage && (
              <p className="text-[11px] text-[#bac9cc]/50 mt-2 font-mono truncate max-w-xs">
                {this.state.errorMessage}
              </p>
            )}
          </div>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-white/5 text-[#dfe2ee] border border-white/10 hover:bg-white/10 hover:border-[#00e5ff]/30 transition-all"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
