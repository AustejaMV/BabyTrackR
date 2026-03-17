/**
 * Prompts to write a time capsule at 6/12/24 month milestones.
 */

import { Link } from "react-router";
import type { TimeCapsuleTriggerResult } from "../utils/timeCapsuleTrigger";

export function TimeCapsulePromptCard({ trigger }: { trigger: TimeCapsuleTriggerResult }) {
  return (
    <Link
      to={`/time-capsule/write?weeks=${trigger.milestoneWeeks}`}
      className="block rounded-2xl border p-4 mb-3"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
    >
      <p className="text-[14px] font-medium mb-1" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
        A note to your past self
      </p>
      <p className="text-[13px]" style={{ color: "var(--mu)" }}>
        {trigger.message}
      </p>
      <span className="text-[12px] font-medium mt-2 inline-block" style={{ color: "var(--pink)" }}>
        Write it →
      </span>
    </Link>
  );
}
