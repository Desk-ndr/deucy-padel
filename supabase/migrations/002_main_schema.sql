-- ============================================================================
-- 002_main_schema.sql — Consolidated schema for the main tournament system
-- Generated from 20 Lovable migrations + types.ts alignment
-- Run this on the NEW Supabase (mnquuqskpfmzcmirrwef) via SQL Editor
-- ============================================================================

-- ── ENUMS ──────────────────────────────────────────────────────────────────

CREATE TYPE tournament_status AS ENUM (
  'Draft', 'SignupOpen', 'Live', 'Finished', 'AuctionLive', 'Closed'
);

CREATE TYPE tournament_tier AS ENUM ('Major', 'League', 'Mini');

CREATE TYPE player_status AS ENUM ('Active', 'InactiveWarning', 'Removed');

CREATE TYPE player_gender AS ENUM ('male', 'female', 'other', 'prefer_not');

CREATE TYPE round_status AS ENUM ('Upcoming', 'Live', 'Locked', 'Completed');

-- Includes PendingConfirmation + Disputed (added in refactor Session 1)
CREATE TYPE match_status AS ENUM (
  'Scheduled', 'BookingClaimed', 'Played', 'Overdue', 'AutoResolved',
  'PendingConfirmation', 'Disputed'
);

CREATE TYPE credit_type AS ENUM (
  'StartingGrant', 'ParticipationBonus', 'MatchStake', 'MatchPayout',
  'Penalty', 'AdminAdjustment', 'AuctionHold', 'AuctionRelease',
  'AuctionSettlement', 'BetStake', 'BetPayout'
);

CREATE TYPE pledge_category AS ENUM ('food', 'drink', 'object', 'service', 'chaos');

CREATE TYPE pledge_status AS ENUM ('Draft', 'Approved', 'Hidden');

CREATE TYPE auction_status AS ENUM ('Draft', 'Live', 'Ended');

CREATE TYPE lot_status AS ENUM ('Live', 'Ended');

CREATE TYPE escrow_status AS ENUM ('Active', 'Released', 'Settled');

CREATE TYPE bet_status AS ENUM ('Pending', 'Won', 'Lost', 'Cancelled');

CREATE TYPE app_role AS ENUM ('admin', 'player');

CREATE TYPE waitlist_status AS ENUM (
  'waiting', 'invited', 'assigned', 'confirmed', 'removed', 'no_response', 'dropped'
);

-- ── FUNCTIONS ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── TABLES ─────────────────────────────────────────────────────────────────

