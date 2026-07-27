/**
 * Fixed player clusters — members of the same cluster should NOT play
 * on the same team. Applied as avoidPairs on all pair combinations of
 * members present in a tournament's pool.
 *
 * Constraint level: SOFT — the schedule generator prefers splits that
 * respect these pairs, and only falls back to allowing them when no
 * valid alternative exists (small tournaments, unavoidable rounds).
 *
 * To update: edit the arrays below. Existing tournaments are
 * unaffected (schedule is baked at start time).
 */

/**
 * Strong triple — top-tier regulars. Prevents any super-team
 * of two strong players from dominating the tournament.
 */
export const STRONG_TRIPLE_PLAYER_IDS: readonly string[] = [
  '1e297df9-6ba7-47ba-a75a-c99118821d6b', // Andrea
  'b88dda85-b931-4c90-8e04-b43215c62984', // Rollo
  '8a1fdf12-9c52-4b0c-bf3d-90904366c861', // Thomas
];

/**
 * Weak triple — bottom-tier regulars. Prevents any team from being
 * too weak; every match stays competitive.
 */
export const WEAK_TRIPLE_PLAYER_IDS: readonly string[] = [
  '74db514c-5442-49b9-a0b8-114b72386d70', // José
  'b4809e8c-6f3e-434f-b5ee-9f4d6301d5a8', // Bruno
  '39addd1b-7efd-4423-abf3-66d10b770c4b', // Karim
];

/** Build C(k,2) avoidPairs from a cluster present in the pool. */
function avoidPairsFromCluster(
  cluster: readonly string[],
  players: Array<{ player_id?: string | null }>,
): Array<[number, number]> {
  const indices: number[] = [];
  players.forEach((p, idx) => {
    if (p.player_id && cluster.includes(p.player_id)) indices.push(idx);
  });
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < indices.length; i++) {
    for (let j = i + 1; j < indices.length; j++) {
      pairs.push([indices[i], indices[j]]);
    }
  }
  return pairs;
}

/**
 * All avoidPairs for the current pool: union of STRONG and WEAK
 * cluster pairings that apply given who's actually playing.
 */
export function buildFixedAvoidPairs(
  players: Array<{ player_id?: string | null }>,
): Array<[number, number]> {
  return [
    ...avoidPairsFromCluster(STRONG_TRIPLE_PLAYER_IDS, players),
    ...avoidPairsFromCluster(WEAK_TRIPLE_PLAYER_IDS, players),
  ];
}
