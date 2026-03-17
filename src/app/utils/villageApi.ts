/**
 * Village API: night ping, delete-my-data. Uses Edge Function server.
 */

import { serverUrl } from "./supabase";

export const NIGHT_PING_CONSENT_KEY = "cradl-night-ping-consent";

export async function villageNightPing(
  lat: number,
  lng: number,
  accessToken: string
): Promise<{ count: number }> {
  const res = await fetch(`${serverUrl}/village/night-ping`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      lat: Math.round(lat * 1000) / 1000,
      lng: Math.round(lng * 1000) / 1000,
      radiusKm: 5,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "night_ping_failed");
  }
  const data = (await res.json()) as { count?: number };
  return { count: Math.min(999, Math.max(0, data.count ?? 0)) };
}

export function getNightPingConsent(): boolean {
  try {
    return localStorage.getItem(NIGHT_PING_CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

export function setNightPingConsent(consent: boolean): void {
  try {
    localStorage.setItem(NIGHT_PING_CONSENT_KEY, String(consent));
  } catch {}
}

export function formatNightCount(count: number): string {
  if (count <= 0) return "";
  if (count <= 5) return `${count}`;
  if (count <= 20) return "A few";
  if (count <= 50) return "Many";
  return "Lots of";
}

export async function villageDeleteMyData(accessToken: string): Promise<void> {
  const res = await fetch(`${serverUrl}/village/delete-my-data`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("delete_failed");
}
