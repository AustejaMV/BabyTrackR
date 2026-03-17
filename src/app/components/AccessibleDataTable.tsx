import type { ReactNode } from "react";

interface AccessibleDataTableProps {
  caption: string;
  headers: string[];
  rows: (string | number | ReactNode)[][];
  /** Optional id for aria-describedby from chart description */
  describedBy?: string;
}

/**
 * Table with caption and proper semantics for screen readers.
 */
export function AccessibleDataTable({ caption, headers, rows, describedBy }: AccessibleDataTableProps) {
  return (
    <table
      className="w-full border-collapse text-left"
      style={{ borderColor: "var(--bd)" }}
      aria-label={caption}
      {...(describedBy ? { "aria-describedby": describedBy } : {})}
    >
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} scope="col" className="border-b px-2 py-1.5 text-[12px] font-medium" style={{ borderColor: "var(--bd)", color: "var(--mu)" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td key={ci} className="border-b px-2 py-1.5 text-[13px]" style={{ borderColor: "var(--bd)", color: "var(--tx)" }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
