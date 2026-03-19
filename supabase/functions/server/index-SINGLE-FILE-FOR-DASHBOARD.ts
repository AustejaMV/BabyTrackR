/**
 * SINGLE-FILE VERSION FOR SUPABASE DASHBOARD
 * Paste this entire file as the "server" Edge Function in Supabase Dashboard.
 * Requires: table kv_store_71db3e83 (key TEXT PRIMARY KEY, value JSONB) and secrets SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { Hono } from "npm:hono@3";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const KV_TABLE = "kv_store_71db3e83";

const app = new Hono();
const FUNCTION_NAME = "server";
const ALLOWED_ORIGINS = ["https://babytrackr.fejefeja.workers.dev", "http://localhost:5173", "http://localhost:3000"];

function makeCorsHeaders(origin: string | null) {
  const headers = new Headers();
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  headers.set("Access-Control-Allow-Origin", allowOrigin);
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization,Content-Type,ApiKey,apikey");
  headers.set("Access-Control-Expose-Headers", "Content-Length");
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Max-Age", "600");
  return headers;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Inline KV using the same table as kv_store.tsx (no separate file needed)
async function kvGet(key: string): Promise<any> {
  const { data, error } = await supabase.from(KV_TABLE).select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value;
}
async function kvSet(key: string, value: any): Promise<void> {
  const { error } = await supabase.from(KV_TABLE).upsert({ key, value }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

async function verifyUser(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return { user: null, error: "No authorization header" };
  const token = authHeader.split(" ")[1];
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { user: null, error: "Invalid token" };
  return { user: data.user, error: null };
}

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/family", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const familyId = await kvGet(`user:${user!.id}:family`);
  if (!familyId) return c.json({ family: null });
  const family = await kvGet(`family:${familyId}`);
  return c.json({ family: family ?? null });
});

app.post("/family/create", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const familyName = body?.familyName ?? "My Family";
  const familyId = `family_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  try {
    await kvSet(`family:${familyId}`, {
      id: familyId,
      name: familyName,
      createdBy: user!.id,
      createdAt: Date.now(),
      members: [user!.id],
    });
    await kvSet(`user:${user!.id}:family`, familyId);
    const readBack = await kvGet(`user:${user!.id}:family`);
    if (readBack !== familyId) {
      console.error("family/create read-back failed", { familyId, readBack });
      // Still return 200 with familyId so the client can proceed
    }
  } catch (e) {
    console.error("family/create storage failed", e);
    return c.json({ error: "storage_failed", detail: String(e) }, 500);
  }
  return c.json({ familyId });
});

app.post("/family/invite", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const email = body?.email;
  if (!email || typeof email !== "string") return c.json({ error: "invalid_email" }, 400);
  const familyId = body?.family_id ?? (await kvGet(`user:${user!.id}:family`));
  if (!familyId) return c.json({ error: "no_family" }, 400);

  const inviteId = `invite_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const invite = {
    id: inviteId,
    familyId,
    email: email.toLowerCase(),
    invitedBy: body?.inviter_id ?? user!.id,
    status: "pending",
    createdAt: Date.now(),
  };
  await kvSet(`invite:${inviteId}`, invite);
  await kvSet(`invite:email:${email.toLowerCase()}`, inviteId);
  return c.json({ success: true, invite }, 201);
});

app.get("/family/invites", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const email = (user!.email ?? "").trim().toLowerCase();
  if (!email) return c.json({ invites: [], noEmail: true });
  const rawInviteId = await kvGet(`invite:email:${email}`);
  const inviteId = typeof rawInviteId === "string" ? rawInviteId : null;
  if (!inviteId) return c.json({ invites: [] });
  const invite = await kvGet(`invite:${inviteId}`);
  if (!invite || invite.status !== "pending") return c.json({ invites: [] });
  const family = await kvGet(`family:${invite.familyId}`);
  const list = [{ ...invite, familyName: family?.name ?? "A family" }];
  return c.json({ invites: list });
});

app.post("/family/accept-invite", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const inviteId = body?.inviteId;
  if (!inviteId) return c.json({ error: "invalid_invite" }, 400);
  const invite = await kvGet(`invite:${inviteId}`);
  if (!invite || invite.status !== "pending") return c.json({ error: "Invalid invite" }, 400);

  const familyId = invite.familyId;
  const family = await kvGet(`family:${familyId}`);
  if (!family) return c.json({ error: "family_not_found" }, 400);
  if (!family.members.includes(user!.id)) {
    family.members.push(user!.id);
    await kvSet(`family:${familyId}`, family);
  }
  await kvSet(`user:${user!.id}:family`, familyId);
  invite.status = "accepted";
  await kvSet(`invite:${inviteId}`, invite);
  return c.json({ success: true, familyId, familyName: family.name ?? "Family" });
});

app.post("/family/decline-invite", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const inviteId = body?.inviteId;
  if (!inviteId) return c.json({ error: "invalid_invite" }, 400);
  const invite = await kvGet(`invite:${inviteId}`);
  if (!invite || invite.status !== "pending") return c.json({ error: "Invalid or already used invite" }, 400);
  if (invite.email?.toLowerCase() !== (user!.email ?? "").trim().toLowerCase()) {
    return c.json({ error: "Invite is for a different email" }, 403);
  }
  invite.status = "declined";
  await kvSet(`invite:${inviteId}`, invite);
  return c.json({ success: true });
});

const DATA_TYPES = [
  "sleepHistory",
  "feedingHistory",
  "diaperHistory",
  "tummyTimeHistory",
  "bottleHistory",
  "pumpHistory",
  "currentSleep",
  "currentTummyTime",
  "feedingInterval",
  "feedingActiveSession",
  "painkillerHistory",
  "cradl-notes",
  "shoppingList",
  "babyProfile",
  "milestones",
  "temperatureHistory",
  "symptomHistory",
  "medicationHistory",
  "solidFoodHistory",
  "growthMeasurements",
  "activityHistory",
  "woundCareHistory",
  "pelvicFloorHistory",
  "breastPainHistory",
  "epdsResponses",
  "skinFlares",
  "skinCreams",
  "skinTriggers",
  "mumSleepHistory",
  "returnToWorkPlan",
  "memoryDays",
  "memoryMonthlyRecaps",
  "customTrackers",
  "customTrackerLogs",
  "spitUpHistory",
  "babytrackr-appointments",
];

app.post("/data/save", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const familyId = await kvGet(`user:${user!.id}:family`);
  if (!familyId) return c.json({ error: "no_family" }, 400);
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const dataType = body?.dataType;
  const data = body?.data;
  if (!dataType) return c.json({ error: "missing_dataType" }, 400);
  await kvSet(`data:${familyId}:${dataType}`, {
    data,
    updatedBy: user!.id,
    updatedAt: Date.now(),
  });
  return c.json({ success: true });
});

app.get("/data/:dataType", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const familyId = await kvGet(`user:${user!.id}:family`);
  if (!familyId) return c.json({ data: null });
  const dataType = c.req.param("dataType");
  const row = await kvGet(`data:${familyId}:${dataType}`);
  return c.json({ data: row?.data ?? null });
});

app.get("/data/all", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const familyId = await kvGet(`user:${user!.id}:family`);
  if (!familyId) return c.json({ data: {} });
  const allData: Record<string, any> = {};
  for (const dataType of DATA_TYPES) {
    const row = await kvGet(`data:${familyId}:${dataType}`);
    if (row?.data !== undefined) allData[dataType] = row.data;
  }
  return c.json({ data: allData });
});

// Handoff: public read by session id; auth create; anon add log if session valid
app.get("/handoff/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  if (!sessionId) return c.json({ error: "missing_session_id" }, 400);
  const session = await kvGet(`handoff:${sessionId}`);
  if (!session) return c.json({ error: "not_found" }, 404);
  if (new Date(session.expiresAt).getTime() < Date.now()) return c.json({ error: "expired" }, 410);
  return c.json(session);
});

app.post("/handoff", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const sessionId = body?.id;
  if (!sessionId || typeof sessionId !== "string") return c.json({ error: "missing_id" }, 400);
  await kvSet(`handoff:${sessionId}`, body);
  await kvSet(`handoff_logs:${sessionId}`, body.logs ?? []);
  return c.json({ success: true });
});

app.post("/handoff/log", async (c) => {
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const { sessionId, type, loggedByName, note } = body;
  if (!sessionId || !type || !loggedByName) return c.json({ error: "missing_fields" }, 400);
  if (!["feed", "sleep", "diaper"].includes(type)) return c.json({ error: "invalid_type" }, 400);
  const session = await kvGet(`handoff:${sessionId}`);
  if (!session) return c.json({ error: "session_not_found" }, 404);
  if (new Date(session.expiresAt).getTime() < Date.now()) return c.json({ error: "session_expired" }, 410);
  const logs = (await kvGet(`handoff_logs:${sessionId}`)) ?? [];
  const newLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    loggedAt: new Date().toISOString(),
    loggedByName: String(loggedByName),
    note: note != null ? String(note) : null,
  };
  logs.push(newLog);
  await kvSet(`handoff_logs:${sessionId}`, logs);
  return c.json(newLog, 201);
});

app.get("/handoff/:sessionId/logs", async (c) => {
  const sessionId = c.req.param("sessionId");
  if (!sessionId) return c.json([], 200);
  const logs = (await kvGet(`handoff_logs:${sessionId}`)) ?? [];
  return c.json(logs);
});

// ─── Village: safety & night ping (KV-based) ─────────────────────────────────
function contentFilter(text: string): { ok: boolean; reason?: string } {
  if (typeof text !== "string") return { ok: false, reason: "invalid" };
  const t = text.slice(0, 5000);
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(t)) return { ok: false, reason: "email_not_allowed" };
  if (/\b(\+?\d{10,14}|\d{4,5}\s*\d{4,5})\b/.test(t)) return { ok: false, reason: "phone_not_allowed" };
  if (/https?:\/\/[^\s]+/i.test(t)) return { ok: false, reason: "url_not_allowed" };
  return { ok: true };
}

function geohash4(lat: number, lng: number): string {
  const la = Math.max(-90, Math.min(90, lat));
  const lo = Math.max(-180, Math.min(180, lng));
  const y = Math.floor(((la + 90) / 180) * 32).toString(32).padStart(2, "0").slice(0, 2);
  const x = Math.floor(((lo + 180) / 360) * 32).toString(32).padStart(2, "0").slice(0, 2);
  return (y + x).slice(0, 4);
}

const NIGHT_PING_RATE_MS = 10 * 60 * 1000;
const NIGHT_PING_TTL_MS = 90 * 60 * 1000;
const NIGHT_COUNT_WINDOW_MS = 60 * 60 * 1000;

app.post("/village/night-ping", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const lat = typeof body.lat === "number" ? body.lat : parseFloat(body.lat);
  const lng = typeof body.lng === "number" ? body.lng : parseFloat(body.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return c.json({ error: "invalid_lat_lng" }, 400);
  }
  const rateKey = `village:night_rate:${user!.id}`;
  const last = await kvGet(rateKey);
  const now = Date.now();
  if (typeof last === "number" && now - last < NIGHT_PING_RATE_MS) {
    return c.json({ error: "rate_limit", retryAfter: Math.ceil((NIGHT_PING_RATE_MS - (now - last)) / 1000) }, 429);
  }
  const gh = geohash4(lat, lng);
  const prefix3 = gh.slice(0, 3);
  const pingsKey = "village:night_pings";
  let pings: { geohash: string; pinged_at: number }[] = (await kvGet(pingsKey)) ?? [];
  const cut = now - NIGHT_PING_TTL_MS;
  pings = pings.filter((p) => p.pinged_at > cut);
  pings.push({ geohash: gh, pinged_at: now });
  await kvSet(pingsKey, pings);
  await kvSet(rateKey, now);

  const windowStart = now - NIGHT_COUNT_WINDOW_MS;
  let count = pings.filter((p) => p.geohash.startsWith(prefix3) && p.pinged_at >= windowStart).length;
  if (count > 0) count -= 1;
  const capped = Math.min(999, count);
  return c.json({ count: capped });
});

app.post("/village/delete-my-data", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const uid = user!.id;
  const keysToDelete = [
    `village:night_rate:${uid}`,
    `village:profile:${uid}`,
    `village:groups_joined:${uid}`,
  ];
  for (const k of keysToDelete) {
    try {
      await supabase.from(KV_TABLE).delete().eq("key", k);
    } catch {
      /* ignore */
    }
  }
  return c.json({ success: true });
});

