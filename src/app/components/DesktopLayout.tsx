import { type ReactNode, useState, useCallback, useRef, useEffect } from "react";

interface DesktopLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  nightMode?: boolean;
}

const STORAGE_KEY = "cradl-desktop-cols";
const MIN_LEFT = 180;
const MIN_RIGHT = 200;
const MIN_CENTER = 360;
const DEFAULT_LEFT = 256;
const DEFAULT_RIGHT = 274;

function loadSizes(): { left: number; right: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.left === "number" && typeof parsed.right === "number") {
        return { left: Math.max(MIN_LEFT, parsed.left), right: Math.max(MIN_RIGHT, parsed.right) };
      }
    }
  } catch {}
  return { left: DEFAULT_LEFT, right: DEFAULT_RIGHT };
}

function saveSizes(left: number, right: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, right }));
  } catch {}
}

function getScrollbarCSS(nm: boolean) {
  const thumbBg = nm ? "rgba(255,255,255,0.12)" : "#ede0d4";
  const handleBg = nm ? "rgba(255,255,255,0.1)" : "#ede0d4";
  const handleDotBg = nm ? "rgba(255,255,255,0.2)" : "#d4c8b8";
  return `
.desktop-col::-webkit-scrollbar { width: 4px; }
.desktop-col::-webkit-scrollbar-track { background: transparent; }
.desktop-col::-webkit-scrollbar-thumb { background: ${thumbBg}; border-radius: 2px; }
.desktop-resize-handle {
  width: 6px;
  cursor: col-resize;
  background: transparent;
  position: relative;
  flex-shrink: 0;
  z-index: 10;
  transition: background 0.15s;
}
.desktop-resize-handle:hover,
.desktop-resize-handle.active {
  background: ${handleBg};
}
.desktop-resize-handle::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 24px;
  border-radius: 1px;
  background: ${handleDotBg};
  opacity: 0;
  transition: opacity 0.15s;
}
.desktop-resize-handle:hover::after,
.desktop-resize-handle.active::after {
  opacity: 1;
}
`;
}

export function DesktopLayout({ left, center, right, nightMode }: DesktopLayoutProps) {
  const [sizes, setSizes] = useState(loadSizes);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"left" | "right" | null>(null);
  const startX = useRef(0);
  const startSizes = useRef({ left: 0, right: 0 });

  const clamp = useCallback((newLeft: number, newRight: number): { left: number; right: number } => {
    const totalW = containerRef.current?.clientWidth ?? 1200;
    let l = Math.max(MIN_LEFT, newLeft);
    let r = Math.max(MIN_RIGHT, newRight);
    if (l + r + MIN_CENTER > totalW) {
      const excess = l + r + MIN_CENTER - totalW;
      if (dragging.current === "left") l = Math.max(MIN_LEFT, l - excess);
      else r = Math.max(MIN_RIGHT, r - excess);
    }
    return { left: l, right: r };
  }, []);

  const onPointerDown = useCallback((side: "left" | "right", e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = side;
    startX.current = e.clientX;
    startSizes.current = { left: sizes.left, right: sizes.right };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    (e.target as HTMLElement).classList.add("active");
  }, [sizes]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    let newLeft = startSizes.current.left;
    let newRight = startSizes.current.right;
    if (dragging.current === "left") newLeft += dx;
    else newRight -= dx;
    setSizes(clamp(newLeft, newRight));
  }, [clamp]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = null;
    (e.target as HTMLElement).classList.remove("active");
    setSizes((cur) => {
      saveSizes(cur.left, cur.right);
      return cur;
    });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setSizes((cur) => {
        const totalW = containerRef.current?.clientWidth ?? 1200;
        if (cur.left + cur.right + MIN_CENTER > totalW) {
          const scale = (totalW - MIN_CENTER) / (cur.left + cur.right);
          return {
            left: Math.max(MIN_LEFT, Math.round(cur.left * scale)),
            right: Math.max(MIN_RIGHT, Math.round(cur.right * scale)),
          };
        }
        return cur;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const nm = !!nightMode;
  const sideBg = nm ? "#130f1c" : "#fffdf8";
  const borderCol = nm ? "rgba(255,255,255,0.08)" : "#ede0d4";

  return (
    <>
      <style>{getScrollbarCSS(nm)}</style>
      <div
        ref={containerRef}
        style={{
          display: "flex",
          height: "calc(100vh - 56px)",
          overflow: "hidden",
          transition: "background 0.6s",
        }}
      >
        <div
          className="desktop-col"
          style={{
            width: sizes.left,
            minWidth: MIN_LEFT,
            flexShrink: 0,
            overflowY: "auto",
            background: sideBg,
            borderRight: `1px solid ${borderCol}`,
            padding: 18,
            transition: "background 0.6s, border-color 0.6s",
          }}
        >
          {left}
        </div>

        <div
          className="desktop-resize-handle"
          onPointerDown={(e) => onPointerDown("left", e)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          role="separator"
          aria-label="Resize left panel"
        />

        <div
          className="desktop-col"
          style={{
            flex: 1,
            minWidth: MIN_CENTER,
            overflowY: "auto",
            padding: 18,
          }}
        >
          {center}
        </div>

        <div
          className="desktop-resize-handle"
          onPointerDown={(e) => onPointerDown("right", e)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          role="separator"
          aria-label="Resize right panel"
        />

        <div
          className="desktop-col"
          style={{
            width: sizes.right,
            minWidth: MIN_RIGHT,
            flexShrink: 0,
            overflowY: "auto",
            background: sideBg,
            padding: 18,
            transition: "background 0.6s",
          }}
        >
          {right}
        </div>
      </div>
    </>
  );
}
