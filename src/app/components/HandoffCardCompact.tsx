import { useState } from "react";
import { DoorOpen } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useBaby } from "../contexts/BabyContext";
import { useLanguage } from "../contexts/LanguageContext";
import { generateHandoffSession, getHandoffShareUrl } from "../utils/handoffGenerator";

interface HandoffCardCompactProps {
  /** When true, no horizontal margin so card matches other compact cards (e.g. desktop left column). */
  compact?: boolean;
}

export function HandoffCardCompact({ compact }: HandoffCardCompactProps = {}) {
  const { t } = useLanguage();
  const { session } = useAuth();
  const { activeBaby } = useBaby();
  const [busy, setBusy] = useState(false);

  if (!session) return null;

  const handleTap = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const handoff = generateHandoffSession(activeBaby?.name ?? t("common.baby"), null);
      const url = getHandoffShareUrl(handoff);
      if (navigator.share) {
        await navigator.share({ title: "Cradl handoff", text: `Live summary for ${handoff.babyName}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t("handoff.linkCopied"));
      }
    } catch {
      toast.error(t("handoff.couldNotShare"));
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
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        minWidth: 0,
        background: "var(--card, #fff)",
        border: "1px solid #ede0d4",
        borderRadius: 14,
        margin: compact ? "0 0 8px" : "0 12px 8px",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <DoorOpen size={18} color="#8a6b5b" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500, color: "#2c1f1f", overflowWrap: "break-word" }}>
        {t("handoff.leavingNow")}
      </div>
      <span style={{ fontSize: 11, color: "#d4604a", fontWeight: 600, flexShrink: 0 }}>
        {t("handoff.share")}
      </span>
    </div>
  );
}
