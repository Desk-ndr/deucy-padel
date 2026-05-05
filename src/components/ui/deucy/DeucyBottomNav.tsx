import { colors, spacing, fonts } from '@/lib/design-tokens';

export type DeucyTab = 'home' | 'match' | 'leaderboard' | 'calendar';

interface DeucyBottomNavProps {
  activeTab: DeucyTab;
  onTabChange: (tab: DeucyTab) => void;
  /** Show red notification dot on a tab */
  notifications?: Partial<Record<DeucyTab, boolean>>;
}

const tabs: { id: DeucyTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'match', label: 'Match' },
  { id: 'leaderboard', label: 'Standings' },
  { id: 'calendar', label: 'Schedule' },
];

function TabIcon({ tabId, active }: { tabId: DeucyTab; active: boolean }) {
  const color = active ? colors.primary : colors.textSecondary;
  const fill = active ? color : 'none';
  const sw = active ? 1.5 : 2;

  switch (tabId) {
    case 'home':
      return (
        <svg width={24} height={24} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'match':
      return (
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    case 'leaderboard':
      return (
        <svg width={24} height={24} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22h10c0-2-.85-3.25-2.03-3.79A1.07 1.07 0 0 1 14 17v-2.34" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg width={24} height={24} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    default:
      return null;
  }
}

export default function DeucyBottomNav({ activeTab, onTabChange, notifications = {} }: DeucyBottomNavProps) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: 430,
        margin: '0 auto',
        backgroundColor: colors.surface,
        borderTop: `1px solid ${colors.border}`,
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        paddingTop: spacing.md,
        display: 'flex',
        justifyContent: 'space-around',
        zIndex: 1000,
      }}
    >
      {tabs.map(({ id, label }) => {
        const isActive = activeTab === id;
        const hasNotification = notifications[id];

        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: spacing.xs,
              padding: 0,
              position: 'relative',
              minWidth: 56,
            }}
          >
            {/* Active dot */}
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  top: -8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: colors.primary,
                }}
              />
            )}

            {/* Icon wrapper with notification dot */}
            <div style={{ position: 'relative' }}>
              <TabIcon tabId={id} active={isActive} />
              {hasNotification && (
                <div
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -4,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: colors.destructive,
                    border: `1.5px solid ${colors.surface}`,
                  }}
                />
              )}
            </div>

            {/* Label */}
            <span
              style={{
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? colors.primary : colors.textSecondary,
                fontFamily: fonts.sans,
                lineHeight: 1,
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
