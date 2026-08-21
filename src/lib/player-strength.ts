// Doubles Elo used ONLY to advise on pair balance in the setup screen.
//
// This is deliberately separate from the ranking. The ranking answers
// "who won most lately" and is cumulative and time-decayed; that makes it
// a poor measure of individual level, because it rewards attendance and
// forgets older form. For pairing we want the opposite: every match ever
// played, weighted by who was on court.
//
// Why Elo rather than a win rate: in an americana your results depend
// heavily on who you were drawn with. The strong-triple constraint makes
// this systematic — Andrea can never partner Rollo or Thomas, so he is
// always paired below his own level and a plain win rate understates him.
// Elo compares the result against what the four ratings on court predict,
// so a win alongside a weak partner against two strong players moves you
// a lot, and the same win alongside a strong partner barely moves you.

import { supabase } from '@/integrations/supabase/client';
import { BlitzRoundSchedule } from '@/lib/blitz-schedule';

/** Everyone starts here; guests are treated as a neutral player. */
export const BASE_RATING = 1000;

/** Rating movement per match. 24 converges in ~15 matches without thrashing. */
const K_FACTOR = 24;

export interface PlayerStrength {
  rating: number;
  matchesPlayed: number;
}

interface EloMatch {
  teamA: readonly number[];
  teamB: readonly number[];
  scoreA: number;
  scoreB: number;
  /** Roster index -> player id; null for guests. */
  roster: Array<string | null>;
}

/**
 * Replay every match in chronological order and return the final rating
 * per player id. Guests take part (they affect the ratings of the people
 * they play with and against) but are not tracked themselves.
 */
export function computeDoublesElo(matches: EloMatch[]): Record<string, PlayerStrength> {
  const out: Record<string, PlayerStrength> = {};
  const ratingOf = (id: string | null): number =>
    id && out[id] ? out[id].rating : BASE_RATING;

  for (const m of matches) {
    const total = m.scoreA + m.scoreB;
    if (total <= 0) continue; // 0-0 carries no information

    const idsA = m.teamA.map(i => m.roster[i] ?? null);
    const idsB = m.teamB.map(i => m.roster[i] ?? null);
    const avgA = idsA.reduce((s, id) => s + ratingOf(id), 0) / idsA.length;
    const avgB = idsB.reduce((s, id) => s + ratingOf(id), 0) / idsB.length;

    // Expected share of games for team A given the two team ratings.
    const expectedA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    // Actual share of games. Using the game ratio rather than a binary
    // win/loss keeps the signal continuous: 6-1 and 6-5 are not the same
    // evidence, which matters a lot when players only have ~15 matches.
    const actualA = m.scoreA / total;
    const delta = K_FACTOR * (actualA - expectedA);

    const bump = (ids: Array<string | null>, amount: number) => {
      for (const id of ids) {
        if (!id) continue; // guest: plays, but keeps no rating
        if (!out[id]) out[id] = { rating: BASE_RATING, matchesPlayed: 0 };
        out[id].rating += amount;
        out[id].matchesPlayed += 1;
      }
    };
    bump(idsA, delta);
    bump(idsB, -delta);
  }

  for (const id of Object.keys(out)) {
    out[id].rating = Math.round(out[id].rating);
  }
  return out;
}

/**
 * Pull every completed match from finished tournaments and derive the
 * strength table. Read-only: nothing here writes to the database or
 * touches ranking_entries.
 */
export async function fetchPlayerStrength(): Promise<{
  data: Record<string, PlayerStrength>;
  error: string | null;
}> {
  const { data: tournaments, error: tErr } = await supabase
    .from('blitz_tournaments')
    .select('id, schedule, players, created_at, finished_at')
    .eq('status', 'finished');
  if (tErr) return { data: {}, error: tErr.message };
  if (!tournaments || tournaments.length === 0) return { data: {}, error: null };

  const { data: rounds, error: rErr } = await supabase
    .from('blitz_rounds')
    .select('tournament_id, round_index, team_a_score, team_b_score, team_a_score_b, team_b_score_b')
    .eq('status', 'completed');
  if (rErr) return { data: {}, error: rErr.message };

  // Chronological: oldest tournament first, rounds in playing order.
  const dateOf = (t: any) => new Date(t.finished_at || t.created_at || 0).getTime();
  const ordered = [...tournaments].sort((a, b) => dateOf(a) - dateOf(b));

  const roundsByTournament: Record<string, any[]> = {};
  for (const r of (rounds || [])) {
    (roundsByTournament[r.tournament_id] ||= []).push(r);
  }

  const matches: EloMatch[] = [];
  for (const t of ordered) {
    const schedule = (t.schedule as unknown as BlitzRoundSchedule[]) || [];
    const roster: Array<string | null> = ((t.players as any[]) || [])
      .map(p => (p?.isGuest ? null : (p?.player_id ?? null)));
    const rs = (roundsByTournament[t.id] || []).sort((a, b) => a.round_index - b.round_index);
    for (const r of rs) {
      const s = schedule[r.round_index - 1];
      if (!s) continue;
      if (r.team_a_score != null && r.team_b_score != null) {
        matches.push({ teamA: s.teamA, teamB: s.teamB, scoreA: r.team_a_score, scoreB: r.team_b_score, roster });
      }
      if (s.courtB && r.team_a_score_b != null && r.team_b_score_b != null) {
        matches.push({
          teamA: s.courtB.teamA, teamB: s.courtB.teamB,
          scoreA: r.team_a_score_b, scoreB: r.team_b_score_b, roster,
        });
      }
    }
  }

  return { data: computeDoublesElo(matches), error: null };
}
