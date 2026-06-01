// Dynamic schedule generator for blitz tournaments with any number of players (2v2 format)

export interface BlitzRoundSchedule {
  teamA: [number, number];
  teamB: [number, number];
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
  pauseSec: number = PAUSE_BETWEEN_ROUNDS_SEC
): { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number } | null {
  if (numPlayers < 5) return null;

  const g = gcd(numPlayers, 4);
  const minK = 4 / g; // smallest K where N*K % 4 == 0

  // Try multiples of minK, pick best where round duration is 5-20 min
  let bestConfig: { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number } | null = null;

  for (let mult = 1; mult <= 20; mult++) {
    const k = minK * mult;
    const r = (numPlayers * k) / 4;
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
  pauseSec: number = PAUSE_BETWEEN_ROUNDS_SEC
): { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number }[] {
  if (numPlayers < 5) return [];

  const g = gcd(numPlayers, 4);
  const minK = 4 / g;
  const configs: { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number }[] = [];

  for (let mult = 1; mult <= 20; mult++) {
    const k = minK * mult;
    const r = (numPlayers * k) / 4;
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
): BlitzRoundSchedule[] {
  // Run multiple attempts with different seeds and pick the schedule with fewest repeated partners
  let bestSchedule: BlitzRoundSchedule[] = [];
  let bestPartnerRepeats = Infinity;

  for (let attempt = 0; attempt < 10; attempt++) {
    const schedule = generateScheduleAttempt(numPlayers, totalRounds, attempt, avoidPairs);
    const repeats = countPartnerRepeats(schedule, numPlayers);
    if (repeats < bestPartnerRepeats) {
      bestPartnerRepeats = repeats;
      bestSchedule = schedule;
    }
    if (repeats === 0) break; // Perfect — no repeated partners
  }

  return bestSchedule;
}

/** Count how many times any pair plays together as partners more than once */
function countPartnerRepeats(schedule: BlitzRoundSchedule[], numPlayers: number): number {
  const pc: number[][] = Array.from({ length: numPlayers }, () => new Array(numPlayers).fill(0));
  for (const round of schedule) {
    pc[round.teamA[0]][round.teamA[1]]++;
    pc[round.teamA[1]][round.teamA[0]]++;
    pc[round.teamB[0]][round.teamB[1]]++;
    pc[round.teamB[1]][round.teamB[0]]++;
  }
  let repeats = 0;
  for (let i = 0; i < numPlayers; i++) {
    for (let j = i + 1; j < numPlayers; j++) {
      if (pc[i][j] > 1) repeats += pc[i][j] - 1;
    }
  }
  return repeats;
}

function generateScheduleAttempt(numPlayers: number, totalRounds: number, attemptSeed: number, avoidPairs: Array<[number, number]>): BlitzRoundSchedule[] {
  const targetGames = (totalRounds * 4) / numPlayers;
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

    let pool = eligible.length >= 4 ? eligible :
      Array.from({ length: numPlayers }, (_, i) => i);

    pool.sort((a, b) => playCounts[a] - playCounts[b]);

    const minPlays = playCounts[pool[0]];
    const mustPlay = pool.filter(p => playCounts[p] === minPlays);
    const canPlay = pool.filter(p => playCounts[p] > minPlays && playCounts[p] < targetGames);

    let chosen: number[];

    if (mustPlay.length >= 4) {
      chosen = pickBestFour(mustPlay, partnerCount, opponentCount, seededRandom);
    } else {
      const remaining = 4 - mustPlay.length;
      const fillers = pickBestFillers(mustPlay, canPlay.length > 0 ? canPlay : pool.filter(p => !mustPlay.includes(p)), remaining, partnerCount, opponentCount, seededRandom);
      chosen = [...mustPlay, ...fillers];
    }

    const bestSplit = findBestSplit(chosen, partnerCount, opponentCount, seededRandom, avoidPairs);

    const rest = Array.from({ length: numPlayers }, (_, i) => i).filter(i => !chosen.includes(i));

    schedule.push({
      teamA: [bestSplit.teamA[0], bestSplit.teamA[1]],
      teamB: [bestSplit.teamB[0], bestSplit.teamB[1]],
      rest,
    });

    for (const idx of chosen) playCounts[idx]++;
    partnerCount[bestSplit.teamA[0]][bestSplit.teamA[1]]++;
    partnerCount[bestSplit.teamA[1]][bestSplit.teamA[0]]++;
    partnerCount[bestSplit.teamB[0]][bestSplit.teamB[1]]++;
    partnerCount[bestSplit.teamB[1]][bestSplit.teamB[0]]++;
    for (const a of bestSplit.teamA) {
      for (const b of bestSplit.teamB) {
        opponentCount[a][b]++;
        opponentCount[b][a]++;
      }
    }
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
