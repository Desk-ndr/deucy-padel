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
 */
export function computeBlitzConfig(
  numPlayers: number,
  totalMinutes: number
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
    const playSec = totalMinutes * 60 - (r - 1) * PAUSE_BETWEEN_ROUNDS_SEC;
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
 * Get all valid configurations for display
 */
export function getAllBlitzConfigs(
  numPlayers: number,
  totalMinutes: number
): { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number }[] {
  if (numPlayers < 5) return [];

  const g = gcd(numPlayers, 4);
  const minK = 4 / g;
  const configs: { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number }[] = [];

  for (let mult = 1; mult <= 20; mult++) {
    const k = minK * mult;
    const r = (numPlayers * k) / 4;
    // Reserve (r-1) pauses worth of time, then split the rest across r rounds.
    const playSec = totalMinutes * 60 - (r - 1) * PAUSE_BETWEEN_ROUNDS_SEC;
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
 * Generate the round-robin schedule. avoidPair is an optional [a, b] tuple
 * of player indices that the algorithm will try VERY hard to keep on
 * opposite teams every round. Used to keep the two top-ranked players
 * apart so games stay competitive.
 */
export function generateSchedule(
  numPlayers: number,
  totalRounds: number,
  avoidPair?: [number, number] | null,
): BlitzRoundSchedule[] {
  // Run multiple attempts with different seeds and pick the schedule with fewest repeated partners
  let bestSchedule: BlitzRoundSchedule[] = [];
  let bestPartnerRepeats = Infinity;

  for (let attempt = 0; attempt < 10; attempt++) {
    const schedule = generateScheduleAttempt(numPlayers, totalRounds, attempt, avoidPair ?? null);
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

function generateScheduleAttempt(numPlayers: number, totalRounds: number, attemptSeed: number, avoidPair: [number, number] | null): BlitzRoundSchedule[] {
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

    const bestSplit = findBestSplit(chosen, partnerCount, opponentCount, seededRandom, avoidPair);

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
  avoidPair: [number, number] | null = null,
): { teamA: [number, number]; teamB: [number, number] } {
  const [a, b, c, d] = players;
  const splits: [number, number, number, number][] = [
    [a, b, c, d],
    [a, c, b, d],
    [a, d, b, c],
  ];

  // Pre-compute whether both members of avoidPair are in this group of 4.
  // If only one (or none) is here, the constraint can't fire — skip.
  const bothPresent = avoidPair !== null
    && players.includes(avoidPair[0]) && players.includes(avoidPair[1]);
  const TOP_PAIR_PENALTY = 1000; // enough to dominate any partner/opponent score

  let bestScore = Infinity;
  let bestSplit = splits[0];

  for (const [p1, p2, p3, p4] of splits) {
    // Heavily penalize repeated partners (10x weight)
    const partnerPenalty = (partnerCount[p1][p2] + partnerCount[p3][p4]) * 10;
    const opponentPenalty =
      opponentCount[p1][p3] + opponentCount[p1][p4] +
      opponentCount[p2][p3] + opponentCount[p2][p4];
    // Soft constraint: huge penalty if the avoidPair lands on the same team
    let topPairPenalty = 0;
    if (bothPresent) {
      const teamA = [p1, p2];
      const teamB = [p3, p4];
      const sameTeamA = teamA.includes(avoidPair![0]) && teamA.includes(avoidPair![1]);
      const sameTeamB = teamB.includes(avoidPair![0]) && teamB.includes(avoidPair![1]);
      if (sameTeamA || sameTeamB) topPairPenalty = TOP_PAIR_PENALTY;
    }
    const score = partnerPenalty + opponentPenalty + topPairPenalty;
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
