
-- Blitz tournament tables
CREATE TABLE public.blitz_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Blitz Tournament',
  status text NOT NULL DEFAULT 'setup',
  players jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_round integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blitz_tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blitz tournaments" ON public.blitz_tournaments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert blitz tournaments" ON public.blitz_tournaments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update blitz tournaments" ON public.blitz_tournaments FOR UPDATE TO anon, authenticated USING (true);

CREATE TABLE public.blitz_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.blitz_tournaments(id) ON DELETE CASCADE,
  round_index integer NOT NULL,
  team_a_score integer,
  team_b_score integer,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blitz_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blitz rounds" ON public.blitz_rounds FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert blitz rounds" ON public.blitz_rounds FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update blitz rounds" ON public.blitz_rounds FOR UPDATE TO anon, authenticated USING (true);

CREATE TABLE public.blitz_pledges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.blitz_tournaments(id) ON DELETE CASCADE,
  player_index integer NOT NULL,
  item_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blitz_pledges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blitz pledges" ON public.blitz_pledges FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert blitz pledges" ON public.blitz_pledges FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can delete blitz pledges" ON public.blitz_pledges FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE public.blitz_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.blitz_tournaments(id) ON DELETE CASCADE,
  round_index integer NOT NULL,
  bettor_index integer NOT NULL,
  predicted_winner text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blitz_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blitz bets" ON public.blitz_bets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert blitz bets" ON public.blitz_bets FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update blitz bets" ON public.blitz_bets FOR UPDATE TO anon, authenticated USING (true);
