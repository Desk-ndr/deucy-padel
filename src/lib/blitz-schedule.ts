// Fixed 12-round schedule for 8 players (0-indexed)
// Each round: { teamA: [idx, idx], teamB: [idx, idx], rest: [idx, idx, idx, idx] }
export const BLITZ_SCHEDULE = [
  { teamA: [0, 1], teamB: [2, 3], rest: [4, 5, 6, 7] },
  { teamA: [4, 5], teamB: [6, 7], rest: [0, 1, 2, 3] },
  { teamA: [0, 2], teamB: [4, 6], rest: [1, 3, 5, 7] },
  { teamA: [1, 3], teamB: [5, 7], rest: [0, 2, 4, 6] },
  { teamA: [0, 3], teamB: [5, 6], rest: [1, 2, 4, 7] },
  { teamA: [1, 2], teamB: [4, 7], rest: [0, 3, 5, 6] },
  { teamA: [0, 4], teamB: [1, 5], rest: [2, 3, 6, 7] },
  { teamA: [2, 6], teamB: [3, 7], rest: [0, 1, 4, 5] },
  { teamA: [0, 5], teamB: [2, 7], rest: [1, 3, 4, 6] },
  { teamA: [1, 6], teamB: [3, 4], rest: [0, 2, 5, 7] },
  { teamA: [0, 6], teamB: [1, 7], rest: [2, 3, 4, 5] },
  { teamA: [2, 4], teamB: [3, 5], rest: [0, 1, 6, 7] },
];

export const TOTAL_ROUNDS = 12;
export const ROUND_DURATION_SECONDS = 9 * 60; // 9 minutes
