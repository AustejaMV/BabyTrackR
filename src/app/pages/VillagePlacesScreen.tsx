import { useState, useEffect } from "react";
import { Link } from "react-router";
import { MapPin, Plus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { fetchVenues, addVenue, type VillageVenue } from "../utils/villageVenueService";
import { toast } from "sonner";

const VENUE_TYPES = ["cafe", "restaurant", "soft_play", "library", "other"] as const;

export function VillagePlacesScreen() {
  const { session } = useAuth();
  const [venues, setVenues] = useState<VillageVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [venueType, setVenueType] = useState<string>("cafe");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }
    fetchVenues(session.access_token)
      .then(setVenues)
      .catch(() => toast.error("Could not load venues"))
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  const handleAdd = async () => {
    if (!session?.access_token || !name.trim() || !address.trim()) {
      toast.error("Name and address required");
      return;
    }
    setSubmitting(true);
    try {
      await addVenue(session.access_token, { name: name.trim(), address: address.trim(), venueType });
      toast.success("Venue added");
      setName("");
      setAddress("");
      setShowAdd(false);
      const list = await fetchVenues(session.access_token);
      setVenues(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add venue");
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
        <div className="flex items-center justify-between gap-2 mb-4">
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: "var(--tx)" }}>
            <MapPin className="w-6 h-6" style={{ color: "var(--pink)" }} />
            Places
          </h1>
          {session?.access_token && (
            <button
              type="button"
              onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-1 py-2 px-3 rounded-xl text-[14px] font-medium"
              style={{ background: "var(--pink)", color: "white" }}
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>

        {!session?.access_token ? (
          <p className="text-[14px]" style={{ color: "var(--mu)" }}>
            Sign in to view and add baby-friendly venues.
          </p>
        ) : showAdd ? (
          <div className="rounded-2xl border p-4 mb-4" style={{ borderColor: "var(--bd)", background: "var(--card)" }}>
            <input
              type="text"
              placeholder="Venue name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-[14px] mb-2"
              style={{ borderColor: "var(--bd)", background: "var(--bg)", color: "var(--tx)" }}
            />
            <input
              type="text"
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-[14px] mb-2"
              style={{ borderColor: "var(--bd)", background: "var(--bg)", color: "var(--tx)" }}
            />
            <select
              value={venueType}
              onChange={(e) => setVenueType(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-[14px] mb-3"
              style={{ borderColor: "var(--bd)", background: "var(--bg)", color: "var(--tx)" }}
            >
              {VENUE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl font-medium text-white"
                style={{ background: "var(--pink)" }}
              >
                {submitting ? "Adding…" : "Add venue"}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2.5 rounded-xl border"
                style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="text-[14px]" style={{ color: "var(--mu)" }}>Loading…</p>
        ) : venues.length === 0 ? (
          <p className="text-[14px]" style={{ color: "var(--mu)" }}>
            No venues yet. Add one to get started.
          </p>
        ) : (
          <ul className="space-y-2">
            {venues.map((v) => (
              <li
                key={v.id}
                className="rounded-2xl border p-4"
                style={{ borderColor: "var(--bd)", background: "var(--card)" }}
              >
                <div className="font-medium" style={{ color: "var(--tx)" }}>{v.name}</div>
                <div className="text-[13px] mt-0.5" style={{ color: "var(--mu)" }}>{v.address}</div>
                <span className="inline-block mt-1 text-[12px] px-2 py-0.5 rounded" style={{ background: "var(--pe)", color: "var(--pink)" }}>
                  {v.venueType.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
