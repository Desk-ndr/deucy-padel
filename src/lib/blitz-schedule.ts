// Fixed 9-round schedule for 9 players (0-indexed)
// Each round: { teamA: [idx, idx], teamB: [idx, idx], rest: [idx, idx, idx, idx, idx] }
// Every player plays exactly 4 rounds and rests 5 rounds.
export const BLITZ_SCHEDULE = [
  { teamA: [0, 1], teamB: [2, 3], rest: [4, 5, 6, 7, 8] },
  { teamA: [4, 5], teamB: [6, 7], rest: [0, 1, 2, 3, 8] },
  { teamA: [0, 2], teamB: [4, 8], rest: [1, 3, 5, 6, 7] },
  { teamA: [1, 6], teamB: [3, 5], rest: [0, 2, 4, 7, 8] },
  { teamA: [0, 3], teamB: [7, 8], rest: [1, 2, 4, 5, 6] },
  { teamA: [1, 8], teamB: [2, 5], rest: [0, 3, 4, 6, 7] },
  { teamA: [0, 7], teamB: [4, 6], rest: [1, 2, 3, 5, 8] },
  { teamA: [2, 6], teamB: [3, 8], rest: [0, 1, 4, 5, 7] },
  { teamA: [1, 7], teamB: [4, 5], rest: [0, 2, 3, 6, 8] },
];

export const TOTAL_ROUNDS = 9;
export const TOTAL_PLAYERS = 9;
export const ROUND_DURATION_SECONDS = 10 * 60; // 10 minutes
