import { useState, type CSSProperties } from "react";
import { usePremium } from "../contexts/PremiumContext";
import { PremiumGate } from "./PremiumGate";
import { AskCradlSheet } from "./AskCradlSheet";

export function AskCradlFloatingButton() {
  const { isPremium } = usePremium();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

  const btn: CSSProperties = {
    position: "fixed",
    bottom: 80,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "var(--coral)",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 1000,
    padding: 0,
  };

  const handleTap = () => {
    if (isPremium) {
      setSheetOpen(true);
    } else {
      setGateOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        style={btn}
        onClick={handleTap}
        aria-label="Ask Cradl a question about your baby"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

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
