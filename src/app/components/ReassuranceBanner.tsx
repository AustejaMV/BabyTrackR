/**
 * Shows one short reassurance line when alerts are present (Cradl Concierge).
 */

import { getReassuranceForKey } from "../utils/reassuranceUtils";
import type { WarningKey } from "../utils/warningUtils";

export function ReassuranceBanner({ warningKeys }: { warningKeys: WarningKey[] }) {
  const firstKey = warningKeys[0];
  if (!firstKey) return null;
  const line = getReassuranceForKey(firstKey);
  if (!line) return null;

  return (
    <p
      className="text-[12px] mt-1.5 px-2 leading-snug"
      style={{ color: "var(--mu)", fontFamily: "Georgia, serif" }}
      role="status"
    >
      {line}
    </p>
  );
}
