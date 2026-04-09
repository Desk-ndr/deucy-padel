ALTER TABLE public.blitz_tournaments
  ADD COLUMN round_duration_seconds integer NOT NULL DEFAULT 600,
  ADD COLUMN total_rounds integer NOT NULL DEFAULT 9,
  ADD COLUMN schedule jsonb NOT NULL DEFAULT '[]'::jsonb;