// ─── Village: venues (KV) ────────────────────────────────────────────────────
app.get("/village/venues", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const list: any[] = (await kvGet("village:venues")) ?? [];
  return c.json({ venues: list });
});

app.post("/village/venues", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const name = String(body.name ?? "").trim().slice(0, 120);
  const address = String(body.address ?? "").trim().slice(0, 300);
  const venueType = ["cafe", "restaurant", "soft_play", "library", "other"].includes(body.venueType) ? body.venueType : "other";
  if (!name || !address) return c.json({ error: "name_and_address_required" }, 400);
  const list: any[] = (await kvGet("village:venues")) ?? [];
  const id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  list.push({
    id,
    name,
    address,
    venueType,
    lat: typeof body.lat === "number" ? body.lat : null,
    lng: typeof body.lng === "number" ? body.lng : null,
    addedBy: user!.id,
    createdAt: Date.now(),
  });
  await kvSet("village:venues", list);
  return c.json({ id }, 201);
});

app.post("/village/venues/:id/reviews", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const venueId = c.req.param("id");
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const wouldReturn = ["yes", "yes_with_caveats", "no"].includes(body.would_return) ? body.would_return : null;
  if (!wouldReturn) return c.json({ error: "would_return_required" }, 400);
  const content = String(body.content ?? "").trim().slice(0, 500);
  const filter = contentFilter(content);
  if (!filter.ok) return c.json({ error: filter.reason ?? "content_not_allowed" }, 400);
  const list: any[] = (await kvGet("village:venues")) ?? [];
  if (!list.some((v) => v.id === venueId)) return c.json({ error: "venue_not_found" }, 404);
  const key = `village:venue_reviews:${venueId}`;
  const reviews: any[] = (await kvGet(key)) ?? [];
  const id = `r_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  reviews.push({ id, reviewerId: user!.id, wouldReturn, content, createdAt: Date.now() });
  await kvSet(key, reviews);
  return c.json({ id }, 201);
});

app.get("/village/venues/:id/reviews", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const venueId = c.req.param("id");
  const reviews: any[] = (await kvGet(`village:venue_reviews:${venueId}`)) ?? [];
  return c.json({ reviews });
});

// ─── Village: groups (KV) ─────────────────────────────────────────────────────
function shortcode8(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

app.post("/village/groups", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const name = String(body.name ?? "Group").trim().slice(0, 60);
  const list: any[] = (await kvGet("village:groups")) ?? [];
  let code = shortcode8();
  while (list.some((g) => g.shortcode === code)) code = shortcode8();
  const id = `g_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  list.push({ id, shortcode: code, name, createdBy: user!.id, createdAt: Date.now() });
  await kvSet("village:groups", list);
  const members: any[] = [{ userId: user!.id, role: "owner" }];
  await kvSet(`village:group_members:${id}`, members);
  return c.json({ id, shortcode: code }, 201);
});

