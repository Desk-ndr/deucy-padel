// Dynamic schedule generator for blitz tournaments with any number of players (2v2 format)

export interface BlitzRoundSchedule {
  teamA: [number, number];
  teamB: [number, number];
  courtB?: { teamA: [number, number]; teamB: [number, number] };
  rest: number[];
}

/**
 * Real-world pause between matches (court swap, water break, talking
 * trash). Subtracted from the total time before computing per-round
 * duration, so the tournament actually fits inside the host's stated
 * minutes instead of overrunning by ~3 min per round.
 */
export const PAUSE_BETWEEN_ROUNDS_SEC = 150; // 2.5 minutes

/**
 * Given N players playing 2v2 (4 active per round), compute valid configurations
 * where every player plays exactly K rounds.
 * Total rounds R = N*K/4, so N*K must be divisible by 4.
 * `pauseSec` is the pause between rounds (default 150s = 2:30), used to
 * carve out real-world breaks before splitting the rest across rounds.
 */
export function computeBlitzConfig(
  numPlayers: number,
  totalMinutes: number,
  pauseSec: number = PAUSE_BETWEEN_ROUNDS_SEC,
  courts: 1 | 2 = 1
): { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number } | null {
  if (numPlayers < 5) return null;

  const activePerRound = courts * 4;
  const g = gcd(numPlayers, activePerRound);
  const minK = activePerRound / g;

  // Try multiples of minK, pick best where round duration is 5-20 min
  let bestConfig: { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number } | null = null;

  for (let mult = 1; mult <= 20; mult++) {
    const k = minK * mult;
    const r = (numPlayers * k) / activePerRound;
    // Reserve (r-1) pauses worth of time, then split the rest across r rounds.
    const playSec = totalMinutes * 60 - (r - 1) * pauseSec;
    if (playSec <= 0) break; // not enough time even before the rounds start
    const roundSec = Math.floor(playSec / r);
    if (roundSec < 180) break; // less than 3 min per round is too short
    if (roundSec >= 300 && roundSec <= 1200) {
      // 5-20 min is ideal
      bestConfig = { totalRounds: r, gamesPerPlayer: k, roundDurationSeconds: roundSec };
    }
    if (!bestConfig) {
      bestConfig = { totalRounds: r, gamesPerPlayer: k, roundDurationSeconds: roundSec };
    }
  }

  return bestConfig;
}

/**
 * Get all valid configurations for display. `pauseSec` controls the
 * real-world break between rounds (default 150s = 2:30). Shorter pauses
 * leave more time for actual play, so configurations with many rounds
 * can become viable (the per-round duration grows).
 */
export function getAllBlitzConfigs(
  numPlayers: number,
  totalMinutes: number,
  pauseSec: number = PAUSE_BETWEEN_ROUNDS_SEC,
  courts: 1 | 2 = 1
): { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number }[] {
  if (numPlayers < 5) return [];

  const activePerRound = courts * 4;
  const g = gcd(numPlayers, activePerRound);
  const minK = activePerRound / g;
  const configs: { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number }[] = [];

  for (let mult = 1; mult <= 20; mult++) {
    const k = minK * mult;
    const r = (numPlayers * k) / activePerRound;
    // Reserve (r-1) pauses worth of time, then split the rest across r rounds.
    const playSec = totalMinutes * 60 - (r - 1) * pauseSec;
    if (playSec <= 0) break;
    const roundSec = Math.floor(playSec / r);
    if (roundSec < 180) break; // stop when rounds get too short
    configs.push({ totalRounds: r, gamesPerPlayer: k, roundDurationSeconds: roundSec });
  }

  return configs;
}

/**
 * Generate a balanced schedule for N players, R rounds, 4 active per round.
 * Each player must play exactly K = R*4/N rounds.
 */
/**
 * Generate the round-robin schedule. `avoidPairs` is a list of [a, b]
 * tuples of player indices that MUST end up on opposite teams every
 * round (hard constraint — splits that would put any of these pairs on
 * the same team are removed before scoring). Used to:
 *   - keep the two top-ranked players apart (competitive balance)
 *   - keep the two bottom-ranked players apart (no weak team gets buried)
 * With our usage (max 2 pairs = 4 anchors) at least one valid split
 * always exists, so the constraint never causes infeasibility.
 */
