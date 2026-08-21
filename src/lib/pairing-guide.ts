// Advice layer for the fixed-pairs setup screen.
//
// This module never decides the pairs — it only measures what the host
// has built and offers a suggestion they can take or ignore. Every
// function is pure so the setup screen can call it on each tap.

import { STRONG_TRIPLE_PLAYER_IDS, WEAK_TRIPLE_PLAYER_IDS } from './pairing-constraints';

export interface PairingPlayer {
  /** Index in the tournament roster (matches schedule player indices). */
  index: number;
  name: string;
  playerId: string | null;
  /** Global ranking score; 0 for newcomers and guests. */
  score: number;
}

export type BalanceVerdict = 'balanced' | 'slightly-off' | 'unbalanced' | 'unknown';

export interface PairInfo {
  a: number;
  b: number;
  /** Combined ranking score of the two members. */
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
  /** Strength gap between the strongest and the weakest pair. */
  spread: number;
  /** One line per cluster violation. */
  warnings: string[];
}

/**
 * Snake seeding: strongest with weakest, second strongest with second
 * weakest, and so on. Produces the most even set of pairs achievable
 * from ranking alone, and as a side effect almost never puts two
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
  if (bothIn(STRONG_TRIPLE_PLAYER_IDS)) return 'Due giocatori forti insieme';
  if (bothIn(WEAK_TRIPLE_PLAYER_IDS)) return 'Due giocatori meno forti insieme';
  return null;
}

/**
 * Measure a set of pairs: strength per pair, overall balance, unpaired
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
    return {
      a,
      b,
      strength: (pa?.score ?? 0) + (pb?.score ?? 0),
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
  const max = Math.max(...strengths);
  const min = Math.min(...strengths);
  const spread = max - min;
  const avg = strengths.reduce((s, v) => s + v, 0) / strengths.length;

  // Without any ranking history every pair scores 0 — say so instead of
  // claiming the pairs are perfectly balanced.
  if (avg <= 0) {
    return {
      pairs: infos,
      unpaired,
      verdict: 'unknown',
      label: 'Nessuno storico: equilibrio non valutabile',
      spread,
      warnings,
    };
  }

  const relative = spread / avg;
  let verdict: BalanceVerdict;
  let label: string;
  if (relative < 0.25) {
    verdict = 'balanced';
    label = 'Coppie equilibrate';
  } else if (relative < 0.5) {
    verdict = 'slightly-off';
    label = 'Coppie quasi equilibrate';
  } else {
    verdict = 'unbalanced';
    label = 'Una coppia è nettamente più forte';
  }

  return { pairs: infos, unpaired, verdict, label, spread, warnings };
}
