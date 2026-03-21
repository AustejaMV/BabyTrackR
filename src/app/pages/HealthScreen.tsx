/**
 * Health tab (Prompt 7): I need a moment, custom trackers, medication, health log, appointments, skin tracker.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { BreathingExerciseModal } from "../components/BreathingExerciseModal";
import { HealthHistorySection } from "../components/HealthHistorySection";
import { AppointmentsSection } from "../components/AppointmentsSection";
import { PainReliefCard } from "../components/PainReliefCard";
import { HealthLogDrawer } from "../components/HealthLogDrawer";
import { getCustomTrackers, getLogsForTracker } from "../utils/customTrackerStorage";
import { getIconDisplay } from "../data/customTrackerIcons";
import { formatTimeAndAgo } from "../utils/dateUtils";
import type { CustomTrackerDefinition } from "../types/customTracker";
import type { PainkillerDose } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { CreateCustomTrackerSheet } from "../components/CreateCustomTrackerSheet";
import { CustomTrackerDrawer } from "../components/CustomTrackerDrawer";
import { syncWidgetData } from "../plugins/CapacitorBridge";

const F = "system-ui, sans-serif";
const SECTION: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "var(--mu)", textTransform: "uppercase", letterSpacing: 0.8, padding: "10px 16px 4px", fontFamily: F };

export function HealthScreen() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [showBreathing, setShowBreathing] = useState(false);
  const [healthDrawerOpen, setHealthDrawerOpen] = useState(false);
  const [customTrackers, setCustomTrackers] = useState<CustomTrackerDefinition[]>([]);
  const [createTrackerOpen, setCreateTrackerOpen] = useState(false);
  const [trackerDrawerId, setTrackerDrawerId] = useState<string | null>(null);
  const [lastPainkiller, setLastPainkiller] = useState<PainkillerDose | null>(null);

  useEffect(() => {
    setCustomTrackers(getCustomTrackers());
  }, [createTrackerOpen, trackerDrawerId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("painkillerHistory");
      if (raw) {
        const doses = JSON.parse(raw) as PainkillerDose[];
        setLastPainkiller(doses.length > 0 ? doses[doses.length - 1] : null);
      } else setLastPainkiller(null);
    } catch { setLastPainkiller(null); }
  }, []);

  const hoursSinceLastDose = lastPainkiller ? Math.round((Date.now() - lastPainkiller.timestamp) / 3600000) : null;

  const logPainkiller = () => {
    const dose: PainkillerDose = { id: Date.now().toString(), timestamp: Date.now() };
    try {
      const raw = localStorage.getItem("painkillerHistory");
      const history = raw ? (JSON.parse(raw) as PainkillerDose[]) : [];
      history.push(dose);
      localStorage.setItem("painkillerHistory", JSON.stringify(history));
      setLastPainkiller(dose);
    } catch {}
  };


  return (
    <div style={{ minHeight: "100vh", paddingBottom: 88, background: "var(--bg)", fontFamily: F }}>
      <div style={{ padding: "16px 12px 8px" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#2c1f1f", margin: "0 4px 16px" }}>Health</h1>

        {/* 1. I need a moment — always first (Prompt 7) */}
        <button
          type="button"
          onClick={() => setShowBreathing(true)}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 14,
            background: "linear-gradient(135deg, #f0eef4, #f4ecf8)",
            border: "1px solid #e4d8ec",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
            fontFamily: F,
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(122,74,180,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7a4ab4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h0" />
            </svg>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#2c1f1f", fontFamily: "Lora, Georgia, serif" }}>I need a moment</div>
            <div style={{ fontSize: 11, color: "var(--mu)" }}>60-second breathing exercise</div>
          </div>
        </button>

        {/* 2. Custom trackers */}
        <div style={SECTION}>Custom trackers</div>
        <div style={{ background: "#fff", border: "1px solid #ede0d4", borderRadius: 14, margin: "0 12px 8px", padding: 12 }}>
          {customTrackers.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--mu)", marginBottom: 8 }}>Track vitamins, medicine, or anything else.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {customTrackers.map((t) => {
                const logs = getLogsForTracker(t.id);
                const lastLog = logs.length > 0 ? logs[0] : null;
                const ago = lastLog ? formatTimeAndAgo(lastLog.timestamp).ago : null;
                return (
                  <div
                    key={t.id}
                    onClick={() => setTrackerDrawerId(t.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: "pointer" }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4604a", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }} className="inline-flex items-center gap-1">
                      {getIconDisplay(t.icon)} <span style={{ fontSize: 13, fontWeight: 500, color: "#2c1f1f" }}>{t.name}</span>
                      {ago && <span style={{ fontSize: 11, color: "var(--mu)", marginLeft: 6 }}>{ago}</span>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#d4604a" }}>Log</span>
                  </div>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() => setCreateTrackerOpen(true)}
            style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: "#d4604a", background: "none", border: "none", cursor: "pointer" }}
          >
            + Add tracker
          </button>
        </div>

        {/* 3. Medication + Pain relief */}
        <div style={SECTION}>Medication & pain relief</div>
        <PainReliefCard hoursSinceLastDose={hoursSinceLastDose} onLog={logPainkiller} />

        {/* 4. Health log */}
        <div style={SECTION}>Health log</div>
        <div style={{ margin: "0 12px 8px" }}>
          <button
            type="button"
            onClick={() => setHealthDrawerOpen(true)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #ede0d4",
              background: "#fff",
              fontSize: 13,
              fontWeight: 600,
              color: "#2c1f1f",
              cursor: "pointer",
            }}
          >
            Log temperature, symptoms, medication
          </button>
          <HealthHistorySection />
        </div>

        {/* 5. Appointments */}
        <div style={SECTION}>Appointments</div>
        <div style={{ margin: "0 12px 8px" }}>
          <AppointmentsSection />
        </div>

        {/* Skin tracker */}
        <div style={SECTION}>Skin</div>
        <button
          type="button"
          onClick={() => navigate("/skin")}
          style={{
            width: "100%",
            margin: "0 12px 8px",
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid #ede0d4",
            background: "#fff",
            fontSize: 13,
            fontWeight: 600,
            color: "#2c1f1f",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          Skin tracker
          <span style={{ fontSize: 11, color: "#d4604a", fontWeight: 600 }}>Open →</span>
        </button>
      </div>

      <BreathingExerciseModal open={showBreathing} onClose={() => setShowBreathing(false)} />

      {healthDrawerOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setHealthDrawerOpen(false)}>
          <div style={{ width: "100%", maxWidth: 512, maxHeight: "90dvh", background: "#fff", borderRadius: "16px 16px 0 0", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <HealthLogDrawer onClose={() => setHealthDrawerOpen(false)} onSaved={() => { setHealthDrawerOpen(false); syncWidgetData(); }} />
          </div>
        </div>
      )}

      {createTrackerOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setCreateTrackerOpen(false)}>
          <div style={{ width: "100%", maxWidth: 512, maxHeight: "90dvh", background: "#fff", borderRadius: "16px 16px 0 0", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <CreateCustomTrackerSheet onClose={() => setCreateTrackerOpen(false)} onSaved={() => { setCustomTrackers(getCustomTrackers()); setCreateTrackerOpen(false); }} />
          </div>
        </div>
      )}

      {trackerDrawerId && (() => {
        const tracker = customTrackers.find((t) => t.id === trackerDrawerId);
        if (!tracker) return null;
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setTrackerDrawerId(null)}>
            <div style={{ width: "100%", maxWidth: 512, maxHeight: "90dvh", background: "#fff", borderRadius: "16px 16px 0 0", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
              <CustomTrackerDrawer tracker={tracker} onClose={() => setTrackerDrawerId(null)} onSaved={() => setTrackerDrawerId(null)} />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
