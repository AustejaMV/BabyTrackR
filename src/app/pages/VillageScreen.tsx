import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useDesktop } from "../components/AppLayout";
import { DesktopLayout } from "../components/DesktopLayout";
import { LocalErrorBoundary } from "../components/LocalErrorBoundary";
import { useAuth } from "../contexts/AuthContext";
import { useBaby } from "../contexts/BabyContext";
import { getAgeMonthsWeeks } from "../utils/babyUtils";
import {
  villageNightPing,
  getNightPingConsent,
  setNightPingConsent,
  formatNightCount,
} from "../utils/villageApi";
import { fetchMyGroups } from "../utils/villageGroupService";
import { fetchVenues } from "../utils/villageVenueService";
import { fetchQuestions } from "../utils/villageQaService";

const F = "system-ui, sans-serif";
const SECTION: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: "var(--mu)", textTransform: "uppercase",
  letterSpacing: 0.8, padding: "10px 16px 4px", fontFamily: F,
};

const DSECTION: React.CSSProperties = {
  fontSize: 10, color: "#b09080", textTransform: "uppercase",
  letterSpacing: 0.7, fontWeight: 600, margin: "10px 0 6px", fontFamily: F,
};

function tagColor(tag: string): { bg: string; color: string } {
  const t = tag.toLowerCase();
  if (t.includes("bf") || t.includes("breast")) return { bg: "#e4ecf8", color: "#2a4a7a" };
  if (t.includes("pram") || t.includes("buggy")) return { bg: "#f0e8f8", color: "#5a3a8a" };
  return { bg: "#e4f4e4", color: "#2a6a2a" };
}

const NIGHT_PING_LAST_KEY = "cradl-night-ping-last";
const PING_COOLDOWN_MS = 10 * 60 * 1000;

function isNightHours(): boolean {
  const h = new Date().getHours();
  return h >= 23 || h < 6;
}

function useNightPing(accessToken: string | null) {
  const [consent, setConsent] = useState<boolean | null>(() => {
    try {
      const stored = localStorage.getItem("cradl-night-ping-consent");
      if (stored === null) return null;
      return stored === "true";
    } catch { return null; }
  });
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const isNight = isNightHours();

  const doPing = useCallback(async () => {
    if (!isNight || consent !== true) return;

    const now = Date.now();
    try {
      const lastPing = Number(localStorage.getItem(NIGHT_PING_LAST_KEY) || "0");
      if (now - lastPing < PING_COOLDOWN_MS) {
        return;
      }
    } catch {}

    setLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      const result = await villageNightPing(pos.coords.latitude, pos.coords.longitude, accessToken ?? "");
      setCount(result.count);
      try { localStorage.setItem(NIGHT_PING_LAST_KEY, String(now)); } catch {}
    } catch {
      setCount(null);
    } finally {
      setLoading(false);
    }
  }, [isNight, consent, accessToken]);

  useEffect(() => { doPing(); }, [doPing]);

  const grantConsent = () => {
    setNightPingConsent(true);
    setConsent(true);
  };

  const denyConsent = () => {
    setNightPingConsent(false);
    setConsent(false);
  };

  return { isNight, consent, count, loading, grantConsent, denyConsent };
}