app.post("/village/groups/join", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const shortcode = String(body.shortcode ?? "").trim().toLowerCase().slice(0, 8);
  if (!shortcode) return c.json({ error: "shortcode_required" }, 400);
  const list: any[] = (await kvGet("village:groups")) ?? [];
  const group = list.find((g) => g.shortcode === shortcode);
  if (!group) return c.json({ error: "group_not_found" }, 404);
  const members: any[] = (await kvGet(`village:group_members:${group.id}`)) ?? [];
  if (members.some((m) => m.userId === user!.id)) return c.json({ id: group.id, shortcode: group.shortcode });
  members.push({ userId: user!.id, role: "member" });
  await kvSet(`village:group_members:${group.id}`, members);
  return c.json({ id: group.id, shortcode: group.shortcode }, 200);
});

app.get("/village/groups/mine", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const list: any[] = (await kvGet("village:groups")) ?? [];
  const mine: any[] = [];
  for (const g of list) {
    const members: any[] = (await kvGet(`village:group_members:${g.id}`)) ?? [];
    if (members.some((m) => m.userId === user!.id)) mine.push(g);
  }
  return c.json({ groups: mine });
});

app.get("/village/groups/:id/messages", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const groupId = c.req.param("id");
  const members: any[] = (await kvGet(`village:group_members:${groupId}`)) ?? [];
  if (!members.some((m) => m.userId === user!.id)) return c.json({ error: "forbidden" }, 403);
  const messages: any[] = (await kvGet(`village:group_messages:${groupId}`)) ?? [];
  return c.json({ messages });
});

