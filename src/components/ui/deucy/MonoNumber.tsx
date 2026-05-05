import type { CSSProperties } from 'react';
import { colors, typeScale, formatBalance, formatBalanceSigned } from '@/lib/design-tokens';

interface MonoNumberProps {
  /** Raw value in cents */
  value: number;
  /** Show sign prefix (+/-) */
  signed?: boolean;
  /** Color override (defaults to auto based on value) */
  color?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'display';
  /** Extra inline styles */
  style?: CSSProperties;
}

const sizeMap = {
  sm: { fontSize: 14, fontWeight: 700 as const },
  md: { fontSize: 15, fontWeight: 800 as const },
  lg: { fontSize: 24, fontWeight: 900 as const },
  display: { fontSize: 48, fontWeight: 900 as const },
} as const;

export default function MonoNumber({ value, signed = false, color, size = 'md', style }: MonoNumberProps) {
  const autoColor = value > 0 ? colors.primary : value < 0 ? colors.destructive : colors.muted;
  const displayColor = color ?? autoColor;
  const sizeStyles = sizeMap[size];
  const text = signed ? formatBalanceSigned(value) : formatBalance(value);

  return (
    <span
      style={{
        fontFamily: typeScale.mono.fontFamily,
        letterSpacing: '-0.02em',
        lineHeight: 1,
        color: displayColor,
        ...sizeStyles,
        ...style,
      }}
    >
      {text}
    </span>
  );
}
