-- Blitz Tournament Schema for new Supabase instance
-- Run this in the Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS blitz_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  name text NOT NULL DEFAULT 'Blitz Tournament',
  status text NOT NULL DEFAULT 'setup',
  players jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_round integer NOT NULL DEFAULT 0,
  total_rounds integer NOT NULL DEFAULT 0,
  round_duration_seconds integer NOT NULL DEFAULT 600,
  schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- NEW: server-side timer
  timer_started_at timestamptz,
  timer_paused_remaining integer,
  -- NEW: creator identity for permissions
  created_by text
);

CREATE TABLE IF NOT EXISTS blitz_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  tournament_id uuid NOT NULL REFERENCES blitz_tournaments(id) ON DELETE CASCADE,
  round_index integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  team_a_score integer,
  team_b_score integer
);

CREATE TABLE IF NOT EXISTS blitz_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  tournament_id uuid NOT NULL REFERENCES blitz_tournaments(id) ON DELETE CASCADE,
  round_index integer NOT NULL,
  bettor_index integer NOT NULL,
  predicted_winner text NOT NULL,
  stake integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS blitz_pledges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  tournament_id uuid NOT NULL REFERENCES blitz_tournaments(id) ON DELETE CASCADE,
  player_index integer NOT NULL,
  item_text text NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_blitz_rounds_tournament ON blitz_rounds(tournament_id);
CREATE INDEX IF NOT EXISTS idx_blitz_bets_tournament ON blitz_bets(tournament_id);
CREATE INDEX IF NOT EXISTS idx_blitz_pledges_tournament ON blitz_pledges(tournament_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE blitz_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blitz_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE blitz_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE blitz_pledges ENABLE ROW LEVEL SECURITY;

-- Permissive policies: read/write for everyone (anon key)
-- Trust-based for now — tighten when moving to public

CREATE POLICY "blitz_tournaments_select" ON blitz_tournaments FOR SELECT USING (true);
CREATE POLICY "blitz_tournaments_insert" ON blitz_tournaments FOR INSERT WITH CHECK (true);
CREATE POLICY "blitz_tournaments_update" ON blitz_tournaments FOR UPDATE USING (true);
CREATE POLICY "blitz_tournaments_delete" ON blitz_tournaments FOR DELETE USING (true);

CREATE POLICY "blitz_rounds_select" ON blitz_rounds FOR SELECT USING (true);
CREATE POLICY "blitz_rounds_insert" ON blitz_rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "blitz_rounds_update" ON blitz_rounds FOR UPDATE USING (true);
CREATE POLICY "blitz_rounds_delete" ON blitz_rounds FOR DELETE USING (true);

CREATE POLICY "blitz_bets_select" ON blitz_bets FOR SELECT USING (true);
CREATE POLICY "blitz_bets_insert" ON blitz_bets FOR INSERT WITH CHECK (true);
CREATE POLICY "blitz_bets_update" ON blitz_bets FOR UPDATE USING (true);
CREATE POLICY "blitz_bets_delete" ON blitz_bets FOR DELETE USING (true);

CREATE POLICY "blitz_pledges_select" ON blitz_pledges FOR SELECT USING (true);
CREATE POLICY "blitz_pledges_insert" ON blitz_pledges FOR INSERT WITH CHECK (true);
CREATE POLICY "blitz_pledges_update" ON blitz_pledges FOR UPDATE USING (true);
CREATE POLICY "blitz_pledges_delete" ON blitz_pledges FOR DELETE USING (true);

-- ============================================
-- REALTIME
-- ============================================

-- Add all three tables to the realtime publication so client
-- subscriptions receive INSERT/UPDATE/DELETE events.
ALTER PUBLICATION supabase_realtime ADD TABLE blitz_tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE blitz_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE blitz_rounds;

-- REPLICA IDENTITY FULL is required for client-side filtering on
-- non-PK columns (e.g. tournament_id=eq.X). With the default
-- REPLICA IDENTITY DEFAULT, only PK columns are present in the OLD
-- record of UPDATE/DELETE events, so a filter on tournament_id
-- silently drops events from blitz_rounds and blitz_bets.
ALTER TABLE blitz_tournaments REPLICA IDENTITY FULL;
ALTER TABLE blitz_rounds REPLICA IDENTITY FULL;
ALTER TABLE blitz_bets REPLICA IDENTITY FULL;
