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

  for (let r = 0; r < totalRounds; r++) {
    // Pick 4 players who have played the fewest games (and still under targetGames)
    const eligible = Array.from({ length: numPlayers }, (_, i) => i)
      .filter(i => playCounts[i] < targetGames);

    // Sort by play count ascending, then by index for stability
    eligible.sort((a, b) => playCounts[a] - playCounts[b] || a - b);

    const chosen = eligible.slice(0, 4);

    if (chosen.length < 4) {
      // Fallback: pick from all players with fewest games
      const all = Array.from({ length: numPlayers }, (_, i) => i)
        .sort((a, b) => playCounts[a] - playCounts[b]);
      chosen.length = 0;
      chosen.push(...all.slice(0, 4));
    }

    // Find best team split to minimize repeated partners/opponents
    const bestSplit = findBestSplit(chosen, partnerCount, opponentCount);

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

function findBestSplit(
  players: number[],
  partnerCount: number[][],
  opponentCount: number[][]
): { teamA: [number, number]; teamB: [number, number] } {
  // 3 possible ways to split 4 players into 2 teams of 2
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
    if (score < bestScore) {
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
