/**
 * Empty state: illustration, title, body, optional actions. A11y-friendly.
 */

import type { ReactNode } from "react";

const iconSize = 48;

/** Built-in illustration keys for consistent empty states across the app. */
export const EMPTY_ILLUSTRATIONS: Record<string, ReactNode> = {
  baby: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--mu)" }}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
  ),
  log: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--mu)" }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
  ),
  calendar: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--mu)" }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
  ),
  journey: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--mu)" }}><path d="M12 22v-4" /><path d="M12 18a2 2 0 0 0 2-2V8" /><path d="M4 10a8 8 0 0 1 16 0" /><path d="M4 14h16" /></svg>
  ),
  place: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--mu)" }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
  ),
  note: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--mu)" }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
  ),
};

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
