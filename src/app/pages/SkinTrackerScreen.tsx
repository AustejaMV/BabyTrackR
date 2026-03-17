/**
 * Skin / eczema tracker: Flares | Creams | Triggers tabs.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router";
import { format } from "date-fns";
import { getSkinFlares, getSkinCreams, getSkinTriggers } from "../utils/skinStorage";
import { AddFlareSheet } from "../components/AddFlareSheet";
import { AddCreamSheet } from "../components/AddCreamSheet";
import { AddTriggerSheet } from "../components/AddTriggerSheet";
import type { SkinFlareEntry, SkinCreamEntry, SkinTriggerEntry } from "../types/skin";

export function SkinTrackerScreen() {
  const [tab, setTab] = useState<"flares" | "creams" | "triggers">("flares");
  const [flares, setFlares] = useState<SkinFlareEntry[]>([]);
  const [creams, setCreams] = useState<SkinCreamEntry[]>([]);
  const [triggers, setTriggers] = useState<SkinTriggerEntry[]>([]);
  const [sheet, setSheet] = useState<"flare" | "cream" | "trigger" | null>(null);

  const load = () => {
    setFlares(getSkinFlares());
    setCreams(getSkinCreams());
    setTriggers(getSkinTriggers());
  };
  useEffect(load, []);
  useEffect(load, [tab]);

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Link to="/more" className="text-sm" style={{ color: "var(--pink)" }}>← Back</Link>
          <h1 className="text-xl font-serif" style={{ color: "var(--tx)" }}>Skin & eczema</h1>
          <span className="w-10" />
        </div>

        <div className="flex gap-2 mb-4 border-b" style={{ borderColor: "var(--bd)" }}>
          {(["flares", "creams", "triggers"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="py-2 px-3 text-sm font-medium rounded-t-lg"
              style={{
                color: tab === t ? "var(--tx)" : "var(--mu)",
                borderBottom: tab === t ? "2px solid var(--amber-500, #f59e0b)" : "none",
                background: tab === t ? "var(--card)" : "transparent",
              }}
            >
              {t === "flares" ? "Flares" : t === "creams" ? "Creams" : "Triggers"}
            </button>
          ))}
        </div>

        {tab === "flares" && (
          <div className="space-y-3">
            <p className="text-[13px]" style={{ color: "var(--mu)" }}>
              Log flare-ups to spot patterns. Add cream and trigger logs to see correlations.
            </p>
            <button
              type="button"
              onClick={() => setSheet("flare")}
              className="w-full py-3 rounded-xl border font-medium text-sm"
              style={{ borderColor: "var(--amber-500)", color: "var(--tx)", background: "rgba(245,158,11,0.1)" }}
            >
              + Log flare
            </button>
            {flares.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--mu)" }}>No flares logged yet.</p>
            ) : (
              <ul className="space-y-2">
                {[...flares].reverse().slice(0, 20).map((f) => (
                  <li key={f.id} className="rounded-xl border p-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
                    <span className="text-[12px]" style={{ color: "var(--mu)" }}>{format(new Date(f.timestamp), "dd/MM/yyyy HH:mm")}</span>
                    <p className="text-[14px] mt-0.5" style={{ color: "var(--tx)" }}>Severity {f.severity}/5 · {f.bodyAreas.join(", ")}</p>
                    {f.note && <p className="text-[12px] mt-1" style={{ color: "var(--mu)" }}>{f.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "creams" && (
          <div className="space-y-3">
            <p className="text-[13px]" style={{ color: "var(--mu)" }}>Track which creams you use and where.</p>
            <button
              type="button"
              onClick={() => setSheet("cream")}
              className="w-full py-3 rounded-xl border font-medium text-sm"
              style={{ borderColor: "var(--amber-500)", color: "var(--tx)", background: "rgba(245,158,11,0.1)" }}
            >
              + Log cream
            </button>
            {creams.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--mu)" }}>No creams logged yet.</p>
            ) : (
              <ul className="space-y-2">
                {[...creams].reverse().slice(0, 20).map((c) => (
                  <li key={c.id} className="rounded-xl border p-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
                    <span className="text-[12px]" style={{ color: "var(--mu)" }}>{format(new Date(c.timestamp), "dd/MM/yyyy HH:mm")}</span>
                    <p className="text-[14px] mt-0.5" style={{ color: "var(--tx)" }}>{c.product} · {c.bodyAreas.join(", ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "triggers" && (
          <div className="space-y-3">
            <p className="text-[13px]" style={{ color: "var(--mu)" }}>Note possible triggers to see if they line up with flares.</p>
            <button
              type="button"
              onClick={() => setSheet("trigger")}
              className="w-full py-3 rounded-xl border font-medium text-sm"
              style={{ borderColor: "var(--amber-500)", color: "var(--tx)", background: "rgba(245,158,11,0.1)" }}
            >
              + Log trigger
            </button>
            {triggers.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--mu)" }}>No triggers logged yet.</p>
            ) : (
              <ul className="space-y-2">
                {[...triggers].reverse().slice(0, 20).map((t) => (
                  <li key={t.id} className="rounded-xl border p-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
                    <span className="text-[12px]" style={{ color: "var(--mu)" }}>{format(new Date(t.timestamp), "dd/MM/yyyy HH:mm")}</span>
                    <p className="text-[14px] mt-0.5" style={{ color: "var(--tx)" }}>{t.triggerType}: {t.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {sheet === "flare" && <AddFlareSheet onClose={() => setSheet(null)} onSaved={load} />}
        {sheet === "cream" && <AddCreamSheet onClose={() => setSheet(null)} onSaved={load} />}
        {sheet === "trigger" && <AddTriggerSheet onClose={() => setSheet(null)} onSaved={load} />}
      </div>
    </div>
  );
}
