import type { CSSProperties, ReactNode } from 'react';
import { colors, radius, shadows } from '@/lib/design-tokens';

interface HeroCardProps {
  children: ReactNode;
  /** Glow color variant */
  glow?: 'primary' | 'accent' | 'destructive' | 'none';
  /** Optional click handler */
  onClick?: () => void;
  /** Extra inline styles */
  style?: CSSProperties;
}

const glowMap = {
  primary: {
    background: `radial-gradient(circle at center, ${colors.primaryMuted} 0%, transparent 70%), ${colors.surface}`,
    boxShadow: shadows.heroGlow,
    border: `1px solid ${colors.border}`,
  },
  accent: {
    background: `radial-gradient(circle at center, ${colors.accentMuted} 0%, transparent 70%), ${colors.surface}`,
    boxShadow: shadows.liveGlow,
    border: `1px solid ${colors.border}`,
  },
  destructive: {
    background: `radial-gradient(circle at center, ${colors.destructiveMuted} 0%, transparent 70%), ${colors.surface}`,
    boxShadow: shadows.dangerGlow,
    border: `1px solid ${colors.border}`,
  },
  none: {
    background: colors.surface,
    boxShadow: shadows.none,
    border: `1px solid ${colors.border}`,
  },
} as const;

export default function HeroCard({ children, glow = 'primary', onClick, style }: HeroCardProps) {
  const glowStyles = glowMap[glow];

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: radius.lg,
        padding: 16,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        ...glowStyles,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
