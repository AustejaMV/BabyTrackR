import { useState, useEffect, useCallback, type CSSProperties } from "react";

interface ShoppingItem {
  id: string;
  label: string;
  done: boolean;
}

const STORAGE_KEY = "cradl-shopping-list";

const QUICK_CHIPS = [
  "Nappies",
  "Wipes",
  "Formula",
  "Diaper cream",
  "Baby shampoo",
  "Expressed milk bags",
  "Breast pads",
  "Nipple cream",
];

function load(): ShoppingItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persist(items: ShoppingItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function ShoppingListScreen() {
  const [items, setItems] = useState<ShoppingItem[]>(load);
  const [input, setInput] = useState("");
  const [doneOpen, setDoneOpen] = useState(true);

  useEffect(() => persist(items), [items]);

  const addItem = useCallback(
    (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      setItems((prev) => [...prev, { id: crypto.randomUUID(), label: trimmed, done: false }]);
      setInput("");
    },
    [],
  );

  const toggle = (id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  };

  const remove = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const clearDone = () => {
    setItems((prev) => prev.filter((it) => !it.done));
  };

  const pending = items.filter((it) => !it.done);
  const done = items.filter((it) => it.done);

  const card: CSSProperties = {
    background: "var(--card)",
    borderRadius: 14,
    border: "1px solid var(--bd)",
    padding: "16px 14px",
    marginBottom: 12,
  };

  return (
    <div style={{ padding: "16px 16px 100px", maxWidth: 480, margin: "0 auto" }}>
      <h1
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 22,
          color: "var(--tx)",
          margin: "0 0 16px",
        }}
      >
        Shopping List
      </h1>

      {/* Quick-add chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 10,
          marginBottom: 14,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => addItem(chip)}
            style={{
              flexShrink: 0,
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid var(--bd)",
              background: "var(--pe)",
              color: "var(--tx)",
              fontSize: 13,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + {chip}
          </button>
        ))}
      </div>

      {/* Custom add */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem(input)}
          placeholder="Add custom item..."
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 14,
            border: "1px solid var(--bd)",
            background: "var(--bg)",
            color: "var(--tx)",
            fontSize: 14,
          }}
        />
        <button
          type="button"
          onClick={() => addItem(input)}
          disabled={!input.trim()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            border: "none",
            background: input.trim() ? "var(--coral)" : "var(--bd)",
            color: input.trim() ? "#fff" : "var(--mu)",
            fontSize: 22,
            fontWeight: 600,
            cursor: input.trim() ? "pointer" : "default",
            lineHeight: 1,
          }}
        >
          +
        </button>
      </div>

      {/* Pending items */}
      {pending.length === 0 && done.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--mu)", textAlign: "center", marginTop: 32 }}>
          Your shopping list is empty. Tap a chip or add a custom item above.
        </p>
      )}

      {pending.length > 0 && (
        <div style={card}>
          {pending.map((item) => (
            <label
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderBottom: "1px solid var(--bd)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={false}
                onChange={() => toggle(item.id)}
                style={{ width: 18, height: 18, accentColor: "var(--coral)" }}
              />
              <span style={{ flex: 1, fontSize: 14, color: "var(--tx)" }}>{item.label}</span>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={`Remove ${item.label}`}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--mu)",
                  fontSize: 16,
                  cursor: "pointer",
                  padding: "0 4px",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </label>
          ))}
        </div>
      )}

      {/* Done section */}
      {done.length > 0 && (
        <div style={card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: doneOpen ? 8 : 0,
            }}
          >
            <button
              type="button"
              onClick={() => setDoneOpen((v) => !v)}
              style={{
                background: "none",
                border: "none",
                color: "var(--tx)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {doneOpen ? "▾" : "▸"} Done ({done.length})
            </button>
            <button
              type="button"
              onClick={clearDone}
              style={{
                background: "none",
                border: "none",
                color: "var(--coral)",
                fontSize: 12,
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              Clear completed
            </button>
          </div>

          {doneOpen &&
            done.map((item) => (
              <label
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--bd)",
                  cursor: "pointer",
                  opacity: 0.5,
                }}
              >
                <input
                  type="checkbox"
                  checked
                  onChange={() => toggle(item.id)}
                  style={{ width: 18, height: 18, accentColor: "var(--coral)" }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: "var(--tx)",
                    textDecoration: "line-through",
                  }}
                >
                  {item.label}
                </span>
              </label>
            ))}
        </div>
      )}
    </div>
  );
}