-- 1. user_roles (depends on auth.users)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 2. tournaments
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  club_name TEXT,
  booking_url TEXT,
  status tournament_status NOT NULL DEFAULT 'Draft',
  tier tournament_tier NOT NULL DEFAULT 'League',
  created_by_admin_id UUID,
  -- Player limits
  max_players INTEGER NOT NULL DEFAULT 24,
  min_players INTEGER NOT NULL DEFAULT 8,
  -- Scheduling
  round_duration_days INTEGER NOT NULL DEFAULT 10 CHECK (round_duration_days BETWEEN 7 AND 14),
  rounds_count INTEGER,
  playoffs_enabled BOOLEAN NOT NULL DEFAULT true,
  join_code TEXT UNIQUE,
  -- Economy (all amounts in cents: 2000 = €20.00)
  starting_credits INTEGER NOT NULL DEFAULT 2000,
  stake_per_player INTEGER NOT NULL DEFAULT 20,
  participation_bonus INTEGER NOT NULL DEFAULT 50,
  penalty_amount INTEGER NOT NULL DEFAULT 50,
  euros_per_set_win INTEGER NOT NULL DEFAULT 200,
  euros_per_set_loss INTEGER NOT NULL DEFAULT 200,
  allow_negative_balance BOOLEAN NOT NULL DEFAULT false,
  display_decimals BOOLEAN NOT NULL DEFAULT false,
  -- Pledges
  pledge_gate_enabled BOOLEAN NOT NULL DEFAULT true,
  pledge_deadline_hours INTEGER NOT NULL DEFAULT 48,
  -- Betting
  betting_enabled BOOLEAN NOT NULL DEFAULT false,
  bank_balance INTEGER NOT NULL DEFAULT 10000,
  per_round_bet_cap INTEGER NOT NULL DEFAULT 500,
  per_bet_max INTEGER NOT NULL DEFAULT 300,
  min_protected_balance INTEGER NOT NULL DEFAULT 200,
  payout_multiplier NUMERIC(3,1) NOT NULL DEFAULT 2.0,
  -- Signup window
  signup_open_at TIMESTAMPTZ,
  signup_close_at TIMESTAMPTZ,
  -- Lifecycle timestamps (from types.ts)
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments ON DELETE CASCADE, -- nullable for account-only
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  avatar_url TEXT,
  gender player_gender,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  status player_status NOT NULL DEFAULT 'Active',
  -- Stats
  credits_balance INTEGER NOT NULL DEFAULT 0,
  matches_played INTEGER NOT NULL DEFAULT 0,
  sets_won INTEGER NOT NULL DEFAULT 0,
  sets_lost INTEGER NOT NULL DEFAULT 0,
  match_wins INTEGER NOT NULL DEFAULT 0,
  match_losses INTEGER NOT NULL DEFAULT 0,
  no_shows INTEGER NOT NULL DEFAULT 0,
  -- Session
  session_token TEXT,
  has_seen_onboarding BOOLEAN NOT NULL DEFAULT false,
  has_seen_auction_intro BOOLEAN NOT NULL DEFAULT false,
  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique phone per tournament (only when tournament_id is not null)
CREATE UNIQUE INDEX idx_players_tournament_phone
  ON players (tournament_id, phone) WHERE tournament_id IS NOT NULL;

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. rounds
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments ON DELETE CASCADE,
  index INTEGER NOT NULL,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  status round_status NOT NULL DEFAULT 'Upcoming',
  is_playoff BOOLEAN NOT NULL DEFAULT false,
  playoff_type TEXT, -- 'semi' or 'final'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, index)
);

ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;

-- 5. matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES rounds ON DELETE CASCADE,
  -- Teams
  team_a_player1_id UUID REFERENCES players ON DELETE SET NULL,
  team_a_player2_id UUID REFERENCES players ON DELETE SET NULL,
  team_b_player1_id UUID REFERENCES players ON DELETE SET NULL,
  team_b_player2_id UUID REFERENCES players ON DELETE SET NULL,
  -- Status & result
  status match_status NOT NULL DEFAULT 'Scheduled',
  sets_a INTEGER NOT NULL DEFAULT 0 CHECK (sets_a BETWEEN 0 AND 3),
  sets_b INTEGER NOT NULL DEFAULT 0 CHECK (sets_b BETWEEN 0 AND 3),
  is_unfinished BOOLEAN NOT NULL DEFAULT false,
  played_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ,
  pot_total_credits INTEGER NOT NULL DEFAULT 0,
  -- Booking
  booking_claimed_by_player_id UUID REFERENCES players ON DELETE SET NULL,
  booking_claimed_at TIMESTAMPTZ,
  -- Bye
  is_bye BOOLEAN NOT NULL DEFAULT false,
  bye_player_id UUID REFERENCES players ON DELETE SET NULL,
  -- Match confirmation (Session 1 refactor)
  reported_by_player_id UUID REFERENCES players ON DELETE SET NULL,
  reported_at TIMESTAMPTZ,
  confirmed_by_player_id UUID REFERENCES players ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- 6. credit_ledger_entries
CREATE TABLE credit_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players ON DELETE CASCADE,
  match_id UUID REFERENCES matches ON DELETE SET NULL,
  round_id UUID REFERENCES rounds ON DELETE SET NULL,
  type credit_type NOT NULL,
  amount INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE credit_ledger_entries ENABLE ROW LEVEL SECURITY;

