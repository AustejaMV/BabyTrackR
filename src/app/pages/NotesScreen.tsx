import { useState, useEffect, type CSSProperties } from "react";
import { formatDate, formatClockTime } from "../utils/dateUtils";
import { useAuth } from "../contexts/AuthContext";
import { saveData } from "../utils/dataSync";

interface Note {
  id: string;
  text: string;
  ts: number;
}

const STORAGE_KEY = "cradl-notes";

function load(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persist(notes: Note[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {}
}

export function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>(load);
  const [input, setInput] = useState("");
  const { session } = useAuth();

  useEffect(() => {
    persist(notes);
    if (session?.access_token) saveData(STORAGE_KEY, notes, session.access_token);
  }, [notes, session?.access_token]);

  const addNote = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setNotes((prev) => [{ id: crypto.randomUUID(), text: trimmed, ts: Date.now() }, ...prev]);
    setInput("");
  };

  const remove = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const card: CSSProperties = {
    background: "var(--card)",
    borderRadius: 14,
    border: "1px solid var(--bd)",
    padding: "14px 14px",
    marginBottom: 10,
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
        Notes
      </h1>

      {/* Add note */}
      <div style={{ marginBottom: 16 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write a note..."
          rows={3}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid var(--bd)",
            background: "var(--bg)",
            color: "var(--tx)",
            fontSize: 14,
            resize: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
            marginBottom: 8,
          }}
        />
        <button
          type="button"
          onClick={addNote}
          disabled={!input.trim()}
          style={{
            width: "100%",
            padding: "10px 0",
            borderRadius: 14,
            border: "none",
            background: input.trim() ? "var(--coral)" : "var(--bd)",
            color: input.trim() ? "#fff" : "var(--mu)",
            fontSize: 14,
            fontWeight: 600,
            cursor: input.trim() ? "pointer" : "default",
          }}
        >
          Add
        </button>
      </div>

      {/* Notes list */}
      {notes.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--mu)", textAlign: "center", marginTop: 32 }}>
          No notes yet. Write one above to get started.
        </p>
      )}

      {notes.map((note) => (
        <div key={note.id} style={card}>
          <p
            style={{
              fontSize: 14,
              color: "var(--tx)",
              margin: "0 0 8px",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {note.text}
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--mu)" }}>
              {formatDate(note.ts)}{" "}
              {formatClockTime(note.ts)}
            </span>
            <button
              type="button"
              onClick={() => remove(note.id)}
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
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
