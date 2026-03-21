/**
 * Cradl loading animation: cradle with bunny, twinkling stars, moon, clouds.
 * Sourced from redesign/cradl_loading_animation.html.
 */

import type { CSSProperties } from "react";

const ANIMATION_STYLES = `
@keyframes cradl-twinkle {
  0%, 100% { opacity: 0; transform: scale(0.8); }
  50% { opacity: 0.9; transform: scale(1); }
}
@keyframes cradl-moonFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes cradl-sway {
  0%, 100% { transform: translateX(-50%) rotate(-8deg); }
  50% { transform: translateX(-50%) rotate(8deg); }
}
@keyframes cradl-breathe {
  0%, 100% { transform: translateX(-50%) scaleY(1); }
  50% { transform: translateX(-50%) scaleY(0.96); }
}
@keyframes cradl-cloudDrift {
  from { transform: translateX(0); }
  to { transform: translateX(260px); }
}
@keyframes cradl-riseZ {
  0% { opacity: 0; transform: translateY(6px); }
  30%, 60% { opacity: 0.8; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-8px); }
}
@keyframes cradl-dotPulse {
  0%, 100% { opacity: 0.25; transform: scale(0.85); }
  50% { opacity: 0.9; transform: scale(1); }
}
`;

const scene: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 320,
  background: "#fffbf5",
  padding: "40px 20px",
  borderRadius: 24,
};

const sky: CSSProperties = {
  position: "relative",
  width: 240,
  height: 160,
  marginBottom: 24,
};

const starBase: CSSProperties = {
  position: "absolute",
  width: 4,
  height: 4,
  borderRadius: "50%",
  background: "#d4604a",
  opacity: 0,
  animation: "cradl-twinkle 3s ease-in-out infinite",
};

const moon: CSSProperties = {
  position: "absolute",
  top: 10,
  right: 20,
  animation: "cradl-moonFloat 4s ease-in-out infinite",
};

const cradleWrap: CSSProperties = {
  position: "absolute",
  bottom: 10,
  left: "50%",
  transform: "translateX(-50%)",
  animation: "cradl-sway 2.8s ease-in-out infinite",
  transformOrigin: "center top",
};

const rope: CSSProperties = {
  width: 2,
  height: 28,
  background: "#e8d0bc",
  margin: "0 auto",
  borderRadius: 1,
};

const cradleBody: CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  width: 84,
  height: 44,
  background: "#fff8f0",
  border: "2px solid #e8c8b0",
  borderRadius: "0 0 42px 42px",
  borderTop: "none",
};

const cradleTop: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  width: 84,
  height: 14,
  background: "#fde8d8",
  border: "2px solid #e8c8b0",
  borderRadius: 8,
  borderBottom: "none",
};

const canopy: CSSProperties = {
  position: "absolute",
  top: -10,
  left: -4,
  right: -4,
  width: 92,
  height: 18,
  background: "#fde8d8",
  border: "2px solid #d4a090",
  borderRadius: "46px 46px 0 0",
};

const bunny: CSSProperties = {
  position: "absolute",
  bottom: 12,
  left: "50%",
  transform: "translateX(-50%)",
  animation: "cradl-breathe 2.8s ease-in-out infinite",
};

const dots: CSSProperties = {
  display: "flex",
  gap: 7,
  alignItems: "center",
  marginTop: 4,
};

const dot: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#d4604a",
  opacity: 0.3,
  animation: "cradl-dotPulse 1.6s ease-in-out infinite",
};

const label: CSSProperties = {
  marginTop: 12,
  fontSize: 13,
  color: "#c4a090",
  letterSpacing: "0.04em",
  fontStyle: "italic",
};

const starPositions = [
  { top: 12, left: 30, size: 4, delay: 0 },
  { top: 8, left: 110, size: 3, delay: 0.6 },
  { top: 18, left: 190, size: 4, delay: 1.2 },
  { top: 35, left: 60, size: 3, delay: 0.3 },
  { top: 28, left: 155, size: 4, delay: 0.9 },
  { top: 42, left: 215, size: 3, delay: 1.5 },
  { top: 20, left: 80, size: 2, delay: 2 },
  { top: 50, left: 130, size: 2, delay: 1.8 },
];

export interface CradlLoadingAnimationProps {
  /** Optional label below the dots. */
  label?: string;
  /** If true, fill the viewport (e.g. for full-screen loading). */
  fullScreen?: boolean;
}

