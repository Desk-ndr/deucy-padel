// ═══════════════════════════════════════════════════════════════════
// Deucy Design System v3 — Tokens
// Single source of truth for colors, spacing, typography, shadows.
// Import from '@/lib/design-tokens' in every UI component.
// ═══════════════════════════════════════════════════════════════════

// ── Colors ────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds
  bg: '#09090B',
  bgSubtle: '#0C0C0F',
  surface: '#111113',
  surfaceElevated: '#18181B',

  // Primary — wins, positive, confirm, active
  primary: '#22C55E',
  primaryMuted: 'rgba(34,197,94,0.08)',
  primaryGlow: 'rgba(34,197,94,0.25)',

  // Destructive — losses, urgent, timer danger
  destructive: '#EF4444',
  destructiveMuted: 'rgba(239,68,68,0.08)',
  destructiveGlow: 'rgba(239,68,68,0.25)',

  // Accent — bets, auction, energy
  accent: '#F59E0B',
  accentMuted: 'rgba(245,158,11,0.08)',
  accentGlow: 'rgba(245,158,11,0.15)',

  // Info — neutral, rest, secondary info
  info: '#38BDF8',
  infoMuted: 'rgba(56,189,248,0.08)',

  // Medals
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',

  // Text
  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  muted: '#52525B',

  // Borders
  border: '#1E1E22',
  borderLight: '#2A2A2E',
} as const;

export type ColorKey = keyof typeof colors;

// ── Spacing ───────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// ── Border Radius ─────────────────────────────────────────────────

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 9999,
} as const;

// ── Typography ────────────────────────────────────────────────────

export const fonts = {
  sans: "-apple-system, 'Inter', system-ui, sans-serif",
  mono: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
  brand: "Georgia, 'Times New Roman', serif",
} as const;

/** Type scale — use these for consistent sizing */
export const typeScale = {
  /** Timer, score, balance hero: 48-56px, weight 900, monospace */
  display: {
    fontSize: 48,
    fontWeight: 900 as const,
    fontFamily: fonts.mono,
    letterSpacing: '-0.03em',
    lineHeight: 1,
  },
  /** Section headers: 20-24px, weight 800 */
  headline: {
    fontSize: 22,
    fontWeight: 800 as const,
    fontFamily: fonts.sans,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  /** Card titles, names: 16-18px, weight 700 */
  title: {
    fontSize: 16,
    fontWeight: 700 as const,
    fontFamily: fonts.sans,
    letterSpacing: '0',
    lineHeight: 1.3,
  },
  /** Body text: 14px, weight 500 */
  body: {
    fontSize: 14,
    fontWeight: 500 as const,
    fontFamily: fonts.sans,
    letterSpacing: '0',
    lineHeight: 1.5,
  },
  /** Labels, badges: 11-12px, weight 600, uppercase */
  caption: {
    fontSize: 14,
    fontWeight: 600 as const,
    fontFamily: fonts.sans,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    lineHeight: 1.2,
  },
  /** Micro labels: 10px, weight 700, uppercase */
  micro: {
    fontSize: 14,
    fontWeight: 700 as const,
    fontFamily: fonts.sans,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    lineHeight: 1.2,
  },
  /** Monospace numbers (non-display): 14-16px, weight 800 */
  mono: {
    fontSize: 15,
    fontWeight: 800 as const,
    fontFamily: fonts.mono,
    letterSpacing: '-0.02em',
    lineHeight: 1,
  },
} as const;

// ── Shadows ───────────────────────────────────────────────────────

export const shadows = {
  /** Hero card glow (primary green) */
  heroGlow: '0 0 40px rgba(34,197,94,0.12), 0 0 80px rgba(34,197,94,0.06)',
  /** Live card glow (accent amber) */
  liveGlow: '0 0 30px rgba(245,158,11,0.12), 0 0 60px rgba(245,158,11,0.06)',
  /** Destructive glow (timer danger) */
  dangerGlow: '0 0 30px rgba(239,68,68,0.15), 0 0 60px rgba(239,68,68,0.08)',
  /** Subtle card elevation */
  cardElevation: '0 2px 8px rgba(0,0,0,0.3)',
  /** No shadow */
  none: 'none',
} as const;

// ── Animations (CSS keyframe names) ───────────────────────────────
// Inject these in a global <style> tag once in the app shell.

export const animationCSS = `
@keyframes livePulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(34,197,94,0.6); }
  50% { opacity: 0.5; box-shadow: 0 0 4px rgba(34,197,94,0.3); }
}
@keyframes timerPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
}
@keyframes confettiFall {
  0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
@keyframes trophyEntrance {
  0% { transform: scale(0) rotate(-15deg); opacity: 0; }
  60% { transform: scale(1.15) rotate(5deg); opacity: 1; }
  80% { transform: scale(0.95) rotate(-2deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes winnerGlow {
  0%, 100% { box-shadow: 0 0 20px rgba(34,197,94,0.2), 0 0 60px rgba(34,197,94,0.1); }
  50% { box-shadow: 0 0 40px rgba(34,197,94,0.4), 0 0 80px rgba(34,197,94,0.2); }
}
@keyframes fadeSlideUp {
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes scaleIn {
  0% { transform: scale(0.95); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}
`;

// ── Helpers ───────────────────────────────────────────────────────

/** Format cents (integer) to display string: 1800 → "€18", 1850 → "€18.50" */
export function formatBalance(cents: number): string {
  const euros = (cents / 100).toFixed(2);
  return euros.endsWith('.00') ? `€${parseInt(euros)}` : `€${euros}`;
}

/** Format cents with explicit sign: +€6 / -€6 */
export function formatBalanceSigned(cents: number): string {
  const prefix = cents > 0 ? '+' : '';
  return `${prefix}${formatBalance(cents)}`;
}

/** Get color for a balance amount */
export function balanceColor(cents: number): string {
  if (cents > 0) return colors.primary;
  if (cents < 0) return colors.destructive;
  return colors.muted;
}
