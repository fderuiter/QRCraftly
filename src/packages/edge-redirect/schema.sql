-- D1 schema for zero-knowledge dynamic redirects (src/packages/edge-redirect).
-- Apply with: pnpm exec wrangler d1 execute qrcraftly-db --remote --file=src/packages/edge-redirect/schema.sql
-- Destinations are client-side enc:v1: ciphertext; the admin key is stored only as a SHA-256 hash.
CREATE TABLE IF NOT EXISTS redirects (
  id TEXT PRIMARY KEY,
  redirect_url TEXT NOT NULL,
  ios_url TEXT,
  android_url TEXT,
  admin_key_hash TEXT NOT NULL,
  scans INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
