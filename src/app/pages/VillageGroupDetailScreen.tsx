import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router";
import { MessageCircle, LayoutList, Calendar } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchGroupMessages,
  sendGroupMessage,
  fetchGroupBoard,
  addBoardItem,
  type VillageGroupMessage,
  type VillageBoardItem,
} from "../utils/villageGroupService";
import { toast } from "sonner";
import { format } from "date-fns";

type Tab = "chat" | "board" | "events";

export function VillageGroupDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
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

  useEffect(() => {
    if (!session?.access_token || !groupId) {
      setLoading(false);
      return;
    }
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

  if (!groupId) return null;

  return (
    <div className="min-h-screen pb-24 flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="p-4 border-b sticky top-0 z-10" style={{ borderColor: "var(--bd)", background: "var(--bg)" }}>
        <Link to="/village/groups" className="text-[14px] mb-2 inline-block" style={{ color: "var(--pink)" }}>
          ← Groups
        </Link>
        <div className="flex gap-2">
          {(["chat", "board", "events"] as const).map((t) => (
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
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
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
                    <p className="text-[11px] mt-1" style={{ color: "var(--mu)" }}>{format(m.sentAt, "HH:mm")}</p>
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
                    <p className="text-[11px] mt-1" style={{ color: "var(--mu)" }}>{format(b.createdAt, "d MMM HH:mm")}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === "events" && (
          <p className="text-[14px]" style={{ color: "var(--mu)" }}>Events coming soon. Use the board for now.</p>
        )}
      </div>
    </div>
  );
}
