import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams } from "react-router";
import { MessageCircle, LayoutList, Calendar, Users, Trash2, Plus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchMyGroups,
  fetchGroupMessages,
  sendGroupMessage,
  fetchGroupBoard,
  addBoardItem,
  type VillageGroupMessage,
  type VillageBoardItem,
} from "../utils/villageGroupService";
import { toast } from "sonner";
import { format } from "date-fns";
import { TIME_DISPLAY, SHORT_DATETIME_DISPLAY, DAY_DATETIME_DISPLAY } from "../utils/dateUtils";

type Tab = "chat" | "board" | "events" | "members";
type RsvpStatus = "going" | "maybe" | "cant";

interface GroupEvent {
  id: string;
  title: string;
  dateTime: string;
  location: string;
  rsvps: Record<string, RsvpStatus>;
  createdBy: string;
}

interface GroupMember {
  id: string;
  label: string;
  isOwner: boolean;
}

function eventsKey(groupId: string) {
  return `cradl-group-${groupId}-events`;
}

function membersKey(groupId: string) {
  return `cradl-group-${groupId}-members`;
}

function loadEvents(groupId: string): GroupEvent[] {
  try {
    const raw = localStorage.getItem(eventsKey(groupId));
    return raw ? (JSON.parse(raw) as GroupEvent[]) : [];
  } catch { return []; }
}

function saveEvents(groupId: string, events: GroupEvent[]) {
  try { localStorage.setItem(eventsKey(groupId), JSON.stringify(events)); } catch {}
}

function loadMembers(groupId: string, userId: string): GroupMember[] {
  try {
    const raw = localStorage.getItem(membersKey(groupId));
    if (raw) return JSON.parse(raw) as GroupMember[];
  } catch {}
  return [
    { id: userId, label: "You (owner)", isOwner: true },
  ];
}

function saveMembers(groupId: string, members: GroupMember[]) {
  try { localStorage.setItem(membersKey(groupId), JSON.stringify(members)); } catch {}
}

