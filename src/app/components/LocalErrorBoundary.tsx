import React from "react";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type State = { hasError: boolean };

/**
 * Small local error boundary to prevent non-critical UI (like VoiceControl)
 * from taking down the whole route when a browser API throws during render.
 */
export class LocalErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    // Keep it silent for users; log for devs.
    console.warn("[Cradl] LocalErrorBoundary caught error", err);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

