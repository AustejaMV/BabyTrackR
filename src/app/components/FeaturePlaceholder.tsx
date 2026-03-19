import { Lock } from "lucide-react";

interface FeaturePlaceholderProps {
  featureName: string;
  unlockCondition: string;
}

export function FeaturePlaceholder({
  featureName,
  unlockCondition,
}: FeaturePlaceholderProps) {
  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px dashed var(--bd)",
        borderRadius: 14,
        padding: 16,
        opacity: 0.7,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Lock size={20} style={{ color: "var(--mu)", flexShrink: 0 }} />
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--tx)",
            marginBottom: 2,
          }}
        >
          {featureName}
        </div>
        <div style={{ fontSize: 11, color: "var(--mu)" }}>
          Unlocks after {unlockCondition}
        </div>
      </div>
    </div>
  );
}
