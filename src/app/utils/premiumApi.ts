/**
 * Premium API — server is source of truth. Never trust client/localStorage for premium.
 * GET /premium returns current status; POST /premium/sync verifies with RevenueCat and updates server.
 */

import { serverUrl } from "./supabase";

export async function fetchPremiumStatus(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${serverUrl}/premium`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { premium?: boolean };
    return !!data.premium;
  } catch {
    return false;
  }
}

export async function syncPremiumFromRevenueCat(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${serverUrl}/premium/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { premium?: boolean };
    return !!data.premium;
  } catch {
    return false;
  }
}