app.post("/village/groups/:id/messages", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const groupId = c.req.param("id");
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const content = String(body.content ?? "").trim().slice(0, 2000);
  if (!content) return c.json({ error: "content_required" }, 400);
  const filter = contentFilter(content);
  if (!filter.ok) return c.json({ error: filter.reason ?? "content_not_allowed" }, 400);
  const members: any[] = (await kvGet(`village:group_members:${groupId}`)) ?? [];
  if (!members.some((m) => m.userId === user!.id)) return c.json({ error: "forbidden" }, 403);
  const messages: any[] = (await kvGet(`village:group_messages:${groupId}`)) ?? [];
  const id = `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  messages.push({ id, senderId: user!.id, content, sentAt: Date.now() });
  await kvSet(`village:group_messages:${groupId}`, messages);
  return c.json({ id }, 201);
});

// ─── Village: QA (KV) ───────────────────────────────────────────────────────
app.get("/village/qa/questions", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const questions: any[] = (await kvGet("village:qa_questions")) ?? [];
  return c.json({ questions: questions.slice(-100) });
});

app.post("/village/qa/questions", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const content = String(body.content ?? "").trim().slice(0, 280);
  if (content.length < 10) return c.json({ error: "content_too_short" }, 400);
  const filter = contentFilter(content);
  if (!filter.ok) return c.json({ error: filter.reason ?? "content_not_allowed" }, 400);
  const ageBand = String(body.age_band ?? "0-12").slice(0, 20);
  const questions: any[] = (await kvGet("village:qa_questions")) ?? [];
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  questions.push({ id, content, ageBand, createdAt: Date.now() });
  await kvSet("village:qa_questions", questions);
  return c.json({ id }, 201);
});

app.get("/village/qa/questions/:id/answers", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const qId = c.req.param("id");
  const answers: any[] = (await kvGet(`village:qa_answers:${qId}`)) ?? [];
  return c.json({ answers });
});

app.post("/village/qa/questions/:id/answers", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const qId = c.req.param("id");
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const content = String(body.content ?? "").trim().slice(0, 1000);
  if (!content) return c.json({ error: "content_required" }, 400);
  const filter = contentFilter(content);
  if (!filter.ok) return c.json({ error: filter.reason ?? "content_not_allowed" }, 400);
  const answers: any[] = (await kvGet(`village:qa_answers:${qId}`)) ?? [];
  const id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  answers.push({ id, content, createdAt: Date.now() });
  await kvSet(`village:qa_answers:${qId}`, answers);
  return c.json({ id }, 201);
});

// ─── Village: group board (KV) ───────────────────────────────────────────────
app.get("/village/groups/:id/board", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const groupId = c.req.param("id");
  const members: any[] = (await kvGet(`village:group_members:${groupId}`)) ?? [];
  if (!members.some((m) => m.userId === user!.id)) return c.json({ error: "forbidden" }, 403);
  const items: any[] = (await kvGet(`village:group_board:${groupId}`)) ?? [];
  return c.json({ items });
});

app.post("/village/groups/:id/board", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const groupId = c.req.param("id");
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const title = String(body.title ?? "").trim().slice(0, 100);
  const boardBody = String(body.body ?? "").trim().slice(0, 500);
  if (title.length < 3) return c.json({ error: "title_too_short" }, 400);
  const filter = contentFilter(boardBody);
  if (!filter.ok) return c.json({ error: filter.reason ?? "content_not_allowed" }, 400);
  const members: any[] = (await kvGet(`village:group_members:${groupId}`)) ?? [];
  if (!members.some((m) => m.userId === user!.id)) return c.json({ error: "forbidden" }, 403);
  const items: any[] = (await kvGet(`village:group_board:${groupId}`)) ?? [];
  const id = `b_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  items.push({ id, title, body: boardBody, createdBy: user!.id, createdAt: Date.now(), pinned: false });
  await kvSet(`village:group_board:${groupId}`, items);
  return c.json({ id }, 201);
});