export function generateSchedule(
  numPlayers: number,
  totalRounds: number,
  avoidPairs: Array<[number, number]> = [],
  courts: 1 | 2 = 1,
): BlitzRoundSchedule[] {
  // Multi-attempt search. Composite score prioritizes:
  //   1. Partner repeats (heavy weight)  — same duo forming twice is the worst outcome
  //   2. Max opponent frequency          — spread the "who faces who" across the field
  //   3. Total opponent repeats          — tie-break on overall variety
  // Early-exit when we reach the theoretical minimum for the size.
  const activePerRound = courts * 4;
  const K = (totalRounds * activePerRound) / numPlayers;
  const opponentsPerPlayer = K * 3;
  const idealMaxOpp = Math.ceil(opponentsPerPlayer / (numPlayers - 1));
  const scoreOf = (sch: BlitzRoundSchedule[]) => {
    const m = scheduleMetrics(sch, numPlayers);
    return m.partnerRepeats * 10000 + m.maxOpp * 100 + m.totalOppRepeats;
  };

  // Phase 1 — random search, keep top-N by raw score for later refinement.
  const TOP_N = 8;
  const pool: { schedule: BlitzRoundSchedule[]; score: number }[] = [];
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 200; attempt++) {
    const schedule = generateScheduleAttempt(numPlayers, totalRounds, attempt, avoidPairs, courts);
    const score = scoreOf(schedule);
    pool.push({ schedule, score });
    if (score < bestScore) bestScore = score;
    // Cheap early-exit: raw random already partner-perfect + opponent-optimal.
    const m = scheduleMetrics(schedule, numPlayers);
    if (m.partnerRepeats === 0 && m.maxOpp <= idealMaxOpp) {
      return schedule;
    }
  }
  pool.sort((a, b) => a.score - b.score);
  const survivors = pool.slice(0, TOP_N);

  // Phase 2 — local search + perturbation restarts.
  let bestSchedule = survivors[0].schedule;
  let bestPostScore = Infinity;
  const rand = seededRandomFactory(numPlayers * 31 + totalRounds);
  for (const { schedule } of survivors) {
    let current = localSearchSchedule(schedule, numPlayers, avoidPairs);
    let currentScore = scoreOf(current);
    // Perturbation restarts: shuffle two random rounds' configurations, then re-refine.
    // If the perturbed refinement is worse, revert. Repeat a bounded number of times.
    for (let kick = 0; kick < 12; kick++) {
      // Bail early if we already hit the theoretical floor.
      const m = scheduleMetrics(current, numPlayers);
      if (m.partnerRepeats === 0 && m.maxOpp <= idealMaxOpp) break;
      const perturbed = perturbSchedule(current, avoidPairs, rand);
      const refined = localSearchSchedule(perturbed, numPlayers, avoidPairs);
      const sc = scoreOf(refined);
      if (sc < currentScore) {
        current = refined;
        currentScore = sc;
      }
    }
    if (currentScore < bestPostScore) {
      bestPostScore = currentScore;
      bestSchedule = current;
    }
    const finalM = scheduleMetrics(bestSchedule, numPlayers);
    if (finalM.partnerRepeats === 0 && finalM.maxOpp <= idealMaxOpp) return bestSchedule;
  }
  return bestSchedule;
}