export function CradlLoadingAnimation({ label: customLabel, fullScreen }: CradlLoadingAnimationProps) {
  const text = customLabel ?? "Loading your little one's day…";

  return (
    <div
      style={{
        ...scene,
        ...(fullScreen ? { minHeight: "100dvh", background: "var(--bg, #fffbf5)" } : {}),
      }}
    >
      <style>{ANIMATION_STYLES}</style>

      <div style={sky}>
        {starPositions.map((s, i) => (
          <div
            key={i}
            style={{
              ...starBase,
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}

        <div
          style={{
            position: "absolute",
            background: "#fff5ee",
            borderRadius: 20,
            opacity: 0.7,
            top: 55,
            left: -10,
            width: 48,
            height: 18,
            animation: "cradl-cloudDrift 18s linear infinite",
          }}
        >
          <div style={{ position: "absolute", width: 22, height: 22, borderRadius: "50%", background: "#fff5ee", top: -10, left: 8 }} />
          <div style={{ position: "absolute", width: 16, height: 16, borderRadius: "50%", background: "#fff5ee", top: -7, left: 24 }} />
        </div>
        <div
          style={{
            position: "absolute",
            background: "#fff5ee",
            borderRadius: 20,
            opacity: 0.7,
            top: 75,
            left: 160,
            width: 36,
            height: 14,
            animation: "cradl-cloudDrift 14s linear infinite",
            animationDelay: "-7s",
          }}
        >
          <div style={{ position: "absolute", width: 18, height: 18, borderRadius: "50%", background: "#fff5ee", top: -8, left: 6 }} />
          <div style={{ position: "absolute", width: 12, height: 12, borderRadius: "50%", background: "#fff5ee", top: -5, left: 18 }} />
        </div>

        <div style={moon}>
          <svg width={36} height={36} viewBox="0 0 36 36" fill="none">
            <path
              d="M26 18a12 12 0 01-12 12 12 12 0 010-24 9 9 0 000 12 9 9 0 0012 0z"
              fill="#fde8d8"
              stroke="#d4a090"
              strokeWidth={1.5}
            />
          </svg>
        </div>

        <div style={{ position: "absolute", top: 30, right: 55, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          {[
            { size: 14, delay: 1 },
            { size: 12, delay: 0.5 },
            { size: 10, delay: 0 },
          ].map((z, i) => (
            <div
              key={i}
              style={{
                fontSize: z.size,
                fontWeight: 600,
                color: "#d4a0b4",
                opacity: 0,
                animation: "cradl-riseZ 3s ease-in-out infinite",
                animationDelay: `${z.delay}s`,
              }}
            >
              z
            </div>
          ))}
        </div>

        <div style={cradleWrap}>
          <div style={rope} />
          <div style={{ position: "relative", width: 84, height: 48 }}>
            <div style={canopy} />
            <div style={cradleTop} />
            <div style={cradleBody}>
              <div style={bunny}>
                <svg width={28} height={22} viewBox="0 0 28 22" fill="none">
                  <ellipse cx="14" cy="14" rx="8" ry="7" fill="#fff0e8" stroke="#d4a090" strokeWidth={1.2} />
                  <ellipse cx="9" cy="8" rx="3.5" ry="6" fill="#fff0e8" stroke="#d4a090" strokeWidth={1.2} transform="rotate(-15 9 8)" />
                  <ellipse cx="19" cy="8" rx="3.5" ry="6" fill="#fff0e8" stroke="#d4a090" strokeWidth={1.2} transform="rotate(15 19 8)" />
                  <ellipse cx="10" cy="8" rx="1.5" ry="3" fill="#fde8d8" transform="rotate(-15 10 8)" />
                  <ellipse cx="18" cy="8" rx="1.5" ry="3" fill="#fde8d8" transform="rotate(15 18 8)" />
                  <ellipse cx="11.5" cy="15.5" rx="1.2" ry="0.7" fill="#d4604a" opacity={0.4} />
                  <ellipse cx="16.5" cy="15.5" rx="1.2" ry="0.7" fill="#d4604a" opacity={0.4} />
                  <circle cx="14" cy="14" r="1" fill="#d4604a" opacity={0.5} />
                </svg>
              </div>
        </div>
        </div>
        </div>
      </div>

      <div style={dots}>
        <div style={dot} />
        <div style={{ ...dot, animationDelay: "0.25s" }} />
        <div style={{ ...dot, animationDelay: "0.5s" }} />
      </div>
      <div style={label}>{text}</div>
    </div>
  );
}
