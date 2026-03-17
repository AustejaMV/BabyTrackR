import { serverUrl } from "./supabase";

export interface VillageVenue {
  id: string;
  name: string;
  address: string;
  venueType: string;
  lat?: number | null;
  lng?: number | null;
  addedBy?: string;
  createdAt: number;
}

export interface VillageVenueReview {
  id: string;
  reviewerId: string;
  wouldReturn: string;
  content: string;
  createdAt: number;
}

export async function fetchVenues(token: string): Promise<VillageVenue[]> {
  const res = await fetch(`${serverUrl}/village/venues`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("fetch_venues_failed");
  const data = (await res.json()) as { venues?: VillageVenue[] };
  return data.venues ?? [];
}

export async function addVenue(
  token: string,
  params: { name: string; address: string; venueType: string; lat?: number; lng?: number }
): Promise<{ id: string }> {
  const res = await fetch(`${serverUrl}/village/venues`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "add_venue_failed");
  }
  const data = (await res.json()) as { id: string };
  return data;
}

export async function fetchVenueReviews(token: string, venueId: string): Promise<VillageVenueReview[]> {
  const res = await fetch(`${serverUrl}/village/venues/${venueId}/reviews`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("fetch_reviews_failed");
  const data = (await res.json()) as { reviews?: VillageVenueReview[] };
  return data.reviews ?? [];
}

export async function addVenueReview(
  token: string,
  venueId: string,
  params: { would_return: string; content?: string }
): Promise<{ id: string }> {
  const res = await fetch(`${serverUrl}/village/venues/${venueId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ would_return: params.would_return, content: params.content ?? "" }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "add_review_failed");
  }
  const data = (await res.json()) as { id: string };
  return data;
}
