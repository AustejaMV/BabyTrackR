import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useBaby } from "../contexts/BabyContext";
import { generateHandoffSession, getHandoffShareUrl } from "../utils/handoffGenerator";
import { saveHandoffSessionToServer } from "../utils/handoffApi";

const LAST_CARER_KEY = "cradl-last-carer-name";

export function HandoffGeneratorSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session: authSession } = useAuth();
  const { activeBaby } = useBaby();

  const [step, setStep] = useState<1 | 2>(1);
  const [headsUp, setHeadsUp] = useState("");
  const [carerName, setCarerName] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setHeadsUp("");
      setShareUrl("");
      setCopied(false);
      setGenerating(false);
      try {
        setCarerName(localStorage.getItem(LAST_CARER_KEY) ?? "");
      } catch {
        setCarerName("");
      }
    }
  }, [open]);

  const handleGenerate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);

    try {
      if (carerName.trim()) {
        localStorage.setItem(LAST_CARER_KEY, carerName.trim());
      }
    } catch { /* ignore */ }

    const handoff = generateHandoffSession(
      activeBaby?.name ?? "Baby",
      headsUp.trim() || null,
    );

    const url = getHandoffShareUrl(handoff);
    setShareUrl(url);

    if (authSession?.access_token) {
      await saveHandoffSessionToServer(handoff, authSession.access_token).catch(() => {});
    }

    setGenerating(false);
    setStep(2);
  }, [generating, activeBaby, headsUp, carerName, authSession]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }, [shareUrl]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Cradl handoff",
          text: `Live summary for ${activeBaby?.name ?? "Baby"}`,
          url: shareUrl,
        });
      } catch { /* cancelled */ }
    } else {
      await handleCopy();
    }
  }, [shareUrl, activeBaby, handleCopy]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl border-t"
        style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-8">
          {/* drag handle */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "var(--bd)" }} />

          {step === 1 && (
            <>
              <h2
                className="mb-4"
                style={{ fontFamily: "Georgia, serif", fontSize: 16, color: "var(--tx)", fontWeight: 500 }}
              >
                Leaving now
              </h2>

              <label
                className="block text-[13px] mb-1"
                style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}
              >
                Heads up
              </label>
              <textarea
                value={headsUp}
                onChange={(e) => setHeadsUp(e.target.value.slice(0, 300))}
                maxLength={300}
                rows={3}
                placeholder="Anything the carer should know..."
                className="w-full rounded-lg border px-3 py-2.5 text-[15px] resize-none mb-1"
                style={{
                  borderColor: "var(--bd)",
                  background: "var(--bg2)",
                  color: "var(--tx)",
                  fontFamily: "system-ui, sans-serif",
                }}
              />
              {headsUp.length > 200 && (
                <p
                  className="text-right text-[11px] mb-2"
                  style={{ color: headsUp.length >= 290 ? "var(--coral)" : "var(--mu)" }}
                >
                  {headsUp.length}/300
                </p>
              )}
              {headsUp.length <= 200 && <div className="mb-2" />}

              <label
                className="block text-[13px] mb-1"
                style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}
              >
                Carer's name
              </label>
              <input
                type="text"
                value={carerName}
                onChange={(e) => setCarerName(e.target.value.slice(0, 40))}
                maxLength={40}
                placeholder="e.g. Grandma"
                className="w-full rounded-lg border px-3 py-2.5 text-[15px] mb-5"
                style={{
                  borderColor: "var(--bd)",
                  background: "var(--bg2)",
                  color: "var(--tx)",
                  fontFamily: "system-ui, sans-serif",
                }}
              />

              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-3 rounded-xl text-white text-[15px] font-medium"
                style={{
                  background: "var(--coral)",
                  opacity: generating ? 0.7 : 1,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {generating ? "Generating..." : "Generate handoff card"}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2
                className="mb-4"
                style={{ fontFamily: "Georgia, serif", fontSize: 16, color: "var(--tx)", fontWeight: 500 }}
              >
                Handoff card ready
              </h2>

              <div
                className="rounded-lg border px-3 py-2.5 mb-3 overflow-x-auto"
                style={{
                  background: "var(--bg2)",
                  borderColor: "var(--bd)",
                  fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace",
                  fontSize: 13,
                  color: "var(--tx)",
                  wordBreak: "break-all",
                }}
              >
                {shareUrl}
              </div>

              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 py-2.5 rounded-xl border text-[14px] font-medium"
                  style={{
                    borderColor: "var(--bd)",
                    color: copied ? "var(--grn)" : "var(--tx)",
                    background: "var(--card)",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {copied ? "Copied! \u2713" : "Copy link"}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex-1 py-2.5 rounded-xl border-none text-white text-[14px] font-medium"
                  style={{ background: "var(--coral)", fontFamily: "system-ui, sans-serif" }}
                >
                  Share via...
                </button>
              </div>

              <p className="text-center text-[12px] mb-4" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                Expires in 24 hours
              </p>

              <button
                type="button"
                onClick={onClose}
                className="block mx-auto text-[14px] underline"
                style={{ color: "var(--mu)", background: "none", border: "none", fontFamily: "system-ui, sans-serif" }}
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
