import { useState, useEffect, useRef } from "react";
import { usePremium, daysLeftOnAdReward } from "../contexts/PremiumContext";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { Capacitor } from "@capacitor/core";

const SERIF = "'Lora', 'Georgia', serif";
const SANS = "'DM Sans', system-ui, sans-serif";
const BG = "#FAF7F2";
const TX = "#1C1915";
const ACCENT = "#C17D5E";
const MUTED = "#9A9590";
const MUTED2 = "#B8AFA8";
const MUTED3 = "#6B6560";
const DARK = "#1C1915";
const GREEN = "#7A9080";

const FEATURES = [
  { name: "Ask Cradl", desc: "Evidence-based answers to your questions, written in plain English. Not forum posts. Not Google. Up to 10 questions a day." },
  { name: "Sleep analysis", desc: "Sweet spot predictions, regression warnings before you panic, and schedule suggestions based on your baby's actual data." },
  { name: "Growth insights", desc: "WHO percentile charts with plain-English context — so you understand what the numbers actually mean." },
  { name: "Your week in words", desc: "A personal narrative of your baby's week, written for you. Something worth keeping." },
  { name: "Developmental leaps", desc: "Know what's coming and why she's unsettled — before you spend three nights convinced you've broken something." },
  { name: "GP visit prep", desc: "A one-page summary auto-generated for your appointment. No more trying to remember last Tuesday's feeds." },
  { name: "Family sharing", desc: "Share tracking with your partner, grandparents, or childminder in real time." },
  { name: "Memory book", desc: "Photos, captions, and auto-generated milestone entries. The first year goes fast." },
];

const PLANS = [
  { id: "monthly", label: "Monthly", price: "£3.99", cadence: "/month", badge: null, badgeColor: null },
  { id: "annual", label: "Annual", price: "£29.99", cadence: "/year", badge: "Save 37%", badgeColor: ACCENT },
  { id: "lifetime", label: "Lifetime", price: "£59.99", cadence: "one-time", badge: "Best value", badgeColor: GREEN },
];

function ctaLabel(planId: string): string {
  if (planId === "lifetime") return "Get lifetime access · £59.99";
  if (planId === "monthly") return "Subscribe · £3.99/mo";
  return "Subscribe · £29.99/yr";
}

function StatusBanner({ isPremium, purchaseSource, adDaysLeft, serif }: { isPremium: boolean; purchaseSource: string | null; adDaysLeft: number; serif: string }) {
  if (!isPremium) return null;
  return (
    <div style={{
      padding: "14px 16px",
      borderRadius: 14,
      background: "#ecf5ec",
      border: "1px solid #c8e0c8",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      <span style={{ display: "flex", alignItems: "center" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>
      <div>
        <div style={{ fontFamily: serif, fontSize: 14, fontWeight: 600, color: "#2a6a2a" }}>
          PRO is active
          {purchaseSource === "ad_reward" && adDaysLeft > 0 && ` · ${adDaysLeft} day${adDaysLeft !== 1 ? "s" : ""} left`}
          {purchaseSource === "testing" && " · Testing"}
        </div>
        <div style={{ fontSize: 12, color: "#5a8a5a" }}>
          {purchaseSource === "ad_reward" ? "Unlocked via video" : purchaseSource === "revenuecat" ? "Active subscription" : purchaseSource === "testing" ? "Test mode" : "All features unlocked"}
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, selected, onSelect }: { plan: typeof PLANS[number]; selected: boolean; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      style={{
        border: selected ? `2px solid ${ACCENT}` : "1px solid rgba(28,25,21,0.12)",
        borderRadius: 14,
        padding: "14px 10px",
        textAlign: "center",
        cursor: "pointer",
        background: selected ? "#FDF4EF" : "#FFFDF9",
        position: "relative",
        transition: "border-color 0.15s",
      }}
    >
      {plan.badge && (
        <div style={{
          position: "absolute",
          top: -9,
          left: "50%",
          transform: "translateX(-50%)",
          background: plan.badgeColor,
          color: "white",
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.05em",
          padding: "2px 8px",
          borderRadius: 100,
          whiteSpace: "nowrap",
        }}>
          {plan.badge}
        </div>
      )}
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 6, fontWeight: 400 }}>{plan.label}</div>
      <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: selected ? ACCENT : TX, lineHeight: 1, marginBottom: 2 }}>{plan.price}</div>
      <div style={{ fontSize: 10, color: MUTED2 }}>{plan.cadence}</div>
    </div>
  );
}