/** Deterministic pseudo-random generator (mulberry32-ish). */
function seededRandomFactory(seed: number): () => number {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Yield all valid (teamA, teamB[, courtB]) configurations for the given
 *  active players, respecting avoidPairs (hard). Cost: at most 315 configs
 *  for 8 active players (2 court), 3 for 4 active (single court). */
function enumerateRoundConfigs(
  active: number[],
  rest: number[],
  avoidPairs: Array<[number, number]>,
  dual: boolean,
): BlitzRoundSchedule[] {
  const configs: BlitzRoundSchedule[] = [];
  const violatesAvoid = (pair: [number, number]): boolean => {
    for (const [a, b] of avoidPairs) if ((pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a)) return true;
    return false;
  };
  if (!dual) {
    const [a, b, c, d] = active;
    const splits: Array<[[number, number], [number, number]]> = [
      [[a, b], [c, d]],
      [[a, c], [b, d]],
      [[a, d], [b, c]],
    ];
    for (const [tA, tB] of splits) {
      if (violatesAvoid(tA) || violatesAvoid(tB)) continue;
      configs.push({ teamA: tA, teamB: tB, rest });
    }
    return configs;
  }
  // Dual court — 8 active players.
  // Step 1: all 105 perfect matchings of 8 into 4 unordered pairs.
  // Step 2: choose 2 of the 4 pairs to be Court A (the other 2 → Court B) → C(4,2)/2 = 3 ways.
  // Step 3: inside each court, the pair-to-teamA-teamB assignment is fixed (2 pairs = 1 match).
  // Total: 105 × 3 = 315 configurations.
  const matchings = perfectMatchings(active);
  for (const matching of matchings) {
    // Skip matchings that produce any avoidPair as a partnership.
    let bad = false;
    for (const m of matching) if (violatesAvoid(m)) { bad = true; break; }
    if (bad) continue;
    // Split 4 pairs into (A-court pairs) + (B-court pairs). Unordered split → 3 partitions.
    const idxSplits: Array<[number[], number[]]> = [
      [[0, 1], [2, 3]],
      [[0, 2], [1, 3]],
      [[0, 3], [1, 2]],
    ];
    for (const [aIdx, bIdx] of idxSplits) {
      const cA_teamA = matching[aIdx[0]];
      const cA_teamB = matching[aIdx[1]];
      const cB_teamA = matching[bIdx[0]];
      const cB_teamB = matching[bIdx[1]];
      configs.push({
        teamA: cA_teamA, teamB: cA_teamB,
        courtB: { teamA: cB_teamA, teamB: cB_teamB },
        rest,
      });
    }
  }
  return configs;
}

/** Generate every perfect matching of `arr` into unordered pairs of size 2.
 *  For 8 elements returns 105 matchings. */
function perfectMatchings(arr: number[]): Array<Array<[number, number]>> {
  if (arr.length === 0) return [[]];
  if (arr.length % 2 !== 0) return [];
  const first = arr[0];
  const rest = arr.slice(1);
  const out: Array<Array<[number, number]>> = [];
  for (let i = 0; i < rest.length; i++) {
    const partner = rest[i];
    const remaining = rest.slice(0, i).concat(rest.slice(i + 1));
    for (const sub of perfectMatchings(remaining)) {
      out.push([[first, partner], ...sub]);
    }
  }
  return out;
}

/** Improve a schedule by trying every alternative configuration for each
 *  round in turn. Accept the change if the global composite score drops.
 *  Repeats passes until no round yields an improvement. */
function localSearchSchedule(
  schedule: BlitzRoundSchedule[],
  numPlayers: number,
  avoidPairs: Array<[number, number]>,
): BlitzRoundSchedule[] {
  const current = schedule.map(r => ({
    teamA: [...r.teamA] as [number, number],
    teamB: [...r.teamB] as [number, number],
    courtB: r.courtB ? { teamA: [...r.courtB.teamA] as [number, number], teamB: [...r.courtB.teamB] as [number, number] } : undefined,
    rest: [...r.rest],
  }));
  const scoreOf = (sch: BlitzRoundSchedule[]) => {
    const m = scheduleMetrics(sch, numPlayers);
    return m.partnerRepeats * 10000 + m.maxOpp * 100 + m.totalOppRepeats;
  };
  let currentScore = scoreOf(current);
  let maxPasses = 25;
  let improved = true;
  while (improved && maxPasses-- > 0) {
    improved = false;
    for (let ri = 0; ri < current.length; ri++) {
      const round = current[ri];
      const dual = !!round.courtB;
      const active = dual
        ? [...round.teamA, ...round.teamB, ...round.courtB!.teamA, ...round.courtB!.teamB]
        : [...round.teamA, ...round.teamB];
      const configs = enumerateRoundConfigs(active, round.rest, avoidPairs, dual);
      let bestCfg = round;
      let bestSc = currentScore;
      const original = current[ri];
      for (const cfg of configs) {
        current[ri] = cfg;
        const sc = scoreOf(current);
        if (sc < bestSc) {
          bestSc = sc;
          bestCfg = cfg;
        }
      }
      current[ri] = bestCfg === original ? original : bestCfg;
      if (bestSc < currentScore) {
        currentScore = bestSc;
        improved = true;
      }
    }
  }
  return current;
}

/** Rich metrics for scoring a full schedule. Counts BOTH courts. */
function scheduleMetrics(schedule: BlitzRoundSchedule[], numPlayers: number): {
  partnerRepeats: number;
  maxOpp: number;
  totalOppRepeats: number;
} {
  const pc: number[][] = Array.from({ length: numPlayers }, () => new Array(numPlayers).fill(0));
  const oc: number[][] = Array.from({ length: numPlayers }, () => new Array(numPlayers).fill(0));
  const addPair = (a: number, b: number, mat: number[][]) => { mat[a][b]++; mat[b][a]++; };
  for (const round of schedule) {
    addPair(round.teamA[0], round.teamA[1], pc);
    addPair(round.teamB[0], round.teamB[1], pc);
    for (const a of round.teamA) for (const b of round.teamB) addPair(a, b, oc);
    if (round.courtB) {
      addPair(round.courtB.teamA[0], round.courtB.teamA[1], pc);
      addPair(round.courtB.teamB[0], round.courtB.teamB[1], pc);
      for (const a of round.courtB.teamA) for (const b of round.courtB.teamB) addPair(a, b, oc);
    }
  }
  let partnerRepeats = 0;
  let maxOpp = 0;
  let totalOppRepeats = 0;
  for (let i = 0; i < numPlayers; i++) {
    for (let j = i + 1; j < numPlayers; j++) {
      if (pc[i][j] > 1) partnerRepeats += pc[i][j] - 1;
      if (oc[i][j] > maxOpp) maxOpp = oc[i][j];
      if (oc[i][j] > 1) totalOppRepeats += oc[i][j] - 1;
    }
  }
  return { partnerRepeats, maxOpp, totalOppRepeats };
}

/** Count how many times any pair plays together as partners more than once */
function countPartnerRepeats(schedule: BlitzRoundSchedule[], numPlayers: number): number {
  const pc: number[][] = Array.from({ length: numPlayers }, () => new Array(numPlayers).fill(0));
  for (const round of schedule) {
    pc[round.teamA[0]][round.teamA[1]]++;
    pc[round.teamA[1]][round.teamA[0]]++;
    pc[round.teamB[0]][round.teamB[1]]++;
    pc[round.teamB[1]][round.teamB[0]]++;
    if (round.courtB) {
      pc[round.courtB.teamA[0]][round.courtB.teamA[1]]++;
      pc[round.courtB.teamA[1]][round.courtB.teamA[0]]++;
      pc[round.courtB.teamB[0]][round.courtB.teamB[1]]++;
      pc[round.courtB.teamB[1]][round.courtB.teamB[0]]++;
    }
  }
  let repeats = 0;
  for (let i = 0; i < numPlayers; i++) {
    for (let j = i + 1; j < numPlayers; j++) {
      if (pc[i][j] > 1) repeats += pc[i][j] - 1;
    }
  }
  return repeats;
}

function generateScheduleAttempt(numPlayers: number, totalRounds: number, attemptSeed: number, avoidPairs: Array<[number, number]>, courts: 1 | 2 = 1): BlitzRoundSchedule[] {
  const activePerRound = courts * 4;
  const targetGames = (totalRounds * activePerRound) / numPlayers;
  const playCounts = new Array(numPlayers).fill(0);
  const schedule: BlitzRoundSchedule[] = [];

  const partnerCount: number[][] = Array.from({ length: numPlayers }, () => new Array(numPlayers).fill(0));
  const opponentCount: number[][] = Array.from({ length: numPlayers }, () => new Array(numPlayers).fill(0));

  let seed = numPlayers * 1000 + totalRounds + attemptSeed * 7919;
  const seededRandom = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let r = 0; r < totalRounds; r++) {
    const eligible = Array.from({ length: numPlayers }, (_, i) => i)
      .filter(i => playCounts[i] < targetGames);

    let pool = eligible.length >= activePerRound ? eligible :
      Array.from({ length: numPlayers }, (_, i) => i);

    pool.sort((a, b) => playCounts[a] - playCounts[b]);

    const minPlays = playCounts[pool[0]];
    const mustPlay = pool.filter(p => playCounts[p] === minPlays);
    const canPlay = pool.filter(p => playCounts[p] > minPlays && playCounts[p] < targetGames);

    let chosen: number[];

    if (mustPlay.length >= activePerRound) {
      chosen = pickBestFour(mustPlay, partnerCount, opponentCount, seededRandom);
      if (courts === 2) {
        const remaining = mustPlay.filter(p => !chosen.includes(p));
        const second = pickBestFour(remaining, partnerCount, opponentCount, seededRandom);
        chosen = [...chosen, ...second];
      }
    } else {
      const remaining = activePerRound - mustPlay.length;
      const fillers = pickBestFillers(mustPlay, canPlay.length > 0 ? canPlay : pool.filter(p => !mustPlay.includes(p)), remaining, partnerCount, opponentCount, seededRandom);
      chosen = [...mustPlay, ...fillers];
    }

    const splitA = findBestSplit(chosen.slice(0, 4), partnerCount, opponentCount, seededRandom, avoidPairs);
    const splitB = courts === 2 ? findBestSplit(chosen.slice(4, 8), partnerCount, opponentCount, seededRandom, avoidPairs) : null;

    const rest = Array.from({ length: numPlayers }, (_, i) => i).filter(i => !chosen.includes(i));

    schedule.push({
      teamA: [splitA.teamA[0], splitA.teamA[1]],
      teamB: [splitA.teamB[0], splitA.teamB[1]],
      courtB: splitB ? { teamA: [splitB.teamA[0], splitB.teamA[1]], teamB: [splitB.teamB[0], splitB.teamB[1]] } : undefined,
      rest,
    });

    for (const idx of chosen) playCounts[idx]++;
    const updateCounters = (tA: [number, number], tB: [number, number]) => {
      partnerCount[tA[0]][tA[1]]++;
      partnerCount[tA[1]][tA[0]]++;
      partnerCount[tB[0]][tB[1]]++;
      partnerCount[tB[1]][tB[0]]++;
      for (const a of tA) {
        for (const b of tB) {
          opponentCount[a][b]++;
          opponentCount[b][a]++;
        }
      }
    };
    updateCounters(splitA.teamA, splitA.teamB);
    if (splitB) updateCounters(splitB.teamA, splitB.teamB);
  }

  return schedule;
}

