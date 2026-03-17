/**
 * Empty state: illustration, title, body, optional actions. A11y-friendly.
 */

import type { ReactNode } from "react";

/** Built-in illustration keys for consistent empty states across the app. */
export const EMPTY_ILLUSTRATIONS = {
  baby: "👶",
  log: "📋",
  calendar: "📅",
  journey: "🌱",
  place: "📍",
  note: "📝",
} as const;

export type EmptyIllustrationKey = keyof typeof EMPTY_ILLUSTRATIONS;

export interface EmptyStateProps {
  /** Optional icon or illustration (emoji, SVG, or key from EMPTY_ILLUSTRATIONS). */
  illustration?: ReactNode | EmptyIllustrationKey;
  title: string;
  body: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  /** Compact style (smaller padding). */
  compact?: boolean;
}

export function EmptyState({
  illustration,
  title,
  body,
  primaryAction,
  secondaryAction,
  compact = false,
}: EmptyStateProps) {
  const resolvedIllustration =
    illustration != null && typeof illustration === "string" && illustration in EMPTY_ILLUSTRATIONS
      ? EMPTY_ILLUSTRATIONS[illustration as EmptyIllustrationKey]
      : illustration;
  return (
    <div
      className={`rounded-2xl border p-4 text-center ${compact ? "py-3 px-3" : "p-6"}`}
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="status"
      aria-label={title}
    >
      {resolvedIllustration != null && resolvedIllustration !== "" && (
        <div className="flex justify-center mb-3 text-3xl" aria-hidden>
          {resolvedIllustration}
        </div>
      )}
      <h3 className="text-[15px] font-medium mb-1" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
        {title}
      </h3>
      <p className="text-[13px] mb-4" style={{ color: "var(--mu)" }}>
        {body}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction.onClick}
            className="py-2.5 px-4 rounded-xl font-medium text-sm min-h-[44px]"
            style={{ background: "var(--pink)", color: "white" }}
          >
            {primaryAction.label}
          </button>
        )}
        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="py-2.5 px-4 rounded-xl border text-sm min-h-[44px]"
            style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
