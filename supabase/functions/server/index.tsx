import { Hono } from "npm:hono@3";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();
const FUNCTION_NAME = "server";
const ALLOWED_ORIGINS = ["https://babytrackr.fejefeja.workers.dev", "http://localhost:5173", "http://localhost:3000"];
const KV_TABLE = "kv_store_71db3e83";

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

// KV is backed by Supabase table kv_store_71db3e83 (key TEXT, value JSONB) — inlined so deploy works as single file
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { global: { fetch } });

async function kvGet(key: string): Promise<unknown> {
  const { data, error } = await supabase.from(KV_TABLE).select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value;
}

async function kvSet(key: string, value: unknown): Promise<void> {
  const { error } = await supabase.from(KV_TABLE).upsert({ key, value }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

const kv = { get: kvGet, set: kvSet };

async function verifyUser(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return { user: null, error: "No authorization header" };
  const token = authHeader.split(" ")[1];
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { user: null, error: "Invalid token" };
  return { user: data.user, error: null };
}

// ============= HEALTH =============
app.get("/health", (c) => c.json({ status: "ok" }));

// ============= FAMILY =============
app.get("/family", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const familyId = await kv.get(`user:${user!.id}:family`);
  if (!familyId) return c.json({ family: null });
  const family = await kv.get(`family:${familyId}`);
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
    await kv.set(`family:${familyId}`, {
      id: familyId,
      name: familyName,
      createdBy: user!.id,
      createdAt: Date.now(),
      members: [user!.id],
    });
    await kv.set(`user:${user!.id}:family`, familyId);
    const readBack = await kv.get(`user:${user!.id}:family`);
    if (readBack !== familyId) {
      console.error("family/create read-back failed", { familyId, readBack });
      // Still return 200 with familyId so the client can proceed (e.g. send invite)
    }
  } catch (e) {
    console.error("family/create kv.set failed", e);
    return c.json({ error: "storage_failed", detail: String(e) }, 500);
  }
  return c.json({ familyId });
});

// Invite by email (app sends email, inviter_id, family_id). Also used for POST /family/invites (alias).
const inviteByEmailHandler = async (c: any) => {
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
  const familyId = body?.family_id ?? (await kv.get(`user:${user!.id}:family`));
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
  await kv.set(`invite:${inviteId}`, invite);
  await kv.set(`invite:email:${email.toLowerCase()}`, inviteId);
  return c.json({ success: true, invite }, 201);
};
app.post("/family/invite", inviteByEmailHandler);
app.post("/family/invites", inviteByEmailHandler);

// List invites for the current user (by their email from auth token)
app.get("/family/invites", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const email = (user!.email ?? "").trim().toLowerCase();
  if (!email) return c.json({ invites: [], noEmail: true });
  const rawInviteId = await kv.get(`invite:email:${email}`);
  const inviteId = typeof rawInviteId === "string" ? rawInviteId : null;
  if (!inviteId) return c.json({ invites: [] });
  const invite = await kv.get(`invite:${inviteId}`);
  if (!invite || invite.status !== "pending") return c.json({ invites: [] });
  const family = await kv.get(`family:${invite.familyId}`);
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
  const invite = await kv.get(`invite:${inviteId}`);
  if (!invite || invite.status !== "pending") return c.json({ error: "Invalid invite" }, 400);

  const familyId = invite.familyId;
  const family = await kv.get(`family:${familyId}`);
  if (!family) return c.json({ error: "family_not_found" }, 400);
  if (!family.members.includes(user!.id)) {
    family.members.push(user!.id);
    await kv.set(`family:${familyId}`, family);
  }
  await kv.set(`user:${user!.id}:family`, familyId);
  invite.status = "accepted";
  await kv.set(`invite:${inviteId}`, invite);
  return c.json({ success: true, familyId, familyName: family.name ?? "Family" });
});

// Decline a pending invite (so it no longer appears in GET /family/invites)
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
  const invite = await kv.get(`invite:${inviteId}`);
  if (!invite || invite.status !== "pending") return c.json({ error: "Invalid or already used invite" }, 400);
  if (invite.email?.toLowerCase() !== (user!.email ?? "").trim().toLowerCase()) {
    return c.json({ error: "Invite is for a different email" }, 403);
  }
  invite.status = "declined";
  await kv.set(`invite:${inviteId}`, invite);
  return c.json({ success: true });
});

// ============= DATA SYNC =============
const DATA_TYPES = [
  "sleepHistory",
  "feedingHistory",
  "diaperHistory",
  "tummyTimeHistory",
  "currentSleep",
  "currentTummyTime",
  "feedingInterval",
  "painkillerHistory",
  "notes",
];

app.post("/data/save", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const familyId = await kv.get(`user:${user!.id}:family`);
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
  await kv.set(`data:${familyId}:${dataType}`, {
    data,
    updatedBy: user!.id,
    updatedAt: Date.now(),
  });
  return c.json({ success: true });
});

app.get("/data/:dataType", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const familyId = await kv.get(`user:${user!.id}:family`);
  if (!familyId) return c.json({ data: null });
  const dataType = c.req.param("dataType");
  const row = await kv.get(`data:${familyId}:${dataType}`);
  return c.json({ data: row?.data ?? null });
});

app.get("/data/all", async (c) => {
  const { user, error } = await verifyUser(c.req.header("Authorization"));
  if (error) return c.json({ error }, 401);
  const familyId = await kv.get(`user:${user!.id}:family`);
  if (!familyId) return c.json({ data: {} });
  const allData: Record<string, any> = {};
  for (const dataType of DATA_TYPES) {
    const row = await kv.get(`data:${familyId}:${dataType}`);
    if (row?.data !== undefined) allData[dataType] = row.data;
  }
  return c.json({ data: allData });
});

const registeredRoutes = [
  "GET /health",
  "GET /family",
  "POST /family/create",
  "POST /family/invite",
  "POST /family/invites",
  "GET /family/invites",
  "POST /family/accept-invite",
  "POST /family/decline-invite",
  "POST /data/save",
  "GET /data/:dataType",
  "GET /data/all",
];

// Path normalization + CORS + diagnostic 404
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