-- 7. pledge_items
CREATE TABLE pledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments ON DELETE CASCADE,
  pledged_by_player_id UUID NOT NULL REFERENCES players ON DELETE CASCADE,
  round_id UUID REFERENCES rounds,
  title TEXT NOT NULL,
  description TEXT,
  category pledge_category NOT NULL,
  quantity_text TEXT,
  image_url TEXT,
  approved BOOLEAN NOT NULL DEFAULT true,
  status pledge_status NOT NULL DEFAULT 'Approved',
  estimate_low INTEGER,
  estimate_high INTEGER,
  price_euro INTEGER,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pledge_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_pledge_items_updated_at
  BEFORE UPDATE ON pledge_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. auctions
CREATE TABLE auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments ON DELETE CASCADE UNIQUE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  status auction_status NOT NULL DEFAULT 'Draft',
  anti_sniping_enabled BOOLEAN NOT NULL DEFAULT true,
  duration_hours INTEGER NOT NULL DEFAULT 24,
  delivery_location TEXT,
  delivery_maps_url TEXT,
  delivery_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;

-- 9. auction_lots
CREATE TABLE auction_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions ON DELETE CASCADE,
  pledge_item_id UUID NOT NULL REFERENCES pledge_items ON DELETE CASCADE UNIQUE,
  current_bid INTEGER,
  current_winner_player_id UUID REFERENCES players ON DELETE SET NULL,
  min_increment INTEGER NOT NULL DEFAULT 10,
  ends_at TIMESTAMPTZ,
  extensions_count INTEGER NOT NULL DEFAULT 0,
  status lot_status NOT NULL DEFAULT 'Live',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE auction_lots ENABLE ROW LEVEL SECURITY;

-- 10. bids
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES auction_lots ON DELETE CASCADE,
  bidder_player_id UUID NOT NULL REFERENCES players ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- 11. escrow_holds
CREATE TABLE escrow_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES auction_lots ON DELETE CASCADE,
  bidder_player_id UUID NOT NULL REFERENCES players ON DELETE CASCADE,
  reserved_amount INTEGER NOT NULL,
  status escrow_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ
);

ALTER TABLE escrow_holds ENABLE ROW LEVEL SECURITY;

-- 12. notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 13. match_bets
CREATE TABLE match_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES rounds ON DELETE CASCADE,
  predicted_winner TEXT NOT NULL CHECK (predicted_winner IN ('team_a', 'team_b')),
  stake INTEGER NOT NULL CHECK (stake > 0),
  payout INTEGER,
  status bet_status NOT NULL DEFAULT 'Pending',
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE match_bets ENABLE ROW LEVEL SECURITY;

-- 14. waitlist_entries
CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  note TEXT,
  tournament_id UUID REFERENCES tournaments ON DELETE CASCADE,
  status waitlist_status NOT NULL DEFAULT 'waiting',
  priority BOOLEAN NOT NULL DEFAULT false,
  assigned_tournament_id UUID REFERENCES tournaments ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  invite_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_waitlist_entries_updated_at
  BEFORE UPDATE ON waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── INDEXES ────────────────────────────────────────────────────────────────

-- Credit ledger (missing from Lovable, needed for leaderboard queries)
CREATE INDEX idx_credit_ledger_player ON credit_ledger_entries (player_id);
CREATE INDEX idx_credit_ledger_tournament ON credit_ledger_entries (tournament_id);
CREATE INDEX idx_credit_ledger_match ON credit_ledger_entries (match_id) WHERE match_id IS NOT NULL;

-- Match bets
CREATE INDEX idx_match_bets_match ON match_bets (match_id);
CREATE INDEX idx_match_bets_player_round ON match_bets (player_id, round_id);
CREATE INDEX idx_match_bets_tournament ON match_bets (tournament_id);

