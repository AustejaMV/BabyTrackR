import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

// Create Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper function to verify user from access token
async function verifyUser(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'No authorization header' };
  }
  
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { user: null, error: 'Invalid token' };
  }
  
  return { user, error: null };
}

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// ============= FAMILY MANAGEMENT =============

// Create a new family (automatically when user first signs in)
app.post("/family/create", async (c) => {
  const { user, error } = await verifyUser(c.req.header('Authorization'));
  if (error) return c.json({ error }, 401);

  const { familyName } = await c.req.json();
  const familyId = `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Store family info
  await kv.set(`family:${familyId}`, {
    id: familyId,
    name: familyName || 'My Family',
    createdBy: user!.id,
    createdAt: Date.now(),
    members: [user!.id],
  });

  // Link user to family
  await kv.set(`user:${user!.id}:family`, familyId);

  return c.json({ familyId });
});

// Get user's family
app.get("/family", async (c) => {
  const { user, error } = await verifyUser(c.req.header('Authorization'));
  if (error) return c.json({ error }, 401);

  const familyId = await kv.get(`user:${user!.id}:family`);
  if (!familyId) {
    return c.json({ family: null });
  }

  const family = await kv.get(`family:${familyId}`);
  return c.json({ family });
});

// Invite user to family (via email)
app.post("/family/invite", async (c) => {
  const { user, error } = await verifyUser(c.req.header('Authorization'));
  if (error) return c.json({ error }, 401);

  const { email } = await c.req.json();
  const familyId = await kv.get(`user:${user!.id}:family`);
  
  if (!familyId) {
    return c.json({ error: 'No family found' }, 400);
  }

  const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store invite
  await kv.set(`invite:${inviteId}`, {
    id: inviteId,
    familyId,
    email,
    invitedBy: user!.id,
    createdAt: Date.now(),
    status: 'pending',
  });

  // Store by email for lookup
  await kv.set(`invite:email:${email}`, inviteId);

  return c.json({ inviteId, message: 'Invite created' });
});

// Check for pending invites
app.get("/family/invites", async (c) => {
  const { user, error } = await verifyUser(c.req.header('Authorization'));
  if (error) return c.json({ error }, 401);

  const email = user!.email;
  const inviteId = await kv.get(`invite:email:${email}`);
  
  if (!inviteId) {
    return c.json({ invites: [] });
  }

  const invite = await kv.get(`invite:${inviteId}`);
  return c.json({ invites: invite ? [invite] : [] });
});

// Accept invite
app.post("/family/accept-invite", async (c) => {
  const { user, error } = await verifyUser(c.req.header('Authorization'));
  if (error) return c.json({ error }, 401);

  const { inviteId } = await c.req.json();
  const invite = await kv.get(`invite:${inviteId}`);
  
  if (!invite || invite.status !== 'pending') {
    return c.json({ error: 'Invalid invite' }, 400);
  }

  // Add user to family
  const family = await kv.get(`family:${invite.familyId}`);
  family.members.push(user!.id);
  await kv.set(`family:${invite.familyId}`, family);

  // Link user to family
  await kv.set(`user:${user!.id}:family`, invite.familyId);

  // Mark invite as accepted
  invite.status = 'accepted';
  await kv.set(`invite:${inviteId}`, invite);

  return c.json({ success: true, familyId: invite.familyId });
});

// ============= DATA SYNC =============

// Save data for family
app.post("/data/save", async (c) => {
  const { user, error } = await verifyUser(c.req.header('Authorization'));
  if (error) return c.json({ error }, 401);

  const familyId = await kv.get(`user:${user!.id}:family`);
  if (!familyId) {
    return c.json({ error: 'No family found' }, 400);
  }

  const { dataType, data } = await c.req.json();
  
  // Store data with family ID
  await kv.set(`data:${familyId}:${dataType}`, {
    data,
    updatedBy: user!.id,
    updatedAt: Date.now(),
  });

  return c.json({ success: true });
});

// Get data for family
app.get("/data/:dataType", async (c) => {
  const { user, error } = await verifyUser(c.req.header('Authorization'));
  if (error) return c.json({ error }, 401);

  const familyId = await kv.get(`user:${user!.id}:family`);
  if (!familyId) {
    return c.json({ error: 'No family found' }, 400);
  }

  const dataType = c.req.param('dataType');
  const result = await kv.get(`data:${familyId}:${dataType}`);
  
  return c.json({ data: result?.data || null });
});

// Get all data for family
app.get("/data/all", async (c) => {
  const { user, error } = await verifyUser(c.req.header('Authorization'));
  if (error) return c.json({ error }, 401);

  const familyId = await kv.get(`user:${user!.id}:family`);
  if (!familyId) {
    return c.json({ data: {} });
  }

  // Get all data types
  const dataTypes = [
    'sleepHistory',
    'feedingHistory',
    'diaperHistory',
    'tummyTimeHistory',
    'currentSleep',
    'currentTummyTime',
    'feedingInterval',
    'painkillerHistory',
    'notes',
  ];
  const allData: Record<string, any> = {};

  for (const dataType of dataTypes) {
    const result = await kv.get(`data:${familyId}:${dataType}`);
    if (result?.data !== undefined) {
      allData[dataType] = result.data;
    }
  }

  return c.json({ data: allData });
});

Deno.serve(app.fetch);