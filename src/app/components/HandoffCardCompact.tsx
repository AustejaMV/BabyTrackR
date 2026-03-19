import { useState } from "react";
import { DoorOpen } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useBaby } from "../contexts/BabyContext";
import { generateHandoffSession, getHandoffShareUrl } from "../utils/handoffGenerator";

export function HandoffCardCompact() {
  const { session } = useAuth();
  const { activeBaby } = useBaby();
  const [busy, setBusy] = useState(false);

  if (!session) return null;

  const handleTap = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const handoff = generateHandoffSession(activeBaby?.name ?? "Baby", null);
      const url = getHandoffShareUrl(handoff);
      if (navigator.share) {
        await navigator.share({ title: "Cradl handoff", text: `Live summary for ${handoff.babyName}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch {
      toast.error("Could not share");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleTap}
      onKeyDown={(e) => e.key === "Enter" && handleTap()}
      style={{
        background: "var(--card, #fff)",
        border: "1px solid #ede0d4",
        borderRadius: 14,
        margin: "0 12px 8px",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <DoorOpen size={18} color="#8a6b5b" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "#2c1f1f", overflowWrap: "break-word" }}>
        Leaving now — share a live summary with your carer
      </div>
      <span style={{ fontSize: 11, color: "#d4604a", fontWeight: 600, flexShrink: 0 }}>
        Share →
      </span>
    </div>
  );
}
