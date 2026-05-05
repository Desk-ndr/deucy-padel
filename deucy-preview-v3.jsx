import { useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   Deucy Design System v3 — Live Preview
   All tokens inlined to make this self-contained
   ═══════════════════════════════════════════════════════════════ */

const colors = {
  bg: '#09090B', bgSubtle: '#0C0C0F',
  surface: '#111113', surfaceElevated: '#18181B',
  primary: '#22C55E', primaryMuted: 'rgba(34,197,94,0.08)', primaryGlow: 'rgba(34,197,94,0.25)',
  destructive: '#EF4444', destructiveMuted: 'rgba(239,68,68,0.08)',
  accent: '#F59E0B', accentMuted: 'rgba(245,158,11,0.08)',
  info: '#38BDF8', infoMuted: 'rgba(56,189,248,0.08)',
  gold: '#FFD700', silver: '#C0C0C0', bronze: '#CD7F32',
  text: '#FAFAFA', textSecondary: '#A1A1AA', muted: '#52525B',
  border: '#1E1E22', borderLight: '#2A2A2E',
};

const sp = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
const rad = { sm: 8, md: 12, lg: 16, pill: 9999 };
const fonts = {
  sans: "-apple-system, 'Inter', system-ui, sans-serif",
  mono: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
  brand: "Georgia, 'Times New Roman', serif",
};

const animCSS = `
@keyframes livePulse {
  0%,100%{opacity:1;box-shadow:0 0 8px rgba(34,197,94,0.6)}
  50%{opacity:.5;box-shadow:0 0 4px rgba(34,197,94,0.3)}
}
@keyframes timerPulse {
  0%,100%{opacity:1}50%{opacity:.6}
}
@keyframes scaleIn {
  0%{transform:scale(.95);opacity:.8}100%{transform:scale(1);opacity:1}
}
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; }
`;

/* ── Mock Data ─────────────────────────────────────────────── */
const PLAYERS = [
  { name: 'Marco', balance: 24 },
  { name: 'Luca', balance: 18 },
  { name: 'Andrea', balance: 15 },
  { name: 'Giulia', balance: 12 },
  { name: 'Sara', balance: 9 },
  { name: 'Davide', balance: 6 },
  { name: 'Elena', balance: 3 },
  { name: 'Fabio', balance: 0 },
];

const SCHEDULE = [
  { teamA: [0, 1], teamB: [2, 3], rest: [4, 5, 6, 7] },
  { teamA: [4, 5], teamB: [6, 7], rest: [0, 1, 2, 3] },
  { teamA: [0, 2], teamB: [1, 4], rest: [3, 5, 6, 7] },
  { teamA: [3, 6], teamB: [5, 7], rest: [0, 1, 2, 4] },
  { teamA: [1, 5], teamB: [0, 6], rest: [2, 3, 4, 7] },
  { teamA: [2, 7], teamB: [3, 4], rest: [0, 1, 5, 6] },
];

const ROUNDS = [
  { round_index: 1, status: 'completed', team_a_score: 6, team_b_score: 3 },
  { round_index: 2, status: 'completed', team_a_score: 4, team_b_score: 6 },
  { round_index: 3, status: 'live', team_a_score: null, team_b_score: null },
];

/* ── Shared UI Components ──────────────────────────────────── */

function HeroCard({ glow = 'primary', children, onClick, style }) {
  const glowMap = {
    primary: { bg: `radial-gradient(ellipse at 50% 0%, ${colors.primaryMuted} 0%, transparent 70%)`, shadow: `0 0 40px ${colors.primaryGlow}` },
    accent: { bg: `radial-gradient(ellipse at 50% 0%, ${colors.accentMuted} 0%, transparent 70%)`, shadow: `0 0 30px ${colors.accentMuted}` },
    none: { bg: 'none', shadow: 'none' },
  };
  const g = glowMap[glow] || glowMap.primary;
  return (
    <div onClick={onClick} style={{
      background: g.bg, backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`, borderRadius: rad.md,
      padding: sp.lg, boxShadow: g.shadow, cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s', ...style,
    }}>{children}</div>
  );
}

function LiveBadge({ size = 'md' }) {
  const sz = size === 'sm' ? 6 : 8;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: sp.xs }}>
      <div style={{
        width: sz, height: sz, borderRadius: '50%', backgroundColor: colors.primary,
        animation: 'livePulse 2s ease-in-out infinite',
      }} />
      {size !== 'sm' && (
        <span style={{ fontSize: 14, fontWeight: 700, color: colors.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          LIVE
        </span>
      )}
    </div>
  );
}

function TimerRing({ timeLeft, totalTime, size = 120 }) {
  const cx = size / 2, cy = size / 2, r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const offset = circ * (1 - progress);
  const urgent = timeLeft <= 60;
  const col = urgent ? colors.destructive : colors.primary;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.border} strokeWidth={4} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 6px ${col})` }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: fonts.mono, fontWeight: 900, fontSize: size * 0.28, color: col, letterSpacing: '-0.03em',
        animation: urgent ? 'timerPulse 1s ease-in-out infinite' : 'none',
      }}>
        {mins}:{String(secs).padStart(2, '0')}
      </div>
    </div>
  );
}

