/**
 * Renders children when premium; otherwise shows a styled paywall card
 * with upgrade + ad-reward CTAs.
 */
import { usePremium, daysLeftOnAdReward } from "../contexts/PremiumContext";

export interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const CORAL = "#d4604a";
const CREAM = "#fffbf5";
const BORDER = "#ede0d4";
const TEXT = "#3a2e28";
const MUTED = "#8a7e76";
const FONT = "system-ui, sans-serif";

function LockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={CORAL}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function AdRewardBadge() {
  const days = daysLeftOnAdReward();
  if (days <= 0) return null;
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontFamily: FONT,
        fontWeight: 600,
        color: "#fff",
        background: CORAL,
        borderRadius: 20,
        padding: "2px 10px",
        letterSpacing: 0.2,
      }}
    >
      PRO · {days} day{days !== 1 ? "s" : ""} left
    </span>
  );
}

export function PremiumGate({ feature, children, fallback }: PremiumGateProps) {
  const { isPremium, purchaseSource, unlockViaAd } = usePremium();

  if (isPremium) {
    return (
      <>
        {purchaseSource === "ad_reward" && (
          <div style={{ marginBottom: 8, textAlign: "right" }}>
            <AdRewardBadge />
          </div>
        )}
        {children}
      </>
    );
  }

  if (fallback) return <>{fallback}</>;

  const showRewardedAd = () => {
    unlockViaAd();
  };

  return (
    <div
      role="region"
      aria-label="Premium feature"
      style={{
        background: CREAM,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: "20px 18px",
        marginBottom: 12,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <LockIcon />
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: TEXT,
          }}
        >
          Premium Feature
        </span>
      </div>

      <p
        style={{
          fontSize: 13,
          color: MUTED,
          margin: "0 0 16px",
          lineHeight: 1.45,
        }}
      >
        {feature}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          type="button"
          onClick={() => (window.location.href = "/premium")}
          style={{
            width: "100%",
            padding: "10px 0",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONT,
            color: "#fff",
            background: CORAL,
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            letterSpacing: 0.2,
          }}
        >
          Upgrade to PRO
        </button>

        <button
          type="button"
          onClick={showRewardedAd}
          style={{
            width: "100%",
            padding: "10px 0",
            fontSize: 13,
            fontWeight: 500,
            fontFamily: FONT,
            color: CORAL,
            background: "transparent",
            border: `1px solid ${CORAL}`,
            borderRadius: 12,
            cursor: "pointer",
            letterSpacing: 0.2,
          }}
        >
          Watch a short video · unlock 7 days free
        </button>
      </div>

      <p
        style={{
          fontSize: 11,
          color: MUTED,
          margin: "12px 0 0",
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        Unlock all features with PRO, or earn free access by watching a quick
        video.
      </p>
    </div>
  );
}
