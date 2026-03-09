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
    // Read back to verify write reached the DB (proves we're not in-memory)
    const readBack = await kvGet(`user:${user!.id}:family`);
    if (readBack !== familyId) {
      console.error("family/create read-back failed", { familyId, readBack });
      return c.json({ error: "storage_verify_failed", familyId, readBack }, 500);
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
  const email = user!.email?.toLowerCase();
  if (!email) return c.json({ invites: [] });
  const inviteId = await kvGet(`invite:email:${email}`);
  if (!inviteId) return c.json({ invites: [] });
  const invite = await kvGet(`invite:${inviteId}`);
  return c.json({ invites: invite && invite.status === "pending" ? [invite] : [] });
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
  return c.json({ success: true, familyId });
});

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

const registeredRoutes = [
  "GET /health",
  "GET /family",
  "POST /family/create",
  "POST /family/invite",
  "GET /family/invites",
  "POST /family/accept-invite",
  "POST /data/save",
  "GET /data/:dataType",
  "GET /data/all",
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