/* ── Tab Icons ─────────────────────────────────────────────── */

function TabIcon({ id, active }) {
  const c = active ? colors.primary : colors.textSecondary;
  const f = active ? c : 'none';
  const sw = active ? 1.5 : 2;
  const icons = {
    home: <svg width={24} height={24} viewBox="0 0 24 24" fill={f} stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    match: <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
    leaderboard: <svg width={24} height={24} viewBox="0 0 24 24" fill={f} stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22h10c0-2-.85-3.25-2.03-3.79A1.07 1.07 0 0 1 14 17v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>,
    calendar: <svg width={24} height={24} viewBox="0 0 24 24" fill={f} stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  };
  return icons[id] || null;
}

/* ═══════════════════════════════════════════════════════════════
   SCREENS
   ═══════════════════════════════════════════════════════════════ */

/* ── Home Screen ───────────────────────────────────────────── */

function HomeScreen({ onNavigate }) {
  return (
    <div style={{ padding: sp.lg }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: sp.xl }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: sp.sm }}>
          <span style={{ fontSize: 28, fontWeight: 900, fontStyle: 'italic', fontFamily: fonts.brand, color: colors.text }}>deucy</span>
          <LiveBadge size="sm" />
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', backgroundColor: colors.surfaceElevated,
          border: `2px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: colors.text,
        }}>A</div>
      </div>

      {/* Live tournament card */}
      <HeroCard glow="primary" onClick={() => onNavigate('match')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: sp.md }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: colors.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Active blitz</span>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: '4px 0 0', fontFamily: fonts.sans }}>Saturday Blitz</h3>
          </div>
          <LiveBadge />
        </div>
        <div style={{ display: 'flex', gap: sp.xl, marginBottom: sp.lg }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block' }}>Players</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>{PLAYERS.length}</span>
          </div>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block' }}>Round</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>3/{SCHEDULE.length}</span>
          </div>
        </div>
        <button style={{
          width: '100%', padding: sp.md, backgroundColor: colors.primary, color: colors.bg,
          border: 'none', borderRadius: rad.sm, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: fonts.sans,
        }}>Join match →</button>
      </HeroCard>

      {/* Past tournaments */}
      <div style={{ marginTop: sp.lg, display: 'flex', flexDirection: 'column', gap: sp.sm }}>
        {['Friday Night', 'Weekend Open'].map((name, i) => (
          <div key={i} style={{
            padding: sp.md, backgroundColor: colors.surfaceElevated, borderRadius: rad.md,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6,
          }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: colors.text, fontFamily: fonts.sans }}>{name}</span>
              <span style={{ display: 'block', fontSize: 14, color: colors.muted, marginTop: 2 }}>
                {6 + i * 2} players · Finished
              </span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: colors.primary, letterSpacing: '0.06em' }}>Completed</span>
          </div>
        ))}
      </div>

      {/* New blitz button */}
      <button style={{
        width: '100%', padding: sp.md, backgroundColor: 'transparent',
        border: `2px solid ${colors.primary}`, borderRadius: rad.sm,
        color: colors.primary, fontSize: 14, fontWeight: 700, cursor: 'pointer',
        fontFamily: fonts.sans, marginTop: sp.lg,
      }}>+ New Blitz</button>
    </div>
  );
}


/* ── Betting Card Preview ──────────────────────────────────── */

function BettingCardPreview({ schedule }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedStake, setSelectedStake] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const stakePresets = [1, 3, 5];
  const restPlayer = PLAYERS[schedule.rest[0]];
  const balance = restPlayer?.balance || 12;

  if (confirmed) {
    return (
      <div style={{
        backgroundColor: colors.surface, border: `1px solid ${colors.border}`,
        borderRadius: rad.md, padding: sp.lg,
        display: 'flex', flexDirection: 'column', gap: sp.md,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: sp.sm }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.primary}
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>Prediction Placed</span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: sp.md, backgroundColor: colors.bg, borderRadius: rad.sm,
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: sp.xs }}>
            <span style={{ fontSize: 14, color: colors.muted }}>Your pick</span>
            <span style={{ fontFamily: fonts.mono, fontWeight: 800, fontSize: 14, color: selectedTeam === 'A' ? colors.primary : colors.accent }}>
              Team {selectedTeam}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: sp.xs }}>
            <span style={{ fontSize: 14, color: colors.muted }}>Stake</span>
            <span style={{ fontFamily: fonts.mono, fontWeight: 800, fontSize: 14, color: colors.text }}>
              {'€'}{selectedStake}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: sp.sm, padding: sp.sm }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colors.primary, animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 14, color: colors.muted }}>Waiting for result</span>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: colors.surface, border: `1px solid ${colors.border}`,
      borderRadius: rad.md, padding: sp.lg,
      display: 'flex', flexDirection: 'column', gap: sp.lg,
    }}>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: 0 }}>Prediction Card</h3>
        <p style={{ fontSize: 14, color: colors.muted, margin: `${sp.xs}px 0 0` }}>
          You are resting this round. Place your prediction.
        </p>
      </div>

      {/* Team selection */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: sp.md }}>
        {['A', 'B'].map(team => {
          const teamColor = team === 'A' ? colors.primary : colors.accent;
          const glowColor = team === 'A' ? colors.primaryGlow : `${colors.accent}30`;
          const sel = selectedTeam === team;
          const teamIdx = team === 'A' ? schedule.teamA : schedule.teamB;
          return (
            <button key={team} onClick={() => setSelectedTeam(team)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: sp.sm, padding: sp.md,
              backgroundColor: sel ? `${teamColor}15` : colors.bg,
              border: `2px solid ${sel ? teamColor : colors.border}`,
              borderRadius: rad.md, cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: sel ? `0 0 20px ${glowColor}` : 'none',
              position: 'relative',
            }}>
              {sel && (
                <div style={{
                  position: 'absolute', top: 8, right: 8, width: 20, height: 20,
                  borderRadius: '50%', backgroundColor: teamColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.bg}
                    strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
              <span style={{ fontSize: 14, fontWeight: 800, color: sel ? teamColor : colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Team {team}
              </span>
              {teamIdx.map((idx, i) => (
                <span key={i} style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{PLAYERS[idx].name}</span>
              ))}
            </button>
          );
        })}
      </div>

      {/* Sentiment bar (mock: 2 vs 1) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: sp.xs }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: colors.primary, fontWeight: 700 }}>A: 2</span>
          <span style={{ fontSize: 14, color: colors.muted }}>Predictions</span>
          <span style={{ fontSize: 14, color: colors.accent, fontWeight: 700 }}>B: 1</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.border, display: 'flex' }}>
          <div style={{ width: '67%', height: '100%', backgroundColor: colors.primary, borderRadius: '3px 0 0 3px' }} />
          <div style={{ width: '33%', height: '100%', backgroundColor: colors.accent, borderRadius: '0 3px 3px 0' }} />
        </div>
      </div>

      {/* Stake selection */}
      {selectedTeam && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: sp.sm }}>
          <span style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>Choose your stake</span>
          <div style={{ display: 'flex', gap: sp.sm, justifyContent: 'center' }}>
            {stakePresets.filter(s => s <= balance).map(stake => (
              <button key={stake} onClick={() => setSelectedStake(stake)} style={{
                flex: 1, maxWidth: 80, padding: `${sp.sm}px ${sp.md}px`,
                backgroundColor: selectedStake === stake ? colors.primary : colors.bg,
                color: selectedStake === stake ? colors.bg : colors.text,
                border: `1px solid ${selectedStake === stake ? colors.primary : colors.border}`,
                borderRadius: rad.sm, fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{'€'}{stake}</button>
            ))}
            <button onClick={() => setSelectedStake(balance)} style={{
              flex: 1, maxWidth: 80, padding: `${sp.sm}px ${sp.md}px`,
              backgroundColor: selectedStake === balance ? colors.destructive : colors.bg,
              color: selectedStake === balance ? '#fff' : colors.destructive,
              border: `1px solid ${selectedStake === balance ? colors.destructive : colors.border}`,
              borderRadius: rad.sm, fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>All-in</button>
          </div>
          <span style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>Balance: {'€'}{balance}</span>
        </div>
      )}

      {/* Confirm */}
      {selectedTeam && selectedStake && (
        <button onClick={() => setConfirmed(true)} style={{
          width: '100%', padding: sp.md,
          backgroundColor: colors.primary, color: colors.bg,
          border: 'none', borderRadius: rad.sm,
          fontFamily: fonts.sans, fontWeight: 700, fontSize: 14,
          cursor: 'pointer', transition: 'all 0.15s',
        }}>
          Confirm: {'€'}{selectedStake} on Team {selectedTeam}
        </button>
      )}
    </div>
  );
}
/* ── Match Screen ──────────────────────────────────────────── */

function MatchScreen() {
  const [showScore, setShowScore] = useState(false);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const s = SCHEDULE[2]; // round 3

  return (
    <div style={{ padding: sp.lg, display: 'flex', flexDirection: 'column', gap: sp.lg }}>
      {/* Round counter */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: sp.xs }}>Round</span>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: sp.xs }}>
          <span style={{ fontSize: 36, fontWeight: 900, fontFamily: fonts.mono, color: colors.primary, letterSpacing: '-0.03em' }}>3</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: colors.muted }}>/ 6</span>
        </div>
      </div>

      {/* Teams */}
      <HeroCard glow="primary">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: sp.md, padding: sp.sm }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: sp.sm }}>Team A</span>
            <p style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: 0 }}>{PLAYERS[s.teamA[0]].name}</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: '4px 0 0' }}>{PLAYERS[s.teamA[1]].name}</p>
          </div>
          <span style={{ fontSize: 22, fontWeight: 900, color: colors.muted }}>VS</span>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: sp.sm }}>Team B</span>
            <p style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: 0 }}>{PLAYERS[s.teamB[0]].name}</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: '4px 0 0' }}>{PLAYERS[s.teamB[1]].name}</p>
          </div>
        </div>
      </HeroCard>

      {/* Resting */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: sp.sm }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.info} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        </svg>
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.info, letterSpacing: '0.06em' }}>
          Resting: {s.rest.map(i => PLAYERS[i].name).join(', ')}
        </span>
      </div>

      {/* Timer */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${sp.xl}px 0` }}>
        <TimerRing timeLeft={342} totalTime={480} size={140} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: sp.md, marginTop: sp.lg }}>
          <button style={{
            width: 48, height: 48, borderRadius: '50%', backgroundColor: colors.surfaceElevated,
            border: `2px solid ${colors.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill={colors.text} stroke="none">
              <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          </button>
          <button style={{
            width: 40, height: 40, borderRadius: '50%', backgroundColor: colors.surfaceElevated,
            border: `1px solid ${colors.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
          </button>
        </div>
      </div>


      {/* Prediction Card (resting player view) */}
      <BettingCardPreview schedule={s} />
      {/* Submit score */}
      {!showScore ? (
        <button onClick={() => setShowScore(true)} style={{
          width: '100%', padding: sp.md, backgroundColor: colors.primary, color: colors.bg,
          border: 'none', borderRadius: rad.sm, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: fonts.sans,
        }}>Submit Score & Next Round →</button>
      ) : (
        <div style={{
          padding: sp.lg, backgroundColor: colors.surface, borderRadius: rad.md,
          border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: sp.md,
        }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: colors.text, textAlign: 'center', margin: 0 }}>Enter Final Score</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'flex-end', gap: sp.md }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: sp.xs }}>
              <label style={{ fontSize: 14, fontWeight: 700, color: colors.muted, textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Team A</label>
              <input type="number" min="0" value={scoreA} onChange={e => setScoreA(e.target.value)} placeholder="0" style={{
                width: '100%', padding: sp.md, backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
                borderRadius: rad.sm, color: colors.text, fontSize: 24, fontWeight: 800, textAlign: 'center',
                fontFamily: fonts.mono, outline: 'none', boxSizing: 'border-box',
              }} />
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: colors.muted, paddingBottom: sp.md }}>—</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: sp.xs }}>
              <label style={{ fontSize: 14, fontWeight: 700, color: colors.muted, textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Team B</label>
              <input type="number" min="0" value={scoreB} onChange={e => setScoreB(e.target.value)} placeholder="0" style={{
                width: '100%', padding: sp.md, backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
                borderRadius: rad.sm, color: colors.text, fontSize: 24, fontWeight: 800, textAlign: 'center',
                fontFamily: fonts.mono, outline: 'none', boxSizing: 'border-box',
              }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: sp.sm }}>
            <button onClick={() => setShowScore(false)} style={{
              flex: 1, padding: sp.md, backgroundColor: colors.surfaceElevated, color: colors.textSecondary,
              border: `1px solid ${colors.border}`, borderRadius: rad.sm, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: fonts.sans,
            }}>Cancel</button>
            <button style={{
              flex: 1, padding: sp.md, backgroundColor: colors.primary, color: colors.bg,
              border: 'none', borderRadius: rad.sm, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: fonts.sans,
              opacity: scoreA && scoreB ? 1 : 0.4,
            }}>Confirm →</button>
          </div>
        </div>
      )}

      {/* Completed rounds */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: sp.sm }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Completed Rounds</span>
        {ROUNDS.filter(r => r.status === 'completed').map(r => {
          const sch = SCHEDULE[r.round_index - 1];
          return (
            <div key={r.round_index} style={{
              display: 'flex', alignItems: 'center', gap: sp.sm,
              padding: `${sp.sm}px ${sp.md}px`, backgroundColor: colors.surfaceElevated, borderRadius: rad.sm, fontSize: 14,
            }}>
              <span style={{ fontFamily: fonts.mono, fontSize: 14, fontWeight: 800, color: colors.muted, minWidth: 28 }}>R{r.round_index}</span>
              <span style={{ flex: 1, color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                {PLAYERS[sch.teamA[0]].name} & {PLAYERS[sch.teamA[1]].name}
              </span>
              <span style={{ fontFamily: fonts.mono, fontWeight: 800, fontSize: 14, color: colors.primary, minWidth: 44, textAlign: 'center' }}>
                {r.team_a_score} - {r.team_b_score}
              </span>
              <span style={{ flex: 1, color: colors.textSecondary, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                {PLAYERS[sch.teamB[0]].name} & {PLAYERS[sch.teamB[1]].name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Leaderboard Screen ────────────────────────────────────── */

function LeaderboardScreen() {
  const [expanded, setExpanded] = useState(null);
  const medalColors = [colors.gold, colors.silver, colors.bronze];
  const sorted = [...PLAYERS].sort((a, b) => b.balance - a.balance);

  return (
    <div style={{ padding: sp.lg, display: 'flex', flexDirection: 'column', gap: sp.xl }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: 0, fontFamily: fonts.sans }}>Standings</h2>

      {/* Podium */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: sp.xl, paddingTop: sp.lg }}>
        {[1, 0, 2].map(rank => {
          const p = sorted[rank];
          const col = medalColors[rank];
          const tall = rank === 0;
          return (
            <div key={rank} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: sp.xs,
              marginBottom: tall ? 0 : sp.lg,
            }}>
              <div style={{
                width: tall ? 56 : 48, height: tall ? 56 : 48, borderRadius: '50%',
                border: `3px solid ${col}`, backgroundColor: colors.surfaceElevated,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: tall ? 22 : 18, fontWeight: 900, color: col, fontFamily: fonts.sans,
                boxShadow: `0 0 20px ${col}40`,
              }}>{p.name[0]}</div>
              <span style={{ fontSize: 14, fontWeight: 600, color: colors.text, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center' }}>{p.name}</span>
              <span style={{ fontFamily: fonts.mono, fontWeight: 800, fontSize: 14, color: col }}>{'\u20AC'}{p.balance}</span>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: colors.surface, borderRadius: rad.md, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '36px 1fr 48px 72px 24px', alignItems: 'center', gap: sp.sm,
          padding: `${sp.sm}px ${sp.md}px`, borderBottom: `1px solid ${colors.border}`,
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>#</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Player</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right' }}>W</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right' }}>Balance</span>
          <span />
        </div>

        {sorted.map((p, rank) => {
          const isTop3 = rank < 3;
          const isExp = expanded === rank;
          return (
            <div key={rank}>
              <div onClick={() => setExpanded(isExp ? null : rank)} style={{
                display: 'grid', gridTemplateColumns: '36px 1fr 48px 72px 24px', alignItems: 'center', gap: sp.sm,
                padding: `${sp.md}px`, borderBottom: `1px solid ${colors.border}`, cursor: 'pointer',
                backgroundColor: rank === 0 ? colors.primaryMuted : 'transparent',
              }}>
                {isTop3 ? (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', backgroundColor: medalColors[rank],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 900, color: colors.bg,
                  }}>{rank + 1}</div>
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted }}>{rank + 1}</span>
                )}
                <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{p.name}</span>
                <span style={{ fontFamily: fonts.mono, fontSize: 14, fontWeight: 800, color: colors.textSecondary, textAlign: 'right' }}>{Math.floor(p.balance / 3)}</span>
                <span style={{ fontFamily: fonts.mono, fontWeight: 800, fontSize: 14, color: colors.primary, textAlign: 'right' }}>{'\u20AC'}{p.balance}</span>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: isExp ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              {isExp && (
                <div style={{ padding: `${sp.sm}px ${sp.lg}px ${sp.md}px`, backgroundColor: colors.bgSubtle, borderBottom: `1px solid ${colors.border}` }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: sp.sm }}>Transaction Ledger</span>
                  {[
                    { round: 1, type: 'game', label: 'Games won', amount: 6, detail: '2 games' },
                    { round: 2, type: 'game', label: 'Games won', amount: 9, detail: '3 games' },
                    { round: 2, type: 'bet', label: 'Bet won', amount: 5, detail: 'Team A' },
                  ].map((entry, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: sp.sm, padding: `${sp.xs}px 0`,
                      borderBottom: i < 2 ? `1px solid ${colors.border}` : 'none', fontSize: 14,
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: entry.type === 'game' ? colors.primary : colors.accent, flexShrink: 0 }} />
                      <span style={{ color: colors.muted, fontFamily: fonts.mono, fontSize: 14, minWidth: 24 }}>R{entry.round}</span>
                      <span style={{ flex: 1, color: colors.textSecondary, fontWeight: 500 }}>{entry.label}</span>
                      <span style={{ color: colors.muted, fontSize: 14, marginRight: sp.sm }}>{entry.detail}</span>
                      <span style={{ fontFamily: fonts.mono, fontWeight: 800, fontSize: 14, color: entry.amount > 0 ? colors.primary : colors.destructive }}>
                        +{'\u20AC'}{entry.amount}
                      </span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: sp.sm, borderTop: `1px solid ${colors.border}`, marginTop: sp.xs }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: colors.textSecondary, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Total</span>
                    <span style={{ fontFamily: fonts.mono, fontWeight: 800, fontSize: 14, color: colors.primary }}>{'\u20AC'}{p.balance}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Calendar Screen ───────────────────────────────────────── */

function CalendarScreen() {
  const [expandedRound, setExpandedRound] = useState(3);

  return (
    <div style={{ padding: sp.lg, display: 'flex', flexDirection: 'column', gap: sp.lg }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: 0, fontFamily: fonts.sans }}>Full Schedule</h2>
        <p style={{ fontSize: 14, fontWeight: 600, color: colors.muted, letterSpacing: '0.06em', textTransform: 'uppercase', margin: `${sp.xs}px 0 0` }}>6 rounds · 8 min each</p>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 3 }}>
        {SCHEDULE.map((_, i) => {
          const rn = i + 1;
          const done = rn <= 2;
          const live = rn === 3;
          return (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              backgroundColor: done || live ? colors.primary : colors.border,
              boxShadow: live ? `0 0 8px ${colors.primaryGlow}` : 'none',
              transition: 'all 0.3s',
            }} />
          );
        })}
      </div>

      {/* Round cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: sp.sm }}>
        {SCHEDULE.map((s, i) => {
          const rn = i + 1;
          const round = ROUNDS.find(r => r.round_index === rn);
          const isActive = rn === 3;
          const isDone = round?.status === 'completed';
          const isExp = expandedRound === rn || isActive;

          return (
            <div key={i} onClick={() => setExpandedRound(expandedRound === rn ? null : rn)} style={{
              backgroundColor: colors.surface, border: `1px solid ${isActive ? colors.primary : colors.border}`,
              borderRadius: rad.md, padding: sp.md, cursor: 'pointer', transition: 'all 0.2s',
              opacity: isDone ? 0.65 : 1, boxShadow: isActive ? `0 0 20px ${colors.primaryGlow}` : 'none',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isExp ? sp.md : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: sp.sm }}>
                  <span style={{ fontFamily: fonts.mono, fontWeight: 800, fontSize: 14, color: isActive ? colors.primary : colors.text }}>Round {rn}</span>
                  {isActive && <LiveBadge size="sm" />}
                  {isDone && (
                    <span style={{
                      fontSize: 14, fontWeight: 700, padding: `2px ${sp.sm}px`, borderRadius: rad.pill,
                      backgroundColor: colors.primaryMuted, color: colors.primary, letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>Done</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: sp.sm }}>
                  {isDone && round && (
                    <span style={{ fontFamily: fonts.mono, fontWeight: 800, fontSize: 14, color: colors.primary }}>
                      {round.team_a_score} - {round.team_b_score}
                    </span>
                  )}
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: isExp ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>

              {isExp && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: sp.sm }}>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: sp.xs }}>Team A</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: colors.text, margin: 0 }}>{PLAYERS[s.teamA[0]].name}</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: colors.text, margin: 0 }}>{PLAYERS[s.teamA[1]].name}</p>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: colors.muted, letterSpacing: '0.06em' }}>vs</span>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: sp.xs }}>Team B</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: colors.text, margin: 0 }}>{PLAYERS[s.teamB[0]].name}</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: colors.text, margin: 0 }}>{PLAYERS[s.teamB[1]].name}</p>
                    </div>
                  </div>
                  {s.rest.length > 0 && (
                    <div style={{ marginTop: sp.md, paddingTop: sp.sm, borderTop: `1px solid ${colors.border}`, display: 'flex', flexWrap: 'wrap', gap: sp.sm, alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Resting</span>
                      {s.rest.map(idx => (
                        <span key={idx} style={{
                          fontSize: 14, fontWeight: 600, color: colors.textSecondary,
                          padding: `2px ${sp.sm}px`, backgroundColor: colors.bg, borderRadius: rad.pill,
                          border: `1px solid ${colors.border}`, letterSpacing: '0.06em',
                        }}>{PLAYERS[idx].name}</span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   APP SHELL
   ═══════════════════════════════════════════════════════════════ */

export default function DeucyPreview() {
  const [tab, setTab] = useState('home');
  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'match', label: 'Match' },
    { id: 'leaderboard', label: 'Standings' },
    { id: 'calendar', label: 'Schedule' },
  ];

  return (
    <div style={{
      maxWidth: 430, margin: '0 auto', minHeight: '100vh',
      backgroundColor: colors.bg, fontFamily: fonts.sans, position: 'relative',
      color: colors.text,
    }}>
      <style>{animCSS}</style>

      {/* Content */}
      <div style={{ paddingBottom: 80 }}>
        {tab === 'home' && <HomeScreen onNavigate={setTab} />}
        {tab === 'match' && <MatchScreen />}
        {tab === 'leaderboard' && <LeaderboardScreen />}
        {tab === 'calendar' && <CalendarScreen />}
      </div>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        maxWidth: 430, margin: '0 auto',
        backgroundColor: colors.surface, borderTop: `1px solid ${colors.border}`,
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))', paddingTop: sp.md,
        display: 'flex', justifyContent: 'space-around', zIndex: 1000,
      }}>
        {tabs.map(({ id, label }) => {
          const isActive = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: sp.xs,
              padding: 0, position: 'relative', minWidth: 56,
            }}>
              {isActive && (
                <div style={{
                  position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%', backgroundColor: colors.primary,
                }} />
              )}
              <TabIcon id={id} active={isActive} />
              <span style={{
                fontSize: 14, fontWeight: isActive ? 700 : 500,
                color: isActive ? colors.primary : colors.textSecondary,
                fontFamily: fonts.sans, lineHeight: 1,
              }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