export function VillageGroupDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? "owner";
  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<VillageGroupMessage[]>([]);
  const [boardItems, setBoardItems] = useState<VillageBoardItem[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [boardTitle, setBoardTitle] = useState("");
  const [boardBody, setBoardBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAddBoard, setShowAddBoard] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const groupId = id ?? "";
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    if (!session?.access_token || !groupId) return;
    fetchMyGroups(session.access_token).then(groups => {
      const match = groups.find(g => g.id === groupId);
      if (match) setGroupName(match.name);
    }).catch(() => {});
  }, [session?.access_token, groupId]);

  // Events state
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDateTime, setEventDateTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  // Members state
  const [members, setMembers] = useState<GroupMember[]>([]);
  const isOwner = members.some((m) => m.id === currentUserId && m.isOwner);

  useEffect(() => {
    if (groupId) {
      setEvents(loadEvents(groupId));
      setMembers(loadMembers(groupId, currentUserId));
    }
  }, [groupId, currentUserId]);

  useEffect(() => {
    if (!session?.access_token || !groupId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    if (tab === "chat") {
      fetchGroupMessages(session.access_token, groupId).then(setMessages).catch(() => toast.error("Could not load messages")).finally(() => setLoading(false));
    } else if (tab === "board") {
      fetchGroupBoard(session.access_token, groupId).then(setBoardItems).catch(() => toast.error("Could not load board")).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session?.access_token, groupId, tab]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = messageInput.trim();
    if (!session?.access_token || !groupId || !trimmed) return;
    setSending(true);
    try {
      await sendGroupMessage(session.access_token, groupId, trimmed);
      setMessageInput("");
      const list = await fetchGroupMessages(session.access_token, groupId);
      setMessages(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const addBoard = async () => {
    if (!session?.access_token || !groupId || boardTitle.trim().length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }
    setSending(true);
    try {
      await addBoardItem(session.access_token, groupId, { title: boardTitle.trim(), body: boardBody.trim() });
      setBoardTitle("");
      setBoardBody("");
      setShowAddBoard(false);
      const list = await fetchGroupBoard(session.access_token, groupId);
      setBoardItems(list);
      toast.success("Posted to board");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSending(false);
    }
  };

  const handleAddEvent = () => {
    if (!eventTitle.trim()) {
      toast.error("Title required");
      return;
    }
    if (!eventDateTime) {
      toast.error("Date and time required");
      return;
    }
    const newEvent: GroupEvent = {
      id: crypto.randomUUID(),
      title: eventTitle.trim(),
      dateTime: eventDateTime,
      location: eventLocation.trim(),
      rsvps: {},
      createdBy: currentUserId,
    };
    const updated = [...events, newEvent];
    setEvents(updated);
    saveEvents(groupId, updated);
    setEventTitle("");
    setEventDateTime("");
    setEventLocation("");
    setShowAddEvent(false);
    toast.success("Event added");
  };

  const handleRsvp = (eventId: string, status: RsvpStatus) => {
    const updated = events.map((ev) => {
      if (ev.id !== eventId) return ev;
      const rsvps = { ...ev.rsvps };
      if (rsvps[currentUserId] === status) {
        delete rsvps[currentUserId];
      } else {
        rsvps[currentUserId] = status;
      }
      return { ...ev, rsvps };
    });
    setEvents(updated);
    saveEvents(groupId, updated);
  };

  const handleRemoveMember = (memberId: string) => {
    const updated = members.filter((m) => m.id !== memberId);
    setMembers(updated);
    saveMembers(groupId, updated);
    toast.success("Member removed");
  };

  const rsvpLabel = (status: RsvpStatus) =>
    status === "going" ? "Going" : status === "maybe" ? "Maybe" : "Can't make it";

  const rsvpCounts = (ev: GroupEvent) => {
    const vals = Object.values(ev.rsvps);
    return {
      going: vals.filter((v) => v === "going").length,
      maybe: vals.filter((v) => v === "maybe").length,
      cant: vals.filter((v) => v === "cant").length,
    };
  };

  if (!groupId) return null;

  return (
    <div className="min-h-screen pb-24 flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="p-4 border-b sticky top-0 z-10" style={{ borderColor: "var(--bd)", background: "var(--bg)" }}>
        <Link to="/village/groups" className="text-[14px] mb-1 inline-block" style={{ color: "var(--pink)" }}>
          ← Groups
        </Link>
        {groupName && (
          <h1 className="text-[17px] font-semibold mb-2" style={{ color: "var(--tx)" }}>{groupName}</h1>
        )}
        <div className="flex gap-2 flex-wrap">
          {(["chat", "board", "events", "members"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="flex items-center gap-1 py-2 px-3 rounded-xl text-[13px] font-medium"
              style={{
                background: tab === t ? "var(--pink)" : "var(--card)",
                color: tab === t ? "white" : "var(--tx)",
                border: tab === t ? "none" : "1px solid var(--bd)",
              }}
            >
              {t === "chat" && <MessageCircle className="w-4 h-4" />}
              {t === "board" && <LayoutList className="w-4 h-4" />}
              {t === "events" && <Calendar className="w-4 h-4" />}
              {t === "members" && <Users className="w-4 h-4" />}
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {/* ── Chat ── */}
        {tab === "chat" && (
          <>
            {loading ? (
              <p className="text-[14px]" style={{ color: "var(--mu)" }}>Loading…</p>
            ) : (
              <div className="space-y-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border p-3 max-w-[85%]"
                    style={{ borderColor: "var(--bd)", background: "var(--card)" }}
                  >
                    <p className="text-[14px]" style={{ color: "var(--tx)" }}>{m.content}</p>
                    <p className="text-[11px] mt-1" style={{ color: "var(--mu)" }}>{format(m.sentAt, TIME_DISPLAY())}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
            <div className="sticky bottom-0 pt-3 flex gap-2" style={{ background: "var(--bg)" }}>
              <input
                type="text"
                placeholder="Message…"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                className="flex-1 rounded-xl border px-3 py-2.5 text-[14px]"
                style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={sending || !messageInput.trim()}
                className="py-2.5 px-4 rounded-xl font-medium text-white"
                style={{ background: "var(--pink)" }}
              >
                Send
              </button>
            </div>
          </>
        )}

        {/* ── Board ── */}
        {tab === "board" && (
          <>
            {session?.access_token && (
              <button
                type="button"
                onClick={() => setShowAddBoard(!showAddBoard)}
                className="mb-3 py-2 px-3 rounded-xl text-[14px] font-medium"
                style={{ background: "var(--pink)", color: "white" }}
              >
                {showAddBoard ? "Cancel" : "+ Add to board"}
              </button>
            )}
            {showAddBoard && (
              <div className="rounded-2xl border p-4 mb-4" style={{ borderColor: "var(--bd)", background: "var(--card)" }}>
                <input
                  type="text"
                  placeholder="Title (3–100 chars)"
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-[14px] mb-2"
                  style={{ borderColor: "var(--bd)", background: "var(--bg)", color: "var(--tx)" }}
                />
                <textarea
                  placeholder="Body (optional)"
                  value={boardBody}
                  onChange={(e) => setBoardBody(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border px-3 py-2 text-[14px] mb-2 resize-none"
                  style={{ borderColor: "var(--bd)", background: "var(--bg)", color: "var(--tx)" }}
                />
                <button type="button" onClick={addBoard} disabled={sending} className="w-full py-2 rounded-xl font-medium text-white" style={{ background: "var(--pink)" }}>
                  {sending ? "Posting…" : "Post"}
                </button>
              </div>
            )}
            {loading ? (
              <p className="text-[14px]" style={{ color: "var(--mu)" }}>Loading…</p>
            ) : boardItems.length === 0 ? (
              <p className="text-[14px]" style={{ color: "var(--mu)" }}>No board items yet.</p>
            ) : (
              <ul className="space-y-2">
                {boardItems.map((b) => (
                  <li key={b.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--bd)", background: "var(--card)" }}>
                    <div className="font-medium" style={{ color: "var(--tx)" }}>{b.title}</div>
                    {b.body && <p className="text-[13px] mt-1" style={{ color: "var(--mu)" }}>{b.body}</p>}
                    <p className="text-[11px] mt-1" style={{ color: "var(--mu)" }}>{format(b.createdAt, SHORT_DATETIME_DISPLAY())}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* ── Events ── */}
        {tab === "events" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-semibold" style={{ color: "var(--tx)" }}>Events</h2>
              <button
                type="button"
                onClick={() => setShowAddEvent(!showAddEvent)}
                className="flex items-center gap-1 py-2 px-3 rounded-xl text-[13px] font-medium"
                style={{ background: "var(--pink)", color: "white" }}
              >
                {showAddEvent ? "Cancel" : <><Plus className="w-4 h-4" /> Add event</>}
              </button>
            </div>

            {showAddEvent && (
              <div className="rounded-2xl border p-4 mb-4" style={{ borderColor: "var(--bd)", background: "var(--card)" }}>
                <input
                  type="text"
                  placeholder="Event title"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-[14px] mb-2"
                  style={{ borderColor: "var(--bd)", background: "var(--bg)", color: "var(--tx)" }}
                />
                <input
                  type="datetime-local"
                  value={eventDateTime}
                  onChange={(e) => setEventDateTime(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-[14px] mb-2"
                  style={{ borderColor: "var(--bd)", background: "var(--bg)", color: "var(--tx)" }}
                />
                <input
                  type="text"
                  placeholder="Location (optional)"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-[14px] mb-2"
                  style={{ borderColor: "var(--bd)", background: "var(--bg)", color: "var(--tx)" }}
                />
                <button
                  type="button"
                  onClick={handleAddEvent}
                  className="w-full py-2.5 rounded-xl font-medium text-white"
                  style={{ background: "var(--pink)" }}
                >
                  Create event
                </button>
              </div>
            )}

            {events.length === 0 ? (
              <p className="text-[14px]" style={{ color: "var(--mu)" }}>No events yet. Add one to get started.</p>
            ) : (
              <ul className="space-y-3">
                {events
                  .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
                  .map((ev) => {
                    const myRsvp = ev.rsvps[currentUserId] as RsvpStatus | undefined;
                    const counts = rsvpCounts(ev);
                    return (
                      <li
                        key={ev.id}
                        className="rounded-2xl border p-4"
                        style={{ borderColor: "var(--bd)", background: "var(--card)" }}
                      >
                        <div className="font-medium text-[15px]" style={{ color: "var(--tx)" }}>{ev.title}</div>
                        <div className="text-[13px] mt-1" style={{ color: "var(--mu)" }}>
                          {format(new Date(ev.dateTime), DAY_DATETIME_DISPLAY())}
                          {ev.location && ` · ${ev.location}`}
                        </div>

                        <div className="flex gap-2 mt-3 flex-wrap">
                          {(["going", "maybe", "cant"] as const).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleRsvp(ev.id, status)}
                              className="py-1.5 px-3 rounded-lg text-[13px] font-medium"
                              style={{
                                background: myRsvp === status ? "var(--pink)" : "var(--bg)",
                                color: myRsvp === status ? "white" : "var(--tx)",
                                border: myRsvp === status ? "none" : "1px solid var(--bd)",
                              }}
                            >
                              {rsvpLabel(status)}
                            </button>
                          ))}
                        </div>

                        <div className="text-[11px] mt-2" style={{ color: "var(--mu)" }}>
                          {counts.going > 0 && `${counts.going} going`}
                          {counts.going > 0 && counts.maybe > 0 && " · "}
                          {counts.maybe > 0 && `${counts.maybe} maybe`}
                          {(counts.going > 0 || counts.maybe > 0) && counts.cant > 0 && " · "}
                          {counts.cant > 0 && `${counts.cant} can't make it`}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </>
        )}

        {/* ── Members ── */}
        {tab === "members" && (
          <>
            <h2 className="text-[16px] font-semibold mb-3" style={{ color: "var(--tx)" }}>
              Members ({members.length})
            </h2>
            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl border p-3 flex items-center justify-between"
                  style={{ borderColor: "var(--bd)", background: "var(--card)" }}
                >
                  <div>
                    <span className="text-[14px] font-medium" style={{ color: "var(--tx)" }}>{m.label}</span>
                    {m.isOwner && (
                      <span
                        className="ml-2 text-[11px] px-2 py-0.5 rounded"
                        style={{ background: "var(--pe)", color: "var(--pink)" }}
                      >
                        Owner
                      </span>
                    )}
                  </div>
                  {isOwner && !m.isOwner && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id)}
                      className="flex items-center gap-1 text-[13px] py-1.5 px-3 rounded-lg"
                      style={{ color: "#d4604a", background: "#fdf0ee", border: "none" }}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