export function VillageScreen() {
  const navigate = useNavigate();
  const { activeBaby } = useBaby();
  const { session } = useAuth();
  const birthMs = activeBaby?.birthDate ? (typeof activeBaby.birthDate === "number" ? activeBaby.birthDate : new Date(activeBaby.birthDate).getTime()) : null;
  const ageInWeeks = birthMs ? Math.floor((Date.now() - birthMs) / (7 * 86400000)) : 0;

  const { isNight, consent, count, loading, grantConsent, denyConsent } = useNightPing(session?.access_token ?? null);

  const nightLabel = count !== null && count > 0 ? formatNightCount(count) : null;

  const { isDesktop } = useDesktop();

  const [groups, setGroups] = useState<{ id: string; emoji: string; name: string; msg: string; unread: number }[]>([]);
  const [places, setPlaces] = useState<{ id: string; name: string; type: string; dist: string; tags: string[]; review?: string; wouldReturn?: boolean; reviewCount?: number }[]>([]);
  const [questions, setQuestions] = useState<{ id: string; text: string; answer?: string; answerLikes?: number; answerCount: number; daysAgo?: number }[]>([]);

  useEffect(() => {
    if (!session?.access_token) return;
    const token = session.access_token;

    fetchMyGroups(token).then(data => {
      const mapped = data.map(g => ({
        id: g.id, emoji: "", name: g.name || "Group", msg: "", unread: 0,
      }));
      setGroups(mapped);
      try { localStorage.setItem("cradl-village-groups", JSON.stringify(mapped)); } catch {}
    }).catch(() => {});

    fetchVenues(token).then(data => {
      const mapped = data.map(v => ({
        id: v.id, name: v.name || "Place", type: v.venueType || "", dist: "", tags: [], reviewCount: 0,
      }));
      setPlaces(mapped);
      try { localStorage.setItem("cradl-village-places", JSON.stringify(mapped)); } catch {}
    }).catch(() => {});

    fetchQuestions(token).then(data => {
      const mapped = data.map(q => ({
        id: q.id, text: q.content || "", answerCount: 0, daysAgo: Math.floor((Date.now() - q.createdAt) / 86400000),
      }));
      setQuestions(mapped);
      try { localStorage.setItem("cradl-village-questions", JSON.stringify(mapped)); } catch {}
    }).catch(() => {});
  }, [session?.access_token]);

  if (isDesktop) {
    return (
      <DesktopLayout
        left={
          <>
            {/* Night companion */}
            <LocalErrorBoundary>
              <div style={{ background: "#1c1428", borderRadius: 12, padding: 12, marginBottom: 10, fontFamily: F }}>
                {!isNight ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5a4a6a" }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#9080a0" }}>Night companion</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#9080a0", lineHeight: 1.5 }}>
                      Opens at 10 pm — you're never alone in those late-night feeds.
                    </div>
                  </>
                ) : consent === null ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7a4ab4" }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#e4d4f4" }}>Night companion</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#c4a0d4", marginBottom: 6, lineHeight: 1.5 }}>
                      See how many parents nearby are also up right now.
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" onClick={grantConsent} style={{ background: "#7a4ab4", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: F }}>Yes, show me</button>
                      <button type="button" onClick={denyConsent} style={{ background: "transparent", color: "#9080a0", border: "1px solid #4a3a5a", borderRadius: 8, padding: "5px 12px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: F }}>No thanks</button>
                    </div>
                  </>
                ) : consent === false ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7a4ab4" }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#e4d4f4" }}>Night companion</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#9080a0", lineHeight: 1.5 }}>You're not alone — other parents are awake too.</div>
                    <div style={{ fontSize: 10, color: "#c4a0d4", fontStyle: "italic" }}>"The 3 am feed club — we're all in this together"</div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7a4ab4" }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#e4d4f4" }}>
                        {loading ? "Finding nearby parents…" : nightLabel ? `${nightLabel} parents nearby are up` : "Night companion"}
                      </span>
                    </div>
                    {!loading && !nightLabel && (
                      <div style={{ fontSize: 10, color: "#9080a0", lineHeight: 1.5 }}>You're not alone — other parents are awake too.</div>
                    )}
                    <div style={{ fontSize: 10, color: "#c4a0d4", fontStyle: "italic" }}>"The 3 am feed club — we're all in this together"</div>
                  </>
                )}
              </div>
            </LocalErrorBoundary>

            {/* My groups */}
            <div style={{ ...DSECTION, marginTop: 0 }}>My groups</div>
            <LocalErrorBoundary>
              <div style={{ background: "#fff", border: "1px solid #ede0d4", borderRadius: 11, overflow: "hidden", fontFamily: F }}>
                {groups.length === 0 ? (
                  <div style={{ padding: "12px", fontSize: 11, color: "#9a8080", textAlign: "center", fontFamily: F }}>
                    No groups yet. Create or join one to connect with other parents.
                  </div>
                ) : (
                  groups.map((g, i, arr) => (
                    <div key={g.id} onClick={() => navigate(`/village/groups/${g.id}`)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: i < arr.length - 1 ? "1px solid #f4ece4" : "none", cursor: "pointer" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f0ece8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a8080" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#2c1f1f" }}>{g.name}</div>
                        <div style={{ fontSize: 10, color: "var(--mu)", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{g.msg}</div>
                      </div>
                      {g.unread > 0 && (
                        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#d4604a", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{g.unread}</div>
                      )}
                    </div>
                  ))
                )}
                <div onClick={() => navigate("/village/groups")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderTop: "1px dashed #ede0d4", cursor: "pointer" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px dashed #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--mu)" }}>+</div>
                  <span style={{ fontSize: 10, color: "var(--mu)", fontFamily: F }}>Create or join a group</span>
                </div>
              </div>
            </LocalErrorBoundary>
          </>
        }
        center={
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, fontFamily: "Georgia, serif", color: "#2c1f1f" }}>Ask other parents</div>
                <div style={{ fontSize: 11, color: "var(--mu)", fontFamily: F }}>For {ageInWeeks}-week babies</div>
              </div>
              <span onClick={() => navigate("/village/qa")} style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: "#d4604a", borderRadius: 20, padding: "6px 16px", cursor: "pointer", fontFamily: F, display: "inline-block" }}>Ask a question</span>
            </div>

            {/* Q&A */}
            <LocalErrorBoundary>
              <div style={{ background: "#fff", border: "1px solid #ede0d4", borderRadius: 12, padding: "12px 14px", fontFamily: F }}>
                {questions.length === 0 ? (
                  <div style={{ padding: "16px", fontSize: 11, color: "#9a8080", textAlign: "center", fontFamily: F, lineHeight: 1.5 }}>
                    No questions yet. Be the first to ask something — other parents with {ageInWeeks}-week babies will see it.
                  </div>
                ) : (
                  questions.map((q, i) => (
                    <div key={q.id} onClick={() => navigate(`/village/qa/${q.id}`)} style={{ paddingTop: i > 0 ? 10 : 0, borderTop: i > 0 ? "1px solid #f4ece4" : "none", marginBottom: 10, cursor: "pointer" }}>
                      <div style={{ fontSize: 12, color: "#2c1f1f", fontWeight: 500, marginBottom: q.answer ? 7 : 0 }}>{q.text}</div>
                      {q.answer && (
                        <div style={{ background: "#f8f4fc", borderRadius: 7, padding: 7, fontSize: 10, color: "#5a4a60", lineHeight: 1.4 }}>{q.answer}</div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#9a8080", marginTop: 4 }}>
                        {q.answerLikes != null && <span style={{ color: "#c05030" }}>{q.answerLikes} helpful</span>}
                        <span>{q.answerCount} answers</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </LocalErrorBoundary>
          </>
        }
        right={
          <>
            {/* Places header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ ...DSECTION, margin: 0 }}>Baby-friendly places</span>
              <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span onClick={() => navigate("/village/places")} style={{ fontSize: 10, color: "#d4604a", fontWeight: 600, cursor: "pointer", fontFamily: F }}>See all →</span>
                <span onClick={() => navigate("/village/places")} style={{ fontSize: 10, color: "#d4604a", fontWeight: 600, cursor: "pointer", fontFamily: F }}>+ Add place</span>
              </span>
            </div>

            {/* Place cards — stacked vertically */}
            <LocalErrorBoundary>
              {places.length === 0 ? (
                <div style={{ padding: "12px", fontSize: 11, color: "#9a8080", textAlign: "center", fontFamily: F }}>
                  No places added yet. Add your favourite baby-friendly spots.
                </div>
              ) : (
                places.map((place) => (
                  <div key={place.id} onClick={() => navigate("/village/places")} style={{ background: "#fff", border: "1px solid #ede0d4", borderRadius: 10, padding: 10, marginBottom: 7, fontFamily: F, cursor: "pointer" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f", marginBottom: 2 }}>{place.name}</div>
                    <div style={{ fontSize: 10, color: "#9a8080", marginBottom: 4 }}>{place.type} · {place.dist}</div>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const, marginBottom: 4 }}>
                      {place.tags.map((t) => {
                        const tc = tagColor(t);
                        return <span key={t} style={{ fontSize: 8, fontWeight: 600, padding: "2px 6px", borderRadius: 20, background: tc.bg, color: tc.color }}>{t}</span>;
                      })}
                    </div>
                    {place.wouldReturn && (
                      <div style={{ fontSize: 11, color: "#4a8a4a", fontWeight: 600, marginBottom: 2 }}>Most would return</div>
                    )}
                    {place.reviewCount != null && <div style={{ fontSize: 9, color: "#9a8080" }}>{place.reviewCount} reviews</div>}
                  </div>
                ))
              )}
            </LocalErrorBoundary>
          </>
        }
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 80, background: "var(--bg)" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 4px" }}>
        <div style={{ fontSize: 20, fontFamily: "Georgia, serif", fontWeight: 600, color: "#2c1f1f" }}>
          The Village
        </div>
        <div style={{ fontSize: 11, color: "var(--mu)", fontFamily: F }}>For parents, by parents</div>
      </div>

      {/* Night card */}
      <LocalErrorBoundary>
      <div
        style={{
          background: "#1c1428", borderRadius: 16, padding: 14,
          margin: "0 12px 8px", fontFamily: F,
        }}
      >
        {!isNight ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5a4a6a" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9080a0" }}>
                Night companion
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#9080a0", lineHeight: 1.5 }}>
              The night companion — opens at 10pm. You're never alone in those late-night feeds.
            </div>
          </>
        ) : consent === null ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7a4ab4" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#e4d4f4" }}>
                Night companion
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#c4a0d4", marginBottom: 8, lineHeight: 1.5 }}>
              See how many other parents nearby are also up right now. We'll use your location once to find others awake near you.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={grantConsent}
                style={{
                  background: "#7a4ab4", color: "#fff", border: "none", borderRadius: 10,
                  padding: "7px 16px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: F,
                }}
              >
                Yes, show me
              </button>
              <button
                type="button"
                onClick={denyConsent}
                style={{
                  background: "transparent", color: "#9080a0", border: "1px solid #4a3a5a",
                  borderRadius: 10, padding: "7px 16px", fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: F,
                }}
              >
                No thanks
              </button>
            </div>
          </>
        ) : consent === false ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7a4ab4" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#e4d4f4" }}>
                Night companion
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#9080a0", lineHeight: 1.5 }}>
              You're not alone at this hour. Other parents are awake too.
            </div>
            <div style={{ fontSize: 11, color: "#c4a0d4", fontStyle: "italic" }}>
              "The 3am feed club — we're all in this together"
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7a4ab4" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#e4d4f4" }}>
                {loading
                  ? "Finding nearby parents…"
                  : nightLabel
                    ? `${nightLabel} parents nearby are also up right now.`
                    : "Night companion"}
              </span>
            </div>
            {!loading && !nightLabel && (
              <div style={{ fontSize: 11, color: "#9080a0", lineHeight: 1.5 }}>
                You're not alone at this hour. Other parents are awake too.
              </div>
            )}
            <div style={{ fontSize: 11, color: "#c4a0d4", fontStyle: "italic" }}>
              "The 3am feed club — we're all in this together"
            </div>
          </>
        )}
      </div>
      </LocalErrorBoundary>

      {/* Places */}
      <LocalErrorBoundary>
      <div style={{ ...SECTION, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Baby-friendly places near you</span>
        <span onClick={() => navigate("/village/places")} style={{ fontSize: 10, color: "#d4604a", fontWeight: 600, cursor: "pointer", textTransform: "none" as const, letterSpacing: 0 }}>See all →</span>
      </div>
      <div
        style={{ display: "flex", gap: 8, padding: "0 12px 8px", overflowX: "auto", scrollbarWidth: "none" as any }}
        className="hide-scrollbar"
      >
        <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}`}</style>
        {places.length === 0 ? (
          <div style={{ padding: "12px", fontSize: 11, color: "#9a8080", textAlign: "center", fontFamily: F }}>
            No places added yet. Add your favourite baby-friendly spots.
          </div>
        ) : (
          places.map((place) => (
            <div
              key={place.id}
              onClick={() => navigate("/village/places")}
              style={{
                width: 156, flexShrink: 0, background: "#fff",
                border: "1px solid #ede0d4", borderRadius: 14, padding: 10, fontFamily: F,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: "#2c1f1f", marginBottom: 2, overflowWrap: "break-word" as const }}>{place.name}</div>
              <div style={{ fontSize: 9, color: "var(--mu)", marginBottom: 4 }}>{place.type} · {place.dist}</div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const, marginBottom: 4 }}>
                {place.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 8, fontWeight: 600, padding: "2px 6px", borderRadius: 20,
                      background: "#e4f4e4", color: "#2a6a2a",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              {place.review && <div style={{ fontSize: 9, color: "#9a8080", fontStyle: "italic" }}>"{place.review}"</div>}
            </div>
          ))
        )}
        <div
          onClick={() => navigate("/village/places")}
          style={{
            width: 156, flexShrink: 0, borderRadius: 14, padding: 10,
            border: "2px dashed #ede0d4", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 20, color: "var(--mu)" }}>+</span>
          <span style={{ fontSize: 10, color: "var(--mu)", fontFamily: F }}>Add a place</span>
        </div>
      </div>
      </LocalErrorBoundary>

      {/* Groups */}
      <LocalErrorBoundary>
      <div style={SECTION}>My groups</div>
      <div
        style={{
          background: "#fff", border: "1px solid #ede0d4", borderRadius: 14,
          margin: "0 12px 8px", fontFamily: F, overflow: "hidden",
        }}
      >
        {groups.length === 0 ? (
          <div style={{ padding: "12px", fontSize: 11, color: "#9a8080", textAlign: "center", fontFamily: F }}>
            No groups yet. Create or join one to connect with other parents.
          </div>
        ) : (
          groups.map((g, i, arr) => (
            <div
              key={g.id}
              onClick={() => navigate(`/village/groups/${g.id}`)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderBottom: i < arr.length - 1 ? "1px solid #f4ece4" : "none", cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 32, height: 32, borderRadius: "50%", background: "#f0ece8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a8080" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f", overflowWrap: "break-word" as const }}>{g.name}</div>
                <div style={{ fontSize: 10, color: "var(--mu)", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{g.msg}</div>
              </div>
              {g.unread > 0 ? (
                <div
                  style={{
                    width: 18, height: 18, borderRadius: "50%", background: "#d4604a",
                    color: "#fff", fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  {g.unread}
                </div>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#8a6b5b" strokeWidth="1.5" strokeLinecap="round" /></svg>
              )}
            </div>
          ))
        )}
        <div
          onClick={() => navigate("/village/groups")}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "10px 12px", borderTop: "1px dashed #ede0d4", cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 14, color: "var(--mu)" }}>+</span>
          <span style={{ fontSize: 10, color: "var(--mu)", fontFamily: F }}>Create or join a group</span>
        </div>
      </div>
      </LocalErrorBoundary>

      {/* Q&A */}
      <LocalErrorBoundary>
      <div style={SECTION}>Ask · {ageInWeeks}-week babies</div>
      <div
        style={{
          background: "#fff", border: "1px solid #ede0d4", borderRadius: 14,
          margin: "0 12px 8px", padding: 12, fontFamily: F,
        }}
      >
        {questions.length === 0 ? (
          <div style={{ padding: "16px", fontSize: 11, color: "#9a8080", textAlign: "center", fontFamily: F, lineHeight: 1.5 }}>
            No questions yet. Be the first to ask something — other parents with {ageInWeeks}-week babies will see it.
          </div>
        ) : (
          questions.map((q, i) => (
            <div key={q.id} onClick={() => navigate(`/village/qa/${q.id}`)} style={{ paddingTop: i > 0 ? 10 : 0, borderTop: i > 0 ? "1px solid #f4ece4" : "none", marginBottom: 10, cursor: "pointer" }}>
              <div style={{ fontSize: 12, color: "#2c1f1f", fontWeight: 500, marginBottom: q.answer ? 7 : 0 }}>{q.text}</div>
              {q.answer && (
                <div style={{ background: "#f8f4fc", borderRadius: 7, padding: 7, fontSize: 10, color: "#5a4a60", lineHeight: 1.4 }}>{q.answer}</div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#9a8080", marginTop: 4 }}>
                {q.answerLikes != null && <span style={{ color: "#c05030" }}>{q.answerLikes} helpful</span>}
                <span>{q.answerCount} answers</span>
              </div>
            </div>
          ))
        )}

        <div style={{ textAlign: "center" as const, paddingTop: 6 }}>
          <span
            onClick={() => navigate("/village/qa")}
            style={{
              fontSize: 11, fontWeight: 600, color: "#d4604a", cursor: "pointer",
              padding: "6px 16px", borderRadius: 20, border: "1px solid #d4604a",
              display: "inline-block",
            }}
          >
            Ask a question
          </span>
        </div>
      </div>
      </LocalErrorBoundary>
    </div>
  );
}