-- Waitlist
CREATE INDEX idx_waitlist_phone ON waitlist_entries (phone);
CREATE INDEX idx_waitlist_tournament ON waitlist_entries (tournament_id) WHERE tournament_id IS NOT NULL;
CREATE INDEX idx_waitlist_status ON waitlist_entries (status);

-- Matches (frequent queries)
CREATE INDEX idx_matches_round ON matches (round_id);
CREATE INDEX idx_matches_tournament ON matches (tournament_id);

-- Rounds
CREATE INDEX idx_rounds_tournament ON rounds (tournament_id);

-- Players
CREATE INDEX idx_players_tournament ON players (tournament_id) WHERE tournament_id IS NOT NULL;

-- ── RLS POLICIES ───────────────────────────────────────────────────────────
-- Permissive for now (same as Lovable). To be tightened for production.

-- user_roles
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- tournaments
CREATE POLICY "Anyone can view tournaments" ON tournaments
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage tournaments" ON tournaments
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete tournaments" ON tournaments
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- players
CREATE POLICY "Anyone can view players" ON players
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert players" ON players
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Players can update own data" ON players
  FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Admins can delete players" ON players
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- rounds
CREATE POLICY "Anyone can view rounds" ON rounds
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage rounds" ON rounds
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- matches
CREATE POLICY "Anyone can view matches" ON matches
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can update matches" ON matches
  FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage matches" ON matches
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- credit_ledger_entries
CREATE POLICY "Anyone can view credit ledger" ON credit_ledger_entries
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert credit ledger" ON credit_ledger_entries
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete credit ledger" ON credit_ledger_entries
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- pledge_items
CREATE POLICY "Anyone can view pledges" ON pledge_items
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert pledges" ON pledge_items
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update pledges" ON pledge_items
  FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Admins can delete pledges" ON pledge_items
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- auctions
CREATE POLICY "Anyone can view auctions" ON auctions
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage auctions" ON auctions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- auction_lots
CREATE POLICY "Anyone can view lots" ON auction_lots
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can update lots" ON auction_lots
  FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Service can insert lots" ON auction_lots
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete lots" ON auction_lots
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- bids
CREATE POLICY "Anyone can view bids" ON bids
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can place bids" ON bids
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- escrow_holds
CREATE POLICY "Anyone can view escrow" ON escrow_holds
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can manage escrow" ON escrow_holds
  FOR ALL TO anon, authenticated USING (true);

-- notifications
CREATE POLICY "Anyone can view notifications" ON notifications
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can manage notifications" ON notifications
  FOR ALL TO anon, authenticated USING (true);

-- match_bets
CREATE POLICY "Anyone can view match bets" ON match_bets
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can place match bets" ON match_bets
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Service can update match bets" ON match_bets
  FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Admins can delete match bets" ON match_bets
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- waitlist_entries
CREATE POLICY "Anyone can view waitlist" ON waitlist_entries
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert waitlist" ON waitlist_entries
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update waitlist" ON waitlist_entries
  FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Admins can delete waitlist" ON waitlist_entries
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ── STORAGE BUCKETS ────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('pledge-images', 'pledge-images', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies: avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Anyone can upload avatars" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Anyone can update avatars" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (bucket_id = 'avatars');

-- Storage policies: pledge-images
CREATE POLICY "Anyone can view pledge images" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'pledge-images');
CREATE POLICY "Anyone can upload pledge images" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'pledge-images');
CREATE POLICY "Anyone can update pledge images" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (bucket_id = 'pledge-images');

-- ── REALTIME ───────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE auction_lots;
ALTER PUBLICATION supabase_realtime ADD TABLE bids;
ALTER PUBLICATION supabase_realtime ADD TABLE match_bets;

-- ============================================================================
-- END OF CONSOLIDATED SCHEMA
-- ============================================================================
