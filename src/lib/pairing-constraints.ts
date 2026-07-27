/**
 * Fixed "weak triple" — players who should not be paired together as
 * teammates. Applied as avoidPairs on all pair combinations of members
 * that are actually present in a tournament's pool.
 *
 * Constraint level: SOFT — the schedule generator will prefer splits
 * that respect these pairs, but will fall back to allowing them if no
 * valid alternative exists (small tournaments, unavoidable rounds).
 *
 * To update the list: change the IDs below. Existing tournaments are
 * unaffected (schedule is baked at start time).
 */
export const WEAK_TRIPLE_PLAYER_IDS: readonly string[] = [
  '74db514c-5442-49b9-a0b8-114b72386d70', // José
  'b4809e8c-6f3e-434f-b5ee-9f4d6301d5a8', // Bruno
  '39addd1b-7efd-4423-abf3-66d10b770c4b', // Karim
];

/**
 * Build the list of avoidPairs (as player indices in the pool) that
 * cover every 2-way combination of the WEAK_TRIPLE members present in
 * the current tournament. If fewer than 2 members are present, returns
 * an empty array.
 */
export function buildWeakTripleAvoidPairs(
  players: Array<{ player_id?: string | null }>,
): Array<[number, number]> {
  const indices: number[] = [];
  players.forEach((p, idx) => {
    if (p.player_id && WEAK_TRIPLE_PLAYER_IDS.includes(p.player_id)) {
      indices.push(idx);
    }
  });
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < indices.length; i++) {
    for (let j = i + 1; j < indices.length; j++) {
      pairs.push([indices[i], indices[j]]);
    }
  }
  return pairs;
}
