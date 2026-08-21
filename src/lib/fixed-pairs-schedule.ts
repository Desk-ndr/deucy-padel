// Fixed-pairs ("americana a coppie") tournament mode.
//
// Players are locked into pairs for the whole tournament and the pairs
// play a round robin against each other. The emitted schedule reuses the
// exact same BlitzRoundSchedule shape as the rotating mode, so the match
// view, score entry, standings and ranking all work unchanged — a "team"
// is simply always the same two players.
//
// Guarantee: every pair faces every other pair at least once (single
// round robin). When there is spare time the caller can pick a config
// with more cycles (double round robin, etc.).

import { BlitzRoundSchedule, PAUSE_BETWEEN_ROUNDS_SEC } from './blitz-schedule';

export interface FixedPairsConfig {
  /** Number of rounds in the tournament. */
  totalRounds: number;
  /** Matches each pair plays (identical for every pair). */
  matchesPerPair: number;
  /** Seconds of play per round. */
  roundDurationSeconds: number;
  /** How many full round robins are played (1 = everyone once). */
  cycles: number;
  /** Matches played simultaneously each round (capped by courts and by pairs/2). */
  matchesPerRound: number;
}

/** Minimum seconds of play per round before a config is considered unusable. */
const MIN_ROUND_SECONDS = 180;

/**
 * Hard ceiling on simultaneous matches. BlitzRoundSchedule can carry two
 * matches per round (teamA/teamB plus courtB), which matches the app's
 * 1-or-2 court setup. Anything above would silently drop matches.
 */
export const MAX_COURTS = 2;

/** Matches actually played at the same time — limited by courts AND by pairs. */
export function matchesPerRoundForFixedPairs(numPairs: number, courts: number): number {
  return Math.max(1, Math.min(courts, MAX_COURTS, Math.floor(numPairs / 2)));
}

/**
 * How many rounds a fixed-pairs tournament needs.
 *
 * With P pairs a full round robin is C(P,2) matches. The natural
 * schedule (circle method) plays floor(P/2) matches at once over P-1
 * rounds (P even) or P rounds (P odd, one pair resting each round).
 * If there are fewer courts than that, the same matches are simply
 * spread over more rounds.
 */
export function roundsForFixedPairs(numPairs: number, courts: number, cycles = 1): number {
  if (numPairs < 2) return 0;
  const totalMatches = (numPairs * (numPairs - 1)) / 2;
  const perRound = matchesPerRoundForFixedPairs(numPairs, courts);
  const naturalPerRound = Math.floor(numPairs / 2);
  const naturalRounds = numPairs % 2 === 0 ? numPairs - 1 : numPairs;
  if (perRound >= naturalPerRound) return naturalRounds * cycles;
  return Math.ceil((totalMatches * cycles) / perRound);
}

/**
 * All viable configurations, cheapest (single round robin) first.
 * Mirrors getAllBlitzConfigs so the setup screen can present them the
 * same way.
 */
export function getAllFixedPairsConfigs(
  numPairs: number,
  totalMinutes: number,
  pauseSec: number = PAUSE_BETWEEN_ROUNDS_SEC,
  courts: number = 1,
): FixedPairsConfig[] {
  if (numPairs < 2) return [];
  const configs: FixedPairsConfig[] = [];
  const matchesPerRound = matchesPerRoundForFixedPairs(numPairs, courts);
  for (let cycles = 1; cycles <= 6; cycles++) {
    const totalRounds = roundsForFixedPairs(numPairs, courts, cycles);
    const playSec = totalMinutes * 60 - (totalRounds - 1) * pauseSec;
    if (playSec <= 0) break;
    const roundSec = Math.floor(playSec / totalRounds);
    if (roundSec < MIN_ROUND_SECONDS) break;
    configs.push({
      totalRounds,
      matchesPerPair: (numPairs - 1) * cycles,
      roundDurationSeconds: roundSec,
      cycles,
      matchesPerRound,
    });
  }
  return configs;
}

/**
 * Every match of a full round robin between `numPairs` pairs, in circle
 * method order (which naturally spreads each pair across the list).
 * Returns pair indices, not player indices.
 */
function roundRobinMatches(numPairs: number): Array<[number, number]> {
  const ids: number[] = Array.from({ length: numPairs }, (_, i) => i);
  if (ids.length % 2 === 1) ids.push(-1); // bye marker
  const n = ids.length;
  let arr = [...ids];
  const out: Array<[number, number]> = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== -1 && b !== -1) {
        // Alternate sides so no pair is always "team A".
        out.push(r % 2 === 0 ? [a, b] : [b, a]);
      }
    }
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  return out;
}

/**
 * Build the round-by-round schedule for a fixed-pairs tournament.
 *
 * `pairs` holds player indices, e.g. [[0,3],[1,5],[2,4],[6,7]].
 * Matches are packed greedily into rounds respecting two rules:
 *   - at most `matchesPerRound` matches simultaneously (court limit)
 *   - a pair never plays twice in the same round
 */
export function generateFixedPairsSchedule(
  pairs: Array<[number, number]>,
  courts: number,
  cycles = 1,
  numPlayers?: number,
): BlitzRoundSchedule[] {
  const P = pairs.length;
  if (P < 2) return [];
  const perRound = matchesPerRoundForFixedPairs(P, courts);
  const totalPlayers = numPlayers ?? pairs.flat().length;

  // Full match list, repeated for each cycle.
  const base = roundRobinMatches(P);
  const allMatches: Array<[number, number]> = [];
  for (let c = 0; c < cycles; c++) {
    for (const [a, b] of base) {
      // Swap sides on odd cycles so the same pair isn't always team A.
      allMatches.push(c % 2 === 0 ? [a, b] : [b, a]);
    }
  }

  // Greedy packing: place each match in the earliest round that still has
  // a free court and does not already contain either pair.
  const rounds: Array<Array<[number, number]>> = [];
  for (const match of allMatches) {
    let placed = false;
    for (const round of rounds) {
      if (round.length >= perRound) continue;
      const busy = round.some(([x, y]) => x === match[0] || y === match[0] || x === match[1] || y === match[1]);
      if (busy) continue;
      round.push(match);
      placed = true;
      break;
    }
    if (!placed) rounds.push([match]);
  }

  // Map pair indices to the BlitzRoundSchedule shape.
  return rounds.map(matches => {
    const [firstA, firstB] = matches[0];
    const active = new Set<number>();
    matches.forEach(([a, b]) => {
      pairs[a].forEach(p => active.add(p));
      pairs[b].forEach(p => active.add(p));
    });
    const rest: number[] = [];
    for (let i = 0; i < totalPlayers; i++) if (!active.has(i)) rest.push(i);

    const round: BlitzRoundSchedule = {
      teamA: [...pairs[firstA]] as [number, number],
      teamB: [...pairs[firstB]] as [number, number],
      rest,
    };
    if (matches[1]) {
      const [secondA, secondB] = matches[1];
      round.courtB = {
        teamA: [...pairs[secondA]] as [number, number],
        teamB: [...pairs[secondB]] as [number, number],
      };
    }
    return round;
  });
}
