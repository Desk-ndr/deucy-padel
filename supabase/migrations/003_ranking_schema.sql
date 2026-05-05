-- ============================================
-- RANKING SYSTEM SCHEMA
-- Persistent player identity + cross-tournament ranking
-- ============================================

-- ── Players table (persistent identity via Phone OTP) ──

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  phone text UNIQUE NOT NULL,
  display_name text NOT NULL,
  crown_holder boolean NOT NULL DEFAULT false,
  crown_since timestamptz,
  consecutive_wins integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ── Ranking entries (one per player per tournament) ──

CREATE TABLE IF NOT EXISTS ranking_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES blitz_tournaments(id) ON DELETE CASCADE,
  placement integer NOT NULL,
  placement_points integer NOT NULL,
  betting_placement integer,
  betting_bonus integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(player_id, tournament_id)
);

-- ── Indexes ──

CREATE INDEX IF NOT EXISTS idx_ranking_entries_player ON ranking_entries(player_id);
CREATE INDEX IF NOT EXISTS idx_ranking_entries_tournament ON ranking_entries(tournament_id);
CREATE INDEX IF NOT EXISTS idx_ranking_entries_created ON ranking_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_players_crown ON players(crown_holder) WHERE crown_holder = true;

-- ── RLS ──

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_entries ENABLE ROW LEVEL SECURITY;

-- Players: anyone can read, only auth users can update their own
CREATE POLICY "players_select" ON players FOR SELECT USING (true);
CREATE POLICY "players_insert" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "players_update" ON players FOR UPDATE USING (auth.uid() = auth_user_id);

-- Ranking entries: anyone can read, insert via service (anon for now, tighten later)
CREATE POLICY "ranking_entries_select" ON ranking_entries FOR SELECT USING (true);
CREATE POLICY "ranking_entries_insert" ON ranking_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "ranking_entries_update" ON ranking_entries FOR UPDATE USING (true);

-- ── Realtime ──

ALTER PUBLICATION supabase_realtime ADD TABLE ranking_entries;

-- ── Function: auto-create player on auth signup ──

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.players (auth_user_id, phone, display_name)
  VALUES (NEW.id, NEW.phone, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

