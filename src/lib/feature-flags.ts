/**
 * Feature flags — central kill-switches for UI features that we want to
 * disable globally without removing the underlying code. Flip the flag
 * here, the UI hides the feature everywhere it appears.
 *
 * Keeping the flag in a single file (rather than per-component constants)
 * means a future re-enable is a one-line change.
 */

// 2026-06-01 — Andrea decided to pause the betting UI: predictions
// during matches and the dedicated leaderboard tab haven't seen much
// engagement in the early tournaments. Backend (blitz_bets table,
// placeBet/cancelBet services) is left untouched so existing bet history
// is preserved and flipping this back to `true` re-enables everything
// without any data migration.
export const BETTING_ENABLED = false;
