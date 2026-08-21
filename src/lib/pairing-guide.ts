// Advice layer for the fixed-pairs setup screen.
//
// This module never decides the pairs — it only measures what the host
// has built and offers a suggestion they can take or ignore. Every
// function is pure so the setup screen can call it on each tap.
//
// Strength comes from the doubles Elo in player-strength.ts, not from the
// ranking: the ranking is cumulative and time-decayed, which measures
// attendance and recent form rather than level.

import { STRONG_TRIPLE_PLAYER_IDS, WEAK_TRIPLE_PLAYER_IDS } from './pairing-constraints';
import { BASE_RATING } from './player-strength';

export interface PairingPlayer {
  /** Index in the tournament roster (matches schedule player indices). */
  index: number;
  name: string;
  playerId: string | null;
  /** Doubles Elo rating; a provisional value for players with no history. */
  score: number;
}

export type BalanceVerdict = 'balanced' | 'slightly-off' | 'unbalanced' | 'unknown';

export interface PairInfo {
  a: number;
  b: number;
  /** Average rating of the two members — the pair's level. */
  strength: number;
  /** Set when both members belong to the same fixed cluster. */
  warning: string | null;
}

export interface PairingAssessment {
  pairs: PairInfo[];
  /** Roster indices not yet assigned to any pair. */
  unpaired: number[];
  verdict: BalanceVerdict;
  /** Short human-readable summary for the header. */
  label: string;
  /** Rating gap between the strongest and the weakest pair. */
  spread: number;
  /** One line per cluster violation. */
  warnings: string[];
}

// Gaps are in Elo points between pair averages. Forty points is inside
// the noise of a fifteen-match sample; past a hundred the stronger pair
// is expected to win comfortably.
const BALANCED_MAX_SPREAD = 40;
const SLIGHTLY_OFF_MAX_SPREAD = 100;

/**
 * Snake seeding: strongest with weakest, second strongest with second
 * weakest, and so on. Produces the most even set of pairs achievable
 * from the ratings alone, and as a side effect almost never puts two
 * cluster-mates together.
 */
export function suggestSnakePairs(players: PairingPlayer[]): Array<[number, number]> {
  const sorted = [...players].sort((x, y) => y.score - x.score);
  const out: Array<[number, number]> = [];
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo < hi) {
    out.push([sorted[lo].index, sorted[hi].index]);
    lo++;
    hi--;
  }
  return out;
}

function clusterWarning(
  a: PairingPlayer | undefined,
  b: PairingPlayer | undefined,
): string | null {
  if (!a || !b || !a.playerId || !b.playerId) return null;
  const bothIn = (cluster: readonly string[]) =>
    cluster.includes(a.playerId!) && cluster.includes(b.playerId!);
  if (bothIn(STRONG_TRIPLE_PLAYER_IDS)) return 'Two strong players together';
  if (bothIn(WEAK_TRIPLE_PLAYER_IDS)) return 'Two weaker players together';
  return null;
}

/**
 * Measure a set of pairs: level per pair, overall balance, unpaired
 * players and cluster warnings. Purely advisory — nothing here blocks
 * the host from starting the tournament.
 */
export function assessPairs(
  pairs: Array<[number, number]>,
  players: PairingPlayer[],
): PairingAssessment {
  const byIndex = new Map(players.map(p => [p.index, p]));
  const paired = new Set<number>();
  pairs.forEach(([a, b]) => { paired.add(a); paired.add(b); });
  const unpaired = players.map(p => p.index).filter(i => !paired.has(i));

  const infos: PairInfo[] = pairs.map(([a, b]) => {
    const pa = byIndex.get(a);
    const pb = byIndex.get(b);
    const ra = pa?.score ?? BASE_RATING;
    const rb = pb?.score ?? BASE_RATING;
    return {
      a,
      b,
      strength: Math.round((ra + rb) / 2),
      warning: clusterWarning(pa, pb),
    };
  });

  const warnings = infos
    .filter(i => i.warning)
    .map(i => `${byIndex.get(i.a)?.name} + ${byIndex.get(i.b)?.name}: ${i.warning}`);

  if (infos.length < 2) {
    return { pairs: infos, unpaired, verdict: 'unknown', label: '', spread: 0, warnings };
  }

  const strengths = infos.map(i => i.strength);
  const spread = Math.max(...strengths) - Math.min(...strengths);

  // Nobody in this roster has played a rated match yet: every rating is
  // still the baseline, so any verdict would be meaningless.
  const noHistory = players.every(p => p.score === BASE_RATING);
  if (noHistory) {
    return {
      pairs: infos,
      unpaired,
      verdict: 'unknown',
      label: 'No history yet — balance cannot be judged',
      spread,
      warnings,
    };
  }

  let verdict: BalanceVerdict;
  let label: string;
  if (spread <= BALANCED_MAX_SPREAD) {
    verdict = 'balanced';
    label = 'Balanced pairs';
  } else if (spread <= SLIGHTLY_OFF_MAX_SPREAD) {
    verdict = 'slightly-off';
    label = 'Nearly balanced';
  } else {
    verdict = 'unbalanced';
    label = 'One pair is clearly stronger';
  }

  return { pairs: infos, unpaired, verdict, label, spread, warnings };
}
