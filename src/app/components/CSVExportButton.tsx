/**
 * Export all data as CSV files. Shows last exported time; triggers download of each CSV.
 */

import { useState } from "react";
import { formatDate } from "../utils/dateUtils";
import { generateAllCSVs, downloadBlob } from "../utils/csvExport";
import { toast } from "sonner";
import { FileDown } from "lucide-react";

const LAST_EXPORT_KEY = "cradl-last-csv-export";

function getLastExport(): number | null {
  try {
    const raw = localStorage.getItem(LAST_EXPORT_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

function setLastExport(): void {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
  } catch {}
}

export function CSVExportButton({ babyName }: { babyName?: string | null }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    try {
      const items = generateAllCSVs(babyName);
      if (items.length === 0) {
        toast.info("No data to export yet. Log some feeds, sleep or diapers first.");
        return;
      }
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const blob = new Blob([item.content], { type: "text/csv;charset=utf-8" });
        downloadBlob(blob, item.filename);
        if (i < items.length - 1 && typeof window !== "undefined" && window.setTimeout) {
          window.setTimeout(() => {}, 300);
        }
      }
      setLastExport();
      toast.success(`Export ready. ${items.length} file(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const last = getLastExport();
  const lastStr = last ? formatDate(last) : null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-2 py-2.5 px-4 rounded-xl border font-medium text-sm min-h-[44px]"
        style={{ borderColor: "var(--bd)", color: "var(--tx)", background: "var(--card)" }}
      >
        <FileDown className="w-5 h-5" />
        {exporting ? "Preparing…" : "Export all data as CSV"}
      </button>
      {lastStr && (
        <p className="text-[12px]" style={{ color: "var(--mu)" }}>
          Last exported: {lastStr}
        </p>
      )}
    </div>
  );
}
