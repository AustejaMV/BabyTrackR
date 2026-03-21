import { useState, useEffect } from "react";
import { Link } from "react-router";
import { MapPin, Plus, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { fetchVenues, addVenue, fetchVenueReviews, addVenueReview, getVenueMapsUrl, type VillageVenue, type VillageVenueReview } from "../utils/villageVenueService";
import { toast } from "sonner";
import { format } from "date-fns";
import { SHORT_DATETIME_DISPLAY } from "../utils/dateUtils";

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<VillageVenueReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewWouldReturn, setReviewWouldReturn] = useState("yes");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const toggleVenueDetail = async (venueId: string) => {
    if (expandedId === venueId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(venueId);
    if (!session?.access_token) return;
    setReviewsLoading(true);
    setReviews([]);
    try {
      const data = await fetchVenueReviews(session.access_token, venueId);
      setReviews(data);
    } catch {
      toast.error("Could not load reviews");
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleAddReview = async () => {
    if (!session?.access_token || !expandedId) return;
    setReviewSubmitting(true);
    try {
      await addVenueReview(session.access_token, expandedId, {
        would_return: reviewWouldReturn,
        content: reviewContent.trim() || undefined,
      });
      toast.success("Review posted");
      setReviewContent("");
      const data = await fetchVenueReviews(session.access_token, expandedId);
      setReviews(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setReviewSubmitting(false);
    }
  };

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
            {venues.map((v) => {
              const isExpanded = expandedId === v.id;
              return (
                <li
                  key={v.id}
                  className="rounded-2xl border overflow-hidden"
                  style={{ borderColor: "var(--bd)", background: "var(--card)" }}
                >
                  <div className="p-4">
                    <button
                      type="button"
                      onClick={() => toggleVenueDetail(v.id)}
                      className="w-full text-left flex items-start justify-between"
                      style={{ background: "none", border: "none" }}
                    >
                      <div>
                        <div className="font-medium" style={{ color: "var(--tx)" }}>{v.name}</div>
                        <div className="text-[13px] mt-0.5" style={{ color: "var(--mu)" }}>{v.address}</div>
                        <span className="inline-block mt-1 text-[12px] px-2 py-0.5 rounded" style={{ background: "var(--pe)", color: "var(--pink)" }}>
                          {v.venueType.replace("_", " ")}
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0 mt-1" style={{ color: "var(--mu)" }} /> : <ChevronDown className="w-4 h-4 shrink-0 mt-1" style={{ color: "var(--mu)" }} />}
                    </button>
                    <a
                      href={getVenueMapsUrl(v)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-[13px] font-medium"
                      style={{ color: "var(--pink)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in Google Maps
                    </a>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0" style={{ borderTop: "1px solid var(--bd)" }}>
                      <a
                        href={getVenueMapsUrl(v)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 py-2 px-3 rounded-xl text-[13px] font-medium mb-3"
                        style={{ background: "var(--pe)", color: "var(--pink)" }}
                      >
                        <MapPin className="w-4 h-4" />
                        Open in Google Maps
                      </a>
                      <h3 className="text-[13px] font-medium mt-3 mb-2" style={{ color: "var(--tx)" }}>Reviews</h3>
                      {reviewsLoading ? (
                        <p className="text-[13px]" style={{ color: "var(--mu)" }}>Loading…</p>
                      ) : reviews.length === 0 ? (
                        <p className="text-[13px]" style={{ color: "var(--mu)" }}>No reviews yet.</p>
                      ) : (
                        <ul className="space-y-2 mb-3">
                          {reviews.map(r => (
                            <li key={r.id} className="rounded-xl p-3" style={{ background: "var(--bg)" }}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[12px] font-medium" style={{ color: r.wouldReturn === "yes" ? "#4a8a4a" : r.wouldReturn === "maybe" ? "#c4960a" : "#d4604a" }}>
                                  {r.wouldReturn === "yes" ? "Would return" : r.wouldReturn === "maybe" ? "Maybe" : "Would not return"}
                                </span>
                              </div>
                              {r.content && <p className="text-[13px]" style={{ color: "var(--tx)" }}>{r.content}</p>}
                              <p className="text-[11px] mt-1" style={{ color: "var(--mu)" }}>{format(r.createdAt, SHORT_DATETIME_DISPLAY())}</p>
                            </li>
                          ))}
                        </ul>
                      )}

                      {session?.access_token && (
                        <div className="rounded-xl p-3 mt-2" style={{ background: "var(--bg)" }}>
                          <div className="flex gap-2 mb-2">
                            {(["yes", "maybe", "no"] as const).map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setReviewWouldReturn(val)}
                                className="py-1.5 px-3 rounded-lg text-[12px] font-medium"
                                style={{
                                  background: reviewWouldReturn === val ? "var(--pink)" : "var(--card)",
                                  color: reviewWouldReturn === val ? "white" : "var(--tx)",
                                  border: reviewWouldReturn === val ? "none" : "1px solid var(--bd)",
                                }}
                              >
                                {val === "yes" ? "Would return" : val === "maybe" ? "Maybe" : "Wouldn't return"}
                              </button>
                            ))}
                          </div>
                          <textarea
                            placeholder="Comment (optional)"
                            value={reviewContent}
                            onChange={e => setReviewContent(e.target.value)}
                            rows={2}
                            className="w-full rounded-xl border px-3 py-2 text-[13px] mb-2 resize-none"
                            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
                          />
                          <button
                            type="button"
                            onClick={handleAddReview}
                            disabled={reviewSubmitting}
                            className="w-full py-2 rounded-xl font-medium text-white text-[13px]"
                            style={{ background: "var(--pink)" }}
                          >
                            {reviewSubmitting ? "Posting…" : "Post review"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
