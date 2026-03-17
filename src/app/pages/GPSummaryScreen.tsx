import { useMemo } from "react";
import { Link } from "react-router";
import { generateGPSummary } from "../utils/gpSummary";
import { format } from "date-fns";
import { Navigation } from "../components/Navigation";

export function GPSummaryScreen() {
  const summary = useMemo(() => generateGPSummary(14), []);

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Link to="/more" className="text-sm" style={{ color: "var(--pink)" }}>← Back</Link>
          <h1 className="text-xl font-serif" style={{ color: "var(--tx)" }}>Prepare for GP visit</h1>
          <span className="w-10" />
        </div>

        <div className="rounded-2xl border p-5 mb-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
          <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--mu)" }}>Summary for health visitor / GP</p>
          <p className="text-[12px] mb-4" style={{ color: "var(--mu)" }}>Generated {summary.generatedAt}</p>

          {summary.sections.map((sec) => (
            <div key={sec.title} className="mb-4 last:mb-0">
              <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--tx)" }}>{sec.title}</h2>
              <ul className="space-y-1 text-[13px]" style={{ color: "var(--tx)" }}>
                {sec.lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-[12px] mb-4" style={{ color: "var(--mu)" }}>
          Use the main report (More → Export) for a full PDF. This one-pager is for quick reference at the appointment.
        </p>

        <Link
          to="/more"
          className="block w-full py-3 rounded-xl text-center font-medium"
          style={{ background: "var(--pink)", color: "white" }}
        >
          Done
        </Link>
      </div>
      <Navigation />
    </div>
  );
}
