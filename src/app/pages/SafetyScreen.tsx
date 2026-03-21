import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { BreathingExerciseModal } from "../components/BreathingExerciseModal";

interface FamilyMember {
  id: string;
  name: string;
}

const FAMILY_STORAGE_KEY = "cradl-family-members";
const NIGHT_PING_PREFIX = "cradl-night-ping-";

function loadFamilyMembers(): FamilyMember[] {
  try {
    const raw = localStorage.getItem(FAMILY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FamilyMember[];
  } catch {
    return [];
  }
}

function saveFamilyMembers(members: FamilyMember[]) {
  try {
    localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(members));
  } catch {}
}

function clearLocationData() {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(NIGHT_PING_PREFIX)) toRemove.push(key);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
    return toRemove.length;
  } catch {
    return 0;
  }
}

function countLocationKeys(): number {
  try {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith(NIGHT_PING_PREFIX)) count++;
    }
    return count;
  } catch {
    return 0;
  }
}

const card: React.CSSProperties = {
  background: "var(--card)",
  borderRadius: 14,
  border: "1px solid var(--bd)",
  padding: 16,
  margin: "0 12px 10px",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  color: "var(--mu)",
  padding: "10px 16px 4px",
};

export function SafetyScreen() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [locationCount, setLocationCount] = useState(0);
  const [locationCleared, setLocationCleared] = useState(false);
  const [breathingOpen, setBreathingOpen] = useState(false);

  useEffect(() => {
    setMembers(loadFamilyMembers());
    setLocationCount(countLocationKeys());
  }, []);

  const removeMember = (id: string) => {
    const updated = members.filter((m) => m.id !== id);
    saveFamilyMembers(updated);
    setMembers(updated);
  };

  const handleClearLocation = () => {
    const removed = clearLocationData();
    setLocationCount(0);
    setLocationCleared(true);
    void removed;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingBottom: 80,
        background: "var(--bg)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Back navigation */}
      <div style={{ padding: "14px 16px 0" }}>
        <span
          onClick={() => navigate("/more")}
          style={{
            fontSize: 13,
            color: "var(--coral)",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          ← Back
        </span>
      </div>

      <h2
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 20,
          color: "var(--tx)",
          padding: "8px 16px 4px",
          margin: 0,
        }}
      >
        Safety
      </h2>
      <p
        style={{
          fontSize: 12,
          color: "var(--mu)",
          padding: "0 16px 12px",
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        Your safety matters. Everything here stays on your device.
      </p>

      {/* Quick exit */}
      <div style={{ padding: "0 12px 10px" }}>
        <button
          onClick={() => {
            try {
              window.close();
            } catch {
              window.location.href = "https://www.google.com";
            }
          }}
          style={{
            width: "100%",
            padding: "16px 0",
            background: "#c03030",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Quick exit
        </button>
      </div>

      {/* Breathing exercise */}
      <div style={{ padding: "0 12px 10px" }}>
        <button
          onClick={() => setBreathingOpen(true)}
          style={{
            width: "100%",
            padding: "14px 0",
            background: "var(--card)",
            color: "var(--tx)",
            border: "1px solid var(--bd)",
            borderRadius: 14,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Breathing exercise
        </button>
      </div>

      {/* Remove a family member */}
      <div style={sectionLabel}>Family members</div>
      <div style={card}>
        {members.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--mu)", margin: 0 }}>
            No family members linked.
          </p>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid var(--bd)",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--tx)" }}>{m.name}</span>
              <button
                onClick={() => removeMember(m.id)}
                style={{
                  background: "none",
                  border: "1px solid var(--coral)",
                  color: "var(--coral)",
                  borderRadius: 8,
                  padding: "5px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Remove without notifying them
              </button>
            </div>
          ))
        )}
      </div>

      {/* Hide this app */}
      <div style={sectionLabel}>Hide this app</div>
      <div style={card}>
        <p
          style={{
            fontSize: 12,
            color: "var(--mu)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Disguise or hide Cradl on your home screen. This feature is available
          on the native app only.
        </p>
      </div>

      {/* Location data audit */}
      <div style={sectionLabel}>Location data</div>
      <div style={card}>
        <p
          style={{
            fontSize: 12,
            color: "var(--tx)",
            margin: "0 0 8px",
            lineHeight: 1.5,
          }}
        >
          {locationCleared
            ? "All location data has been deleted."
            : `${locationCount} location record${locationCount !== 1 ? "s" : ""} stored on this device.`}
        </p>
        {!locationCleared && locationCount > 0 && (
          <button
            onClick={handleClearLocation}
            style={{
              background: "none",
              border: "1px solid var(--coral)",
              color: "var(--coral)",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Delete all location data
          </button>
        )}
      </div>

      {/* Helplines */}
      <div style={sectionLabel}>Help & support</div>
      <div style={card}>
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--tx)",
              marginBottom: 2,
            }}
          >
            Domestic abuse helpline
          </div>
          <span style={{ fontSize: 14, color: "var(--tx)" }}>
            Your local domestic abuse / crisis service — look up the number for your area. UK: 0808 2000 247 (24h, free).
          </span>
          <div style={{ fontSize: 11, color: "var(--mu)", marginTop: 2 }}>
            Free, 24 hours, confidential where available
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--tx)",
              marginBottom: 2,
            }}
          >
            Postnatal mental health support
          </div>
          <span style={{ fontSize: 14, color: "var(--tx)" }}>
            Look up your local perinatal mental health or crisis line. UK: PANDAS 0808 1961 776 (Mon–Sun 9am–8pm).
          </span>
          <div style={{ fontSize: 11, color: "var(--mu)", marginTop: 2 }}>
            Free helpline where available
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--tx)",
              marginBottom: 2,
            }}
          >
            Local health advice line
          </div>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--coral)",
            }}
          >
            Non-emergency medical advice, 24 hours
          </span>
          <div style={{ fontSize: 11, color: "var(--mu)", marginTop: 2 }}>
            Call your local non-emergency number for health advice (e.g. 111 in UK, 116 117 in some EU countries)
          </div>
        </div>
      </div>

      <BreathingExerciseModal
        open={breathingOpen}
        onClose={() => setBreathingOpen(false)}
      />
    </div>
  );
}
