import { useEffect, type ReactNode } from "react";

interface DesktopDrawerPanelProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function DesktopDrawerPanel({
  open,
  onClose,
  children,
}: DesktopDrawerPanelProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <>
      {/* Overlay – click-outside to close */}
      {open && (
        <div
          onClick={onClose}
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 149,
            background: "rgba(44, 31, 31, 0.15)",
          }}
        />
      )}

      {/* Drawer panel */}
      <div
        role="complementary"
        aria-label="Detail panel"
        style={{
          position: "fixed",
          top: 50,
          right: 0,
          bottom: 0,
          width: 360,
          background: "var(--card, #fff)",
          borderLeft: "1px solid var(--bd)",
          zIndex: 150,
          overflowY: "auto",
          padding: 20,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 200ms ease-out",
          boxShadow: open ? "-4px 0 16px rgba(44, 31, 31, 0.06)" : "none",
        }}
      >
        {children}
      </div>
    </>
  );
}
