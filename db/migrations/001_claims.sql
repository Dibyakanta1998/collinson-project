CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY,
  input JSONB NOT NULL,
  case_brief JSONB,
  result JSONB,
  status TEXT NOT NULL CHECK (
    status IN ('received', 'running', 'suspended', 'approved', 'changes_requested', 'declined', 'failed')
  ),
  run_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_events (
  id UUID PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (
    decision IN ('approve', 'request_changes', 'decline')
  ),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS approval_events_claim_id_idx
  ON approval_events (claim_id, created_at);

CREATE INDEX IF NOT EXISTS audit_events_claim_id_idx
  ON audit_events (claim_id, created_at);
