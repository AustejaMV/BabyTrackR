import { useState, useCallback } from "react";
import { usePremium } from "../contexts/PremiumContext";
import { PremiumGate } from "./PremiumGate";
import { AskCradlSheet } from "./AskCradlSheet";
import { CradlPullTab } from "./CradlPullTab";

/**
 * Ask Cradl + voice: both collapse into a right-edge pull tab (CradlPullTab).
 * Tap the collapsed tab, or swipe left, to reveal Ask Cradl and mic; keep swiping left to open Ask Cradl directly.
 * Tab snaps back after 2s if released without tapping.
 */
export function AskCradlFloatingButton() {
  const { isPremium } = usePremium();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

  const handleAskCradlClick = useCallback(() => {
    if (isPremium) {
      setSheetOpen(true);
    } else {
      setGateOpen(true);
    }
  }, [isPremium]);

  return (
    <>
      <CradlPullTab onAskCradlClick={handleAskCradlClick} />

      <AskCradlSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />

      {gateOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setGateOpen(false)}
        >
          <div
            style={{ maxWidth: 360, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <PremiumGate feature="Ask Cradl AI gives you instant, personalised answers about your baby's health, sleep, and feeding — powered by AI and reviewed by health professionals.">
              <span />
            </PremiumGate>
            <button
              type="button"
              onClick={() => setGateOpen(false)}
              style={{
                display: "block",
                margin: "12px auto 0",
                background: "none",
                border: "none",
                color: "var(--mu)",
                fontSize: 13,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