// ── Ask Cradl AI ───────────────────────────────────────────────────────
app.post("/ask-cradl", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error || !user) return c.json({ error: error ?? "auth" }, 401);

  const body = await c.req.json();
  const { question, babyAgeWeeks, recentContext } = body;
  const trimmed = (question ?? "").trim();
  if (!trimmed || trimmed.length > 500) return c.json({ error: "invalid_question" }, 400);

  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_KEY) {
    return c.json({
      answer: "Ask Cradl AI is not configured yet. Set the OPENAI_API_KEY secret in your Supabase Edge Function.",
      escalationLevel: "routine",
      escalationMessage: "This feature needs an OpenAI API key to work.",
      disclaimer: "This is general information, not medical advice.",
    });
  }

  const dailyKey = `ask_cradl_daily:${user.id}:${new Date().toISOString().slice(0, 10)}`;
  const dailyCount: number = (await kvGet(dailyKey)) ?? 0;
  if (dailyCount >= 10) {
    return c.json({ error: "daily_limit", answer: "You've used all 10 questions for today. Try again tomorrow." }, 429);
  }

  const contextStr = recentContext
    ? `Recent: feed ${recentContext.lastFeedHoursAgo ?? "unknown"}h ago, sleep ${recentContext.lastSleepHoursAgo ?? "unknown"}h ago, nappy ${recentContext.lastDiaperHoursAgo ?? "unknown"}h ago.`
    : "";

  const systemPrompt = `You are a caring baby health advisor for a ${babyAgeWeeks ?? "young"}-week-old baby. ${contextStr}
Give evidence-based, reassuring answers in plain English. Never use medical jargon without explaining it.
If the question suggests an emergency (breathing difficulty, unresponsive, seizure), say to call 999/911 immediately.
Keep answers under 150 words. End with one word on a new line: "routine", "monitor", or "urgent".`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: trimmed }],
        max_tokens: 300,
        temperature: 0.4,
      }),
    });

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    const lines = raw.trim().split("\n");
    const lastLine = lines[lines.length - 1]?.trim().toLowerCase();
    const level = lastLine === "urgent" ? "urgent" : lastLine === "monitor" ? "monitor" : "routine";
    const answer = level !== "routine" || lastLine === "routine"
      ? lines.slice(0, -1).join("\n").trim() || raw.trim()
      : raw.trim();

    await kvSet(dailyKey, dailyCount + 1);

    const escalationMessage = level === "urgent"
      ? "Please seek immediate medical help — call 999 or go to A&E."
      : level === "monitor"
        ? "Keep an eye on this. Contact your GP or call 111 if it worsens."
        : "This sounds normal. You're doing great.";

    return c.json({
      answer: answer || "I couldn't answer that. Try rephrasing your question.",
      escalationLevel: level,
      escalationMessage,
      disclaimer: "This is general information, not medical advice. Always consult your GP or health visitor if you're worried.",
    });
  } catch (err) {
    console.error("OpenAI call failed:", err);
    return c.json({
      answer: "Sorry, I couldn't get an answer right now. Please try again in a moment.",
      escalationLevel: "routine",
      escalationMessage: "If it's urgent, call 111 or your GP.",
      disclaimer: "This is general information, not medical advice.",
    }, 500);
  }
});

