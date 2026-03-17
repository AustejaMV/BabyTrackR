import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { MessageCircle, Plus, Link2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { fetchMyGroups, createGroup, joinGroupByShortcode, type VillageGroup } from "../utils/villageGroupService";
import { toast } from "sonner";

export function VillageGroupsScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { session } = useAuth();
  const [groups, setGroups] = useState<VillageGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [shortcode, setShortcode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const joinParam = searchParams.get("join");
  useEffect(() => {
    if (joinParam) {
      setShortcode(joinParam);
      setShowJoin(true);
      setShowCreate(false);
      setSearchParams({}, { replace: true });
    }
  }, [joinParam, setSearchParams]);

  const load = () => {
    if (!session?.access_token) return;
    fetchMyGroups(session.access_token)
      .then(setGroups)
      .catch(() => toast.error("Could not load groups"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }
    load();
  }, [session?.access_token]);

  const handleCreate = async () => {
    if (!session?.access_token || !groupName.trim()) {
      toast.error("Enter a group name");
      return;
    }
    setSubmitting(true);
    try {
      const { id, shortcode: code } = await createGroup(session.access_token, groupName.trim());
      toast.success(`Group created! Share link: /join/${code}`);
      setGroupName("");
      setShowCreate(false);
      load();
      navigate(`/village/groups/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create group");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!session?.access_token || !shortcode.trim()) {
      toast.error("Enter the join code");
      return;
    }
    setSubmitting(true);
    try {
      const { id } = await joinGroupByShortcode(session.access_token, shortcode.trim());
      toast.success("Joined group");
      setShortcode("");
      setShowJoin(false);
      load();
      navigate(`/village/groups/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not join");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <div className="p-4">
        <Link to="/village" className="text-[14px] mb-4 inline-block" style={{ color: "var(--pink)" }}>
          ← Village
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2 mb-4" style={{ color: "var(--tx)" }}>
          <MessageCircle className="w-6 h-6" style={{ color: "var(--pink)" }} />
          Groups
        </h1>

        {!session?.access_token ? (
          <p className="text-[14px]" style={{ color: "var(--mu)" }}>
            Sign in to create or join groups.
          </p>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => { setShowCreate(true); setShowJoin(false); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium"
                style={{ background: "var(--pink)", color: "white" }}
              >
                <Plus className="w-4 h-4" /> Create group
              </button>
              <button
                type="button"
                onClick={() => { setShowJoin(true); setShowCreate(false); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border"
                style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
              >
                <Link2 className="w-4 h-4" /> Join with code
              </button>
            </div>

            {showCreate && (
              <div className="rounded-2xl border p-4 mb-4" style={{ borderColor: "var(--bd)", background: "var(--card)" }}>
                <input
                  type="text"
                  placeholder="Group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-[14px] mb-3"
                  style={{ borderColor: "var(--bd)", background: "var(--bg)", color: "var(--tx)" }}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={handleCreate} disabled={submitting} className="flex-1 py-2.5 rounded-xl font-medium text-white" style={{ background: "var(--pink)" }}>
                    {submitting ? "Creating…" : "Create"}
                  </button>
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-xl border" style={{ borderColor: "var(--bd)", color: "var(--tx)" }}>Cancel</button>
                </div>
              </div>
            )}

            {showJoin && (
              <div className="rounded-2xl border p-4 mb-4" style={{ borderColor: "var(--bd)", background: "var(--card)" }}>
                <input
                  type="text"
                  placeholder="Join code (e.g. abc12xyz)"
                  value={shortcode}
                  onChange={(e) => setShortcode(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-[14px] mb-3"
                  style={{ borderColor: "var(--bd)", background: "var(--bg)", color: "var(--tx)" }}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={handleJoin} disabled={submitting} className="flex-1 py-2.5 rounded-xl font-medium text-white" style={{ background: "var(--pink)" }}>
                    {submitting ? "Joining…" : "Join"}
                  </button>
                  <button type="button" onClick={() => setShowJoin(false)} className="px-4 py-2.5 rounded-xl border" style={{ borderColor: "var(--bd)", color: "var(--tx)" }}>Cancel</button>
                </div>
              </div>
            )}

            {loading ? (
              <p className="text-[14px]" style={{ color: "var(--mu)" }}>Loading…</p>
            ) : groups.length === 0 ? (
              <p className="text-[14px]" style={{ color: "var(--mu)" }}>You’re not in any groups yet. Create one or join with a code.</p>
            ) : (
              <ul className="space-y-2">
                {groups.map((g) => (
                  <Link
                    key={g.id}
                    to={`/village/groups/${g.id}`}
                    className="block rounded-2xl border p-4"
                    style={{ borderColor: "var(--bd)", background: "var(--card)" }}
                  >
                    <div className="font-medium" style={{ color: "var(--tx)" }}>{g.name}</div>
                    <div className="text-[12px] mt-0.5" style={{ color: "var(--mu)" }}>Code: {g.shortcode}</div>
                  </Link>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
