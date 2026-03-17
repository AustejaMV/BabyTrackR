/**
 * Renders children when premium; otherwise fallback or default paywall card.
 */
import { usePremium } from "../contexts/PremiumContext";

export interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PremiumGate({ feature, children, fallback }: PremiumGateProps) {
  const { isPremium } = usePremium();

  if (isPremium) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <div
      className="rounded-2xl border p-4 mb-3"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="region"
      aria-label="Premium feature"
    >
      <div className="flex items-center gap-2 mb-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="2" aria-hidden>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className="text-[14px] font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
          This is a Premium feature
        </span>
      </div>
      <p className="text-[13px] mb-3" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
        {feature}
      </p>
      <button
        type="button"
        onClick={() => alert("Premium upgrade will be available soon. For testing, set cradl-premium to true in localStorage.")}
        className="rounded-xl px-4 py-2.5 text-[13px] font-medium border"
        style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
      >
        Learn more
      </button>
    </div>
  );
}