/** Score how "fresh" a group of 4 players is — lower = less repeated pairings.
 *  Partner repeats are penalized 10x more than opponent repeats. */
function groupFreshness(group: number[], partnerCount: number[][], opponentCount: number[][]): number {
  let score = 0;
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      // Partner repeats are much worse than opponent repeats
      score += partnerCount[group[i]][group[j]] * 10 + opponentCount[group[i]][group[j]];
    }
  }
  return score;
}

/** Pick the best 4 from a pool, minimizing repeated pairings with random tie-breaking */
function pickBestFour(
  pool: number[],
  partnerCount: number[][],
  opponentCount: number[][],
  rand: () => number
): number[] {
  if (pool.length <= 4) return pool.slice(0, 4);

  if (pool.length <= 10) {
    let bestGroup = pool.slice(0, 4);
    let bestScore = Infinity;
    for (let a = 0; a < pool.length; a++) {
      for (let b = a + 1; b < pool.length; b++) {
        for (let c = b + 1; c < pool.length; c++) {
          for (let d = c + 1; d < pool.length; d++) {
            const g = [pool[a], pool[b], pool[c], pool[d]];
            const s = groupFreshness(g, partnerCount, opponentCount);
            if (s < bestScore || (s === bestScore && rand() < 0.5)) {
              bestScore = s;
              bestGroup = g;
            }
          }
        }
      }
    }
    return bestGroup;
  }

  let bestGroup = pool.slice(0, 4);
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 300; attempt++) {
    const shuffled = [...pool].sort(() => rand() - 0.5);
    const g = shuffled.slice(0, 4);
    const s = groupFreshness(g, partnerCount, opponentCount);
    if (s < bestScore || (s === bestScore && rand() < 0.5)) {
      bestScore = s;
      bestGroup = g;
    }
  }
  return bestGroup;
}

