// Dynamic schedule generator for blitz tournaments with any number of players (2v2 format)

export interface BlitzRoundSchedule {
  teamA: [number, number];
  teamB: [number, number];
  rest: number[];
}

/**
 * Given N players playing 2v2 (4 active per round), compute valid configurations
 * where every player plays exactly K rounds.
 * Total rounds R = N*K/4, so N*K must be divisible by 4.
 */
export function computeBlitzConfig(
  numPlayers: number,
  totalMinutes: number
): { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number } | null {
  if (numPlayers < 4) return null;

  const g = gcd(numPlayers, 4);
  const minK = 4 / g; // smallest K where N*K % 4 == 0

  // Try multiples of minK, pick best where round duration is 5-20 min
  let bestConfig: { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number } | null = null;

  for (let mult = 1; mult <= 20; mult++) {
    const k = minK * mult;
    const r = (numPlayers * k) / 4;
    const roundSec = Math.floor((totalMinutes * 60) / r);
    if (roundSec < 180) break; // less than 3 min per round is too short
    if (roundSec >= 300 && roundSec <= 1200) {
      // 5-20 min is ideal
      bestConfig = { totalRounds: r, gamesPerPlayer: k, roundDurationSeconds: roundSec };
      // Prefer the first one in the sweet spot (most games per player with reasonable duration)
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
  if (numPlayers < 4) return [];

  const g = gcd(numPlayers, 4);
  const minK = 4 / g;
  const configs: { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number }[] = [];

  for (let mult = 1; mult <= 20; mult++) {
    const k = minK * mult;
    const r = (numPlayers * k) / 4;
    const roundSec = Math.floor((totalMinutes * 60) / r);
    if (roundSec < 180) break; // stop when rounds get too short
    configs.push({ totalRounds: r, gamesPerPlayer: k, roundDurationSeconds: roundSec });
  }

  return configs;
}

/**
 * Generate a balanced schedule for N players, R rounds, 4 active per round.
 * Each player must play exactly K = R*4/N rounds.
 */
export function generateSchedule(numPlayers: number, totalRounds: number): BlitzRoundSchedule[] {
  const targetGames = (totalRounds * 4) / numPlayers;
  const playCounts = new Array(numPlayers).fill(0);
  const schedule: BlitzRoundSchedule[] = [];

  // Track partner and opponent pairings to minimize repeats
  const partnerCount: number[][] = Array.from({ length: numPlayers }, () => new Array(numPlayers).fill(0));
  const opponentCount: number[][] = Array.from({ length: numPlayers }, () => new Array(numPlayers).fill(0));

  // Use seeded randomness for reproducibility but varied results
  let seed = numPlayers * 1000 + totalRounds;
  const seededRandom = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let r = 0; r < totalRounds; r++) {
    // Get eligible players (under target games)
    const eligible = Array.from({ length: numPlayers }, (_, i) => i)
      .filter(i => playCounts[i] < targetGames);

    let pool = eligible.length >= 4 ? eligible :
      Array.from({ length: numPlayers }, (_, i) => i);

    // Sort by fewest games first
    pool.sort((a, b) => playCounts[a] - playCounts[b]);

    // Among players with the same (lowest) play count, pick the best 4
    // by evaluating all combinations and choosing the one with least repeated pairings
    const minPlays = playCounts[pool[0]];
    const mustPlay = pool.filter(p => playCounts[p] === minPlays);
    const canPlay = pool.filter(p => playCounts[p] > minPlays && playCounts[p] < targetGames);

    let chosen: number[];

    if (mustPlay.length >= 4) {
      // Pick best 4 from mustPlay group considering pairing diversity
      chosen = pickBestFour(mustPlay, partnerCount, opponentCount, seededRandom);
    } else {
      // Must include all mustPlay, fill remaining from canPlay
      const remaining = 4 - mustPlay.length;
      const fillers = pickBestFillers(mustPlay, canPlay.length > 0 ? canPlay : pool.filter(p => !mustPlay.includes(p)), remaining, partnerCount, opponentCount, seededRandom);
      chosen = [...mustPlay, ...fillers];
    }

    // Find best team split to minimize repeated partners/opponents, with randomized tie-breaking
    const bestSplit = findBestSplit(chosen, partnerCount, opponentCount, seededRandom);

    const rest = Array.from({ length: numPlayers }, (_, i) => i).filter(i => !chosen.includes(i));

    schedule.push({
      teamA: [bestSplit.teamA[0], bestSplit.teamA[1]],
      teamB: [bestSplit.teamB[0], bestSplit.teamB[1]],
      rest,
    });

    // Update counts
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

/** Score how "fresh" a group of 4 players is — lower = less repeated pairings */
function groupFreshness(group: number[], partnerCount: number[][], opponentCount: number[][]): number {
  let score = 0;
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      score += partnerCount[group[i]][group[j]] + opponentCount[group[i]][group[j]];
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

  // For small pools, try all combinations; for larger ones, sample randomly
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

  // For larger pools, sample 200 random combinations
  let bestGroup = pool.slice(0, 4);
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 200; attempt++) {
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
    // Try all combinations
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

  // Sample approach for large pools
  let bestFillers = candidates.slice(0, count);
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 200; attempt++) {
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
  rand: () => number
): { teamA: [number, number]; teamB: [number, number] } {
  const [a, b, c, d] = players;
  const splits: [number, number, number, number][] = [
    [a, b, c, d],
    [a, c, b, d],
    [a, d, b, c],
  ];

  let bestScore = Infinity;
  let bestSplit = splits[0];

  for (const [p1, p2, p3, p4] of splits) {
    const score =
      partnerCount[p1][p2] + partnerCount[p3][p4] +
      opponentCount[p1][p3] + opponentCount[p1][p4] +
      opponentCount[p2][p3] + opponentCount[p2][p4];
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
