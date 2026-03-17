/**
 * Jaundice monitoring: how to check, history, do a skin check.
 */

import { useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, Plus } from "lucide-react";
import { getJaundiceChecks } from "../utils/jaundiceStorage";
import { getJaundiceAgeDays } from "../utils/jaundiceAssessment";
import { useBaby } from "../contexts/BabyContext";
import { AddJaundiceCheckSheet } from "../components/AddJaundiceCheckSheet";
import { format } from "date-fns";

export function JaundiceMonitorScreen() {
  const { babyProfile } = useBaby();
  const [checks, setChecks] = useState(getJaundiceChecks());
  const [sheetOpen, setSheetOpen] = useState(false);

  const dob = babyProfile?.birthDate != null
    ? (typeof babyProfile.birthDate === "number" ? babyProfile.birthDate : new Date(babyProfile.birthDate).getTime())
    : null;
  const ageDays = getJaundiceAgeDays(dob);

  const refreshChecks = () => setChecks(getJaundiceChecks());

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <header className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3" style={{ background: "var(--bg)", borderColor: "var(--bd)" }}>
        <Link to="/more" className="p-2 -ml-2 rounded-full" aria-label="Back to More">
          <ChevronLeft className="w-5 h-5" style={{ color: "var(--tx)" }} />
        </Link>
        <h1 className="text-lg font-semibold flex-1" style={{ color: "var(--tx)" }}>
          Jaundice watch
        </h1>
      </header>

      <div className="px-4 py-4 space-y-6">
        {ageDays != null && ageDays < 21 && (
          <p className="text-[13px]" style={{ color: "var(--mu)" }}>
            Day {ageDays} — many newborns have some yellowing in the first week. Checking in good daylight helps you and your midwife spot if it needs attention.
          </p>
        )}

        <section>
          <h2 className="text-[14px] font-medium mb-2" style={{ color: "var(--tx)" }}>How to check</h2>
          <ul className="text-[13px] list-disc list-inside space-y-1" style={{ color: "var(--mu)" }}>
            <li>Check in good natural daylight (not under a dim or yellow light)</li>
            <li>Press gently on baby&apos;s skin — if it looks yellow where you pressed, note it</li>
            <li>See how far down the body the yellowing goes (face → chest → belly → arms/legs → palms or soles)</li>
          </ul>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[14px] font-medium" style={{ color: "var(--tx)" }}>Your checks</h2>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-1.5 py-2 px-3 rounded-xl text-[13px] font-medium"
              style={{ background: "var(--pink)", color: "white" }}
            >
              <Plus className="w-4 h-4" aria-hidden /> Do a skin check
            </button>
          </div>
          {checks.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--mu)" }}>
              No checks yet. Tap &quot;Do a skin check&quot; to record one.
            </p>
          ) : (
            <ul className="space-y-2">
              {checks.slice(0, 14).map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border p-3"
                  style={{ background: "var(--card)", borderColor: "var(--bd)" }}
                >
                  <span className="text-[13px] font-medium" style={{ color: "var(--tx)" }}>
                    {format(new Date(c.date), "d MMM yyyy")}
                    {c.time ? ` · ${c.time}` : ""}
                  </span>
                  <span className="text-[12px] block mt-0.5" style={{ color: "var(--mu)" }}>
                    {c.colour.replace(/_/g, " ")} {c.feedsLast24h != null ? `· ${c.feedsLast24h} feeds in 24h` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-[12px]" style={{ color: "var(--mu)" }}>
          This is not a substitute for professional assessment. If you&apos;re worried or baby is sleepy or not feeding well, contact your midwife or call 111.
        </p>
      </div>

      {sheetOpen && (
        <AddJaundiceCheckSheet
          onClose={() => setSheetOpen(false)}
          onSaved={refreshChecks}
        />
      )}
    </div>
  );
}