/** Pick `count` fillers from candidates that best complement the `fixed` players */
function pickBestFillers(
  fixed: number[],
  candidates: number[],
  count: number,
  partnerCount: number[][],
  opponentCount: number[][],
  rand: () => number
): number[] {
  if (candidates.length <= count) return candidates.slice(0, count);

  if (candidates.length <= 12) {
    let bestFillers = candidates.slice(0, count);
    let bestScore = Infinity;
    const combos = combinations(candidates, count);
    for (const combo of combos) {
      const group = [...fixed, ...combo];
      const s = groupFreshness(group, partnerCount, opponentCount);
      if (s < bestScore || (s === bestScore && rand() < 0.5)) {
        bestScore = s;
        bestFillers = combo;
      }
    }
    return bestFillers;
  }

  let bestFillers = candidates.slice(0, count);
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 300; attempt++) {
    const shuffled = [...candidates].sort(() => rand() - 0.5);
    const combo = shuffled.slice(0, count);
    const group = [...fixed, ...combo];
    const s = groupFreshness(group, partnerCount, opponentCount);
    if (s < bestScore || (s === bestScore && rand() < 0.5)) {
      bestScore = s;
      bestFillers = combo;
    }
  }
  return bestFillers;
}

/** Generate all combinations of `k` elements from `arr` */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function findBestSplit(
  players: number[],
  partnerCount: number[][],
  opponentCount: number[][],
  rand: () => number,
  avoidPairs: Array<[number, number]> = [],
): { teamA: [number, number]; teamB: [number, number] } {
  const [a, b, c, d] = players;
  const allSplits: [number, number, number, number][] = [
    [a, b, c, d],
    [a, c, b, d],
    [a, d, b, c],
  ];

  // HARD constraint: a split is banned outright if any avoidPair would
  // land on the same team. avoidPairs typically contains the top-2 and
  // bot-2 ranked players in this tournament's pool — we never want either
  // pair to be teammates. With only 2 pairs of anchors (4 anchors total)
  // and 3 possible splits, at least 2 splits will always be valid when
  // all 4 anchors are active in the round, so infeasibility is impossible
  // in practice.
  const splitViolates = (s: [number, number, number, number]): boolean => {
    const [p1, p2, p3, p4] = s;
    const teamA = [p1, p2];
    const teamB = [p3, p4];
    for (const ap of avoidPairs) {
      if (!players.includes(ap[0]) || !players.includes(ap[1])) continue;
      const sameA = teamA.includes(ap[0]) && teamA.includes(ap[1]);
      const sameB = teamB.includes(ap[0]) && teamB.includes(ap[1]);
      if (sameA || sameB) return true;
    }
    return false;
  };

  const validSplits = allSplits.filter(s => !splitViolates(s));
  // Defensive fallback: if every split somehow violates (would require
  // >=3 anchors of the same kind in the round — impossible with our
  // usage), fall back to the unfiltered set so the algorithm doesn't
  // hard-crash. With current constraints (top-2 + bot-2) this branch
  // is unreachable.
  const splits = validSplits.length > 0 ? validSplits : allSplits;

  let bestScore = Infinity;
  let bestSplit = splits[0];

  for (const [p1, p2, p3, p4] of splits) {
    // Heavily penalize repeated partners (10x weight)
    const partnerPenalty = (partnerCount[p1][p2] + partnerCount[p3][p4]) * 10;
    const opponentPenalty =
      opponentCount[p1][p3] + opponentCount[p1][p4] +
      opponentCount[p2][p3] + opponentCount[p2][p4];
    const score = partnerPenalty + opponentPenalty;
    if (score < bestScore || (score === bestScore && rand() < 0.5)) {
      bestScore = score;
      bestSplit = [p1, p2, p3, p4];
    }
  }

  return {
    teamA: [bestSplit[0], bestSplit[1]],
    teamB: [bestSplit[2], bestSplit[3]],
  };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// Legacy exports for backwards compatibility
export const EUROS_PER_GAME = 3;

/** Randomly reshuffle two rounds' configurations to escape local minima.
 *  Picks 2 rounds and rebuilds them from a random-but-avoidPair-safe
 *  pairing. */
function perturbSchedule(
  schedule: BlitzRoundSchedule[],
  avoidPairs: Array<[number, number]>,
  rand: () => number,
): BlitzRoundSchedule[] {
  const out = schedule.map(r => ({
    teamA: [...r.teamA] as [number, number],
    teamB: [...r.teamB] as [number, number],
    courtB: r.courtB ? { teamA: [...r.courtB.teamA] as [number, number], teamB: [...r.courtB.teamB] as [number, number] } : undefined,
    rest: [...r.rest],
  }));
  const nRounds = out.length;
  // Pick 2 distinct round indices.
  const i1 = Math.floor(rand() * nRounds);
  let i2 = Math.floor(rand() * nRounds);
  if (i2 === i1) i2 = (i2 + 1) % nRounds;
  for (const ri of [i1, i2]) {
    const round = out[ri];
    const dual = !!round.courtB;
    const active = dual
      ? [...round.teamA, ...round.teamB, ...round.courtB!.teamA, ...round.courtB!.teamB]
      : [...round.teamA, ...round.teamB];
    const configs = enumerateRoundConfigs(active, round.rest, avoidPairs, dual);
    if (configs.length === 0) continue;
    const pick = configs[Math.floor(rand() * configs.length)];
    out[ri] = pick;
  }
  return out;
}
