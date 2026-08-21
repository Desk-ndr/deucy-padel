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

/** A complete set of pairs, with the numbers that justify offering it. */
export interface PairingOption {
  pairs: Array<[number, number]>;
  /** Rating gap between the strongest and the weakest pair. */
  spread: number;
  /** How many pairs put two cluster-mates together. */
  violations: number;
}

// Every way of splitting N players into pairs: 105 for eight, 945 for ten,
// 10395 for twelve. Past twelve the count explodes, so a large roster is
// sampled instead of enumerated — the best of twenty thousand random splits
// is indistinguishable in practice from the true optimum.
const MAX_EXHAUSTIVE_PLAYERS = 12;
const RANDOM_SAMPLES = 20000;

/** Two options are "the same idea" unless at least two pairs differ. */
const MIN_DIFFERING_PAIRS = 2;

function pairKey(pair: readonly [number, number]): string {
  const [a, b] = pair[0] < pair[1] ? pair : [pair[1], pair[0]];
  return `${a}-${b}`;
}

function optionKey(pairs: Array<[number, number]>): string {
  return pairs.map(pairKey).sort().join('|');
}

/**
 * Walk every perfect matching of the given roster indices. Always pairs the
 * lowest unused player first, which visits each matching exactly once.
 */
function eachMatching(
  indices: number[],
  visit: (pairs: Array<[number, number]>) => void,
): void {
  const used = new Array(indices.length).fill(false);
  const current: Array<[number, number]> = [];
  const step = () => {
    let i = 0;
    while (i < indices.length && used[i]) i++;
    if (i >= indices.length) { visit([...current]); return; }
    used[i] = true;
    for (let j = i + 1; j < indices.length; j++) {
      if (used[j]) continue;
      used[j] = true;
      current.push([indices[i], indices[j]]);
      step();
      current.pop();
      used[j] = false;
    }
    used[i] = false;
  };
  step();
}

/** Deterministic shuffle source, so the same roster always offers the same
 *  set of options rather than reshuffling under the host mid-decision. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5; state >>>= 0;
    return state / 4294967296;
  };
}

function randomMatching(indices: number[], rnd: () => number): Array<[number, number]> {
  const a = [...indices];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  const out: Array<[number, number]> = [];
  for (let i = 0; i < a.length; i += 2) out.push([a[i], a[i + 1]]);
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
 * Several genuinely different ways to pair the roster, all of them balanced.
 *
 * Snake seeding answers "what is the single most even split", which is a fine
 * opening move but leaves the host with one arrangement to take or leave. In
 * practice more than one split comes out even, and the interesting choice is
 * between them: the same players can be balanced on paper while producing
 * very different matches.
 *
 * So every split is measured and the field is narrowed in three passes.
 * First on cluster violations, since keeping the fixed trios apart matters
 * more than shaving a few rating points. Then on spread, keeping only splits
 * inside the balanced band — unless none qualify, in which case the closest
 * are offered rather than nothing. Finally on variety: an option is skipped
 * if it shares all but one pair with something already offered, because
 * swapping two players is a different arrangement on paper and the same
 * evening in practice.
 *
 * Returned best-first, so options[0] is the most even split available.
 */
export function balancedPairingOptions(
  players: PairingPlayer[],
  maxOptions = 6,
): PairingOption[] {
  const n = players.length;
  if (n < 4 || n % 2 !== 0) return [];

  const byIndex = new Map(players.map(p => [p.index, p]));
  const indices = players.map(p => p.index);
  const numPairs = n / 2;

  const seen = new Set<string>();
  const candidates: PairingOption[] = [];

  const consider = (pairs: Array<[number, number]>) => {
    const key = optionKey(pairs);
    if (seen.has(key)) return;
    seen.add(key);

    let min = Infinity;
    let max = -Infinity;
    let violations = 0;
    for (const [a, b] of pairs) {
      const pa = byIndex.get(a);
      const pb = byIndex.get(b);
      const avg = ((pa?.score ?? BASE_RATING) + (pb?.score ?? BASE_RATING)) / 2;
      if (avg < min) min = avg;
      if (avg > max) max = avg;
      if (clusterWarning(pa, pb)) violations++;
    }
    candidates.push({ pairs, spread: Math.round(max - min), violations });
  };

  if (n <= MAX_EXHAUSTIVE_PLAYERS) {
    eachMatching(indices, consider);
  } else {
    const rnd = seededRandom(n * 7919 + indices.reduce((acc, i) => acc + i, 0));
    for (let i = 0; i < RANDOM_SAMPLES; i++) consider(randomMatching(indices, rnd));
  }
  if (candidates.length === 0) return [];

  const fewestViolations = Math.min(...candidates.map(c => c.violations));
  const clean = candidates.filter(c => c.violations === fewestViolations);
  clean.sort((a, b) => a.spread - b.spread);

  const inBand = clean.filter(c => c.spread <= BALANCED_MAX_SPREAD);
  const ranked = inBand.length > 0 ? inBand : clean;

  const chosen: PairingOption[] = [];
  const chosenKeys: Array<Set<string>> = [];
  for (const cand of ranked) {
    if (chosen.length >= maxOptions) break;
    const keys = new Set(cand.pairs.map(pairKey));
    let shared: number;
    const tooSimilar = chosenKeys.some(prev => {
      shared = 0;
      keys.forEach(k => { if (prev.has(k)) shared++; });
      return numPairs - shared < MIN_DIFFERING_PAIRS;
    });
    if (tooSimilar) continue;
    chosen.push(cand);
    chosenKeys.push(keys);
  }
  return chosen;
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