const registeredRoutes = [
  "GET /health",
  "POST /ask-cradl",
  "GET /family",
  "POST /family/create",
  "POST /family/invite",
  "GET /family/invites",
  "POST /family/accept-invite",
  "POST /family/decline-invite",
  "POST /data/save",
  "GET /data/:dataType",
  "GET /data/all",
  "GET /handoff/:sessionId",
  "POST /handoff",
  "POST /handoff/log",
  "GET /handoff/:sessionId/logs",
  "POST /village/night-ping",
  "POST /village/delete-my-data",
  "GET /village/venues",
  "POST /village/venues",
  "POST /village/venues/:id/reviews",
  "GET /village/venues/:id/reviews",
  "POST /village/groups",
  "POST /village/groups/join",
  "GET /village/groups/mine",
  "GET /village/groups/:id/messages",
  "POST /village/groups/:id/messages",
  "GET /village/qa/questions",
  "POST /village/qa/questions",
  "GET /village/qa/questions/:id/answers",
  "POST /village/qa/questions/:id/answers",
  "GET /village/groups/:id/board",
  "POST /village/groups/:id/board",
];

const handler = async (req: Request) => {
  try {
    const origin = req.headers.get("Origin");
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: makeCorsHeaders(origin) });
    }

    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    let resolvedPath = url.pathname;
    if (parts[0] === "functions" && parts[1] === "v1" && parts.length >= 3) {
      resolvedPath = "/" + parts.slice(3).join("/");
    }
    const resolvedParts = resolvedPath.split("/").filter(Boolean);
    if (resolvedParts[0] === FUNCTION_NAME) {
      resolvedPath = "/" + resolvedParts.slice(1).join("/");
    }
    if (resolvedPath === "") resolvedPath = "/";

    const newUrl = new URL(resolvedPath + url.search, url.origin);
    const newReq = new Request(newUrl.toString(), {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });

    const res = await app.fetch(newReq);
    if (res.status === 404) {
      const diag = {
        message: "route_not_found",
        incoming_path: url.pathname,
        resolved_path: resolvedPath,
        method: req.method,
        registered_routes: registeredRoutes,
      };
      const headers = makeCorsHeaders(origin);
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify(diag), { status: 404, headers });
    }

    const outHeaders = new Headers(res.headers);
    makeCorsHeaders(origin).forEach((v, k) => outHeaders.set(k, v));
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: outHeaders });
  } catch (err) {
    console.error("Function error", err);
    const headers = makeCorsHeaders(req.headers.get("Origin"));
    headers.set("Content-Type", "application/json");
    return new Response(
      JSON.stringify({ error: "internal_error", detail: String(err) }),
      { status: 500, headers }
    );
  }
};

Deno.serve(handler);
