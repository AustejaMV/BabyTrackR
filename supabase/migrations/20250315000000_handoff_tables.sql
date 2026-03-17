-- Handoff sessions: shareable snapshot for caregivers (optional; app can use KV instead).
-- RLS: handoff_sessions readable by anyone with the id; handoff_logs insertable by anyone with valid non-expired session_id.

CREATE TABLE IF NOT EXISTS handoff_sessions (
  id TEXT PRIMARY KEY,
  family_id UUID,
  baby_name TEXT,
  session_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS handoff_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES handoff_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('feed', 'sleep', 'diaper')),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logged_by_name TEXT NOT NULL,
  note TEXT
);

-- Allow public read of a session by id (for caregiver opening link).
ALTER TABLE handoff_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "handoff_sessions_read_by_id" ON handoff_sessions FOR SELECT USING (true);

-- Allow public insert of a log only when session exists and is not expired.
ALTER TABLE handoff_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "handoff_logs_insert_valid_session" ON handoff_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM handoff_sessions
      WHERE handoff_sessions.id = handoff_logs.session_id
        AND handoff_sessions.expires_at > NOW()
    )
  );

CREATE POLICY "handoff_logs_select_by_session" ON handoff_logs FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_handoff_logs_session_id ON handoff_logs(session_id);