function VideoBlock({ onReward }: { onReward: () => void }) {
  return (
    <div style={{
      background: DARK,
      borderRadius: 18,
      padding: "18px 20px",
      color: BG,
    }}>
      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(250,247,242,0.4)", marginBottom: 8 }}>
        Not ready to commit?
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>
        Try PRO free for 7 days
      </div>
      <div style={{ fontSize: 13, color: "rgba(250,247,242,0.55)", lineHeight: 1.5, marginBottom: 14 }}>
        Watch a short video and get full access to every PRO feature for a week. No card required. You can do this as many times as you like.
      </div>
      <button
        type="button"
        onClick={onReward}
        style={{
          width: "100%",
          background: "rgba(193,125,94,0.15)",
          border: "1px solid rgba(193,125,94,0.4)",
          color: ACCENT,
          borderRadius: 100,
          padding: 12,
          fontFamily: SANS,
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          letterSpacing: "0.01em",
        }}
      >
        Watch a short video · 7 days free
      </button>
    </div>
  );
}

function ExtendBlock({ adDaysLeft, onReward, onSubscribe }: { adDaysLeft: number; onReward: () => void; onSubscribe: () => void }) {
  return (
    <div style={{
      background: DARK,
      borderRadius: 18,
      padding: "18px 20px",
      color: BG,
    }}>
      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(250,247,242,0.4)", marginBottom: 8 }}>
        Extend your access
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>
        {adDaysLeft} day{adDaysLeft !== 1 ? "s" : ""} remaining
      </div>
      <div style={{ fontSize: 13, color: "rgba(250,247,242,0.55)", lineHeight: 1.5, marginBottom: 14 }}>
        Watch another video to add 7 more days, or subscribe for uninterrupted access.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onReward}
          style={{ flex: 1, background: "rgba(193,125,94,0.15)", border: "1px solid rgba(193,125,94,0.4)", color: ACCENT, borderRadius: 100, padding: 12, fontFamily: SANS, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          + 7 days (video)
        </button>
        <button
          type="button"
          onClick={onSubscribe}
          style={{ flex: 1, background: ACCENT, color: "white", border: "none", borderRadius: 100, padding: 12, fontFamily: SANS, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          Subscribe
        </button>
      </div>
    </div>
  );
}

function FeaturesList() {
  return (
    <>
      {FEATURES.map((f, i) => (
        <div
          key={f.name}
          style={{
            display: "flex",
            gap: 14,
            padding: "14px 0",
            borderBottom: i < FEATURES.length - 1 ? "0.5px solid rgba(28,25,21,0.08)" : "none",
            alignItems: "flex-start",
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, marginTop: 7, flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: TX, marginBottom: 2 }}>{f.name}</div>
            <div style={{ fontSize: 13, color: MUTED3, lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        </div>
      ))}
    </>
  );
}

export function PremiumScreen() {
  const { isPremium, purchaseSource, unlockViaAd, purchasePackage, restorePurchases, presentWebPaywall } = usePremium();
  const adDaysLeft = daysLeftOnAdReward();
  const isDesktop = useIsDesktop();
  const [selectedPlan, setSelectedPlan] = useState("annual");
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const paywallContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const href = "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap";
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement("link");
      link.href = href;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
  }, []);

  const handleSubscribe = async () => {
    setPurchasing(true);
    setPurchaseError(null);
    try {
      const webKey = import.meta.env.VITE_RC_WEB_KEY || "";
      if (!Capacitor.isNativePlatform() && webKey) {
        const success = await purchasePackage(selectedPlan);
        if (!success) {
          setPurchaseError("Purchase was cancelled or failed. Try again or use the free trial below.");
        }
      } else if (Capacitor.isNativePlatform()) {
        const success = await purchasePackage(selectedPlan);
        if (!success) {
          setPurchaseError("Purchase was cancelled or failed. Try again.");
        }
      } else {
        setPurchaseError(
          "Web purchases are not configured yet. Use the 'Watch a video' option below for 7 free days, " +
          "or set VITE_RC_WEB_KEY in your environment."
        );
      }
    } catch {
      setPurchaseError("Something went wrong. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    setPurchaseError(null);
    try {
      const success = await restorePurchases();
      if (!success) {
        setPurchaseError("No previous purchases found. If you believe this is an error, contact support.");
      }
    } catch {
      setPurchaseError("Could not restore purchases. Try again later.");
    } finally {
      setRestoring(false);
    }
  };

  const handleAdReward = () => {
    unlockViaAd();
  };

  /* ─── Desktop layout ─── */
  if (isDesktop) {
    return (
      <div style={{ fontFamily: SANS, fontWeight: 300, background: BG, color: TX, minHeight: "calc(100vh - 56px)", overflowY: "auto" }}>
        {/* Hero — full width */}
        <div style={{ background: DARK, color: BG, padding: "48px 40px 40px", textAlign: "center" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ marginBottom: 14 }}>
              <img src="/logo-dark.png" alt="Cradl PRO" style={{ height: 32, objectFit: "contain" }} />
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 600, lineHeight: 1.2, marginBottom: 14 }}>
              For the nights when you need <em style={{ fontStyle: "italic", color: ACCENT }}>more than a log.</em>
            </div>
            <div style={{ fontSize: 15, color: "rgba(250,247,242,0.55)", lineHeight: 1.7, maxWidth: 420, margin: "0 auto" }}>
              The full picture of your baby's patterns — and what they mean for tonight.
            </div>
          </div>
        </div>

        {/* Status banner */}
        {isPremium && (
          <div style={{ maxWidth: 860, margin: "24px auto 0", padding: "0 40px" }}>
            <StatusBanner isPremium={isPremium} purchaseSource={purchaseSource} adDaysLeft={adDaysLeft} serif={SERIF} />
          </div>
        )}

        {/* Two-column body */}
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 40px 48px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 40, alignItems: "start" }}>
          {/* Left — features */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED2, marginBottom: 16 }}>
              What's included
            </div>
            <FeaturesList />
          </div>

          {/* Right — plans + CTA + video */}
          <div style={{ position: "sticky", top: 20 }}>
            {!isPremium && (
              <>
                <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED2, marginBottom: 14 }}>
                  Choose your plan
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
                  {PLANS.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} selected={selectedPlan === plan.id} onSelect={() => setSelectedPlan(plan.id)} />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={purchasing}
                  style={{
                    width: "100%",
                    background: ACCENT,
                    color: "white",
                    border: "none",
                    borderRadius: 100,
                    padding: 16,
                    fontFamily: SANS,
                    fontSize: 15,
                    fontWeight: 500,
                    cursor: purchasing ? "wait" : "pointer",
                    marginBottom: 12,
                    letterSpacing: "0.01em",
                    opacity: purchasing ? 0.7 : 1,
                  }}
                >
                  {purchasing ? "Processing…" : ctaLabel(selectedPlan)}
                </button>

                {purchaseError && (
                  <div style={{ fontSize: 13, color: "#b05040", background: "#fef2f0", borderRadius: 10, padding: "10px 14px", marginBottom: 12, lineHeight: 1.5 }}>
                    {purchaseError}
                  </div>
                )}

                <span
                  onClick={!restoring ? handleRestore : undefined}
                  style={{
                    display: "block",
                    textAlign: "center",
                    fontSize: 13,
                    color: ACCENT,
                    marginBottom: 24,
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                    opacity: restoring ? 0.6 : 1,
                  }}
                >
                  {restoring ? "Restoring…" : "Restore previous purchase"}
                </span>

                <VideoBlock onReward={handleAdReward} />
              </>
            )}

            {isPremium && purchaseSource === "ad_reward" && adDaysLeft > 0 && (
              <ExtendBlock adDaysLeft={adDaysLeft} onReward={handleAdReward} onSubscribe={handleSubscribe} />
            )}

            {/* Legal */}
            <div style={{ marginTop: 20, fontSize: 11, color: MUTED2, lineHeight: 1.6, textAlign: "center" }}>
              Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Prices may vary by region.
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Mobile layout ─── */
  return (
    <div style={{ fontFamily: SANS, fontWeight: 300, background: BG, color: TX, maxWidth: 480, margin: "0 auto", paddingBottom: 40, minHeight: "100dvh" }}>
      {/* Top bar */}
      <div
        onClick={() => window.history.back()}
        style={{ padding: "16px 20px 0", fontSize: 13, color: MUTED, cursor: "pointer" }}
      >
        ← Back
      </div>

      {/* Hero */}
      <div style={{ padding: "24px 24px 20px", textAlign: "center", background: DARK, color: BG }}>
        <div style={{ marginBottom: 10 }}>
          <img src="/logo-dark.png" alt="Cradl PRO" style={{ height: 26, objectFit: "contain" }} />
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, lineHeight: 1.2, marginBottom: 10 }}>
          For the nights when you need<br /><em style={{ fontStyle: "italic", color: ACCENT }}>more than a log.</em>
        </div>
        <div style={{ fontSize: 14, color: "rgba(250,247,242,0.6)", lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
          The full picture of your baby's patterns — and what they mean for tonight.
        </div>
      </div>

      {/* Active status banner */}
      {isPremium && (
        <div style={{ margin: "16px 20px 0" }}>
          <StatusBanner isPremium={isPremium} purchaseSource={purchaseSource} adDaysLeft={adDaysLeft} serif={SERIF} />
        </div>
      )}

      {/* Features */}
      <div style={{ padding: "24px 20px 8px", background: BG }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED2, marginBottom: 16 }}>
          What's included
        </div>
        <FeaturesList />
      </div>

      {/* Divider */}
      <div style={{ height: 0.5, background: "rgba(28,25,21,0.08)", margin: "4px 20px" }} />

      {/* Plans */}
      {!isPremium && (
        <>
          <div style={{ padding: "20px 20px 0" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED2, marginBottom: 14 }}>
              Choose your plan
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              {PLANS.map((plan) => (
                <PlanCard key={plan.id} plan={plan} selected={selectedPlan === plan.id} onSelect={() => setSelectedPlan(plan.id)} />
              ))}
            </div>

            <button
              type="button"
              onClick={handleSubscribe}
              disabled={purchasing}
              style={{
                width: "100%",
                background: ACCENT,
                color: "white",
                border: "none",
                borderRadius: 100,
                padding: 16,
                fontFamily: SANS,
                fontSize: 15,
                fontWeight: 500,
                cursor: purchasing ? "wait" : "pointer",
                marginBottom: 12,
                letterSpacing: "0.01em",
                opacity: purchasing ? 0.7 : 1,
              }}
            >
              {purchasing ? "Processing…" : ctaLabel(selectedPlan)}
            </button>

            {purchaseError && (
              <div style={{ fontSize: 13, color: "#b05040", background: "#fef2f0", borderRadius: 10, padding: "10px 14px", marginBottom: 12, lineHeight: 1.5 }}>
                {purchaseError}
              </div>
            )}

            <span
              onClick={!restoring ? handleRestore : undefined}
              style={{
                display: "block",
                textAlign: "center",
                fontSize: 13,
                color: ACCENT,
                marginBottom: 20,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                opacity: restoring ? 0.6 : 1,
              }}
            >
              {restoring ? "Restoring…" : "Restore previous purchase"}
            </span>
          </div>

          {/* Video block */}
          <div style={{ margin: "0 20px" }}>
            <VideoBlock onReward={handleAdReward} />
          </div>
        </>
      )}

      {/* Already premium — extend option */}
      {isPremium && purchaseSource === "ad_reward" && adDaysLeft > 0 && (
        <div style={{ margin: "16px 20px 0" }}>
          <ExtendBlock adDaysLeft={adDaysLeft} onReward={handleAdReward} onSubscribe={handleSubscribe} />
        </div>
      )}

      {/* Legal */}
      <div style={{ padding: "16px 20px 0", fontSize: 11, color: MUTED2, lineHeight: 1.6, textAlign: "center" }}>
        Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Prices may vary by region.
      </div>
    </div>
  );
}
