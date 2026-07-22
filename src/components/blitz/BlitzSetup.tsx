import { useState, useEffect } from 'react';
import { getAllBlitzConfigs } from '@/lib/blitz-schedule';
import { BlitzTournamentData } from '@/services/blitzService';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';
import { supabase } from '@/integrations/supabase/client';

interface RegisteredPlayer {
  id: string;
  display_name: string;
  phone: string;
}

interface Props {
  tournament: BlitzTournamentData;
  onStart: (config: { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number }, playerNames: string[], playerIds: Array<string | null>, isGuests: boolean[], courts: 1 | 2) => Promise<void>;
}

type Step = 'players' | 'time' | 'config' | 'confirm';

const STEP_INDEX: Record<Step, number> = { players: 0, time: 1, config: 2, confirm: 3 };

export default function BlitzSetup({ tournament, onStart }: Props) {
  const [step, setStep] = useState<Step>('players');
  const [registeredPlayers, setRegisteredPlayers] = useState<RegisteredPlayer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Guest players: ad-hoc names added by the host for one-off players who
  // aren't in the registered pool. They participate fully in the tournament
  // (leaderboard, balance, matches) but `finalizeRanking` skips them when
  // writing ranking_entries — so they don't pollute the global ranking.
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [guestInput, setGuestInput] = useState('');
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [totalMinutes, setTotalMinutes] = useState(90);
  // Pause between rounds (real-world break: court swap, water, banter).
  // Shorter pause = more playing time per round. Carved out of totalMinutes
  // before splitting the rest across rounds.
  const [pauseSeconds, setPauseSeconds] = useState(150); // default 2:30
  const [courts, setCourts] = useState<1 | 2>(1);
  const [selectedConfig, setSelectedConfig] = useState<{ totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number } | null>(null);

  // Fetch registered players + apply RSVP pre-selection (one-shot).
  // When the host enters setup from an announced tournament, AnnouncedView
  // writes the going-list to localStorage as `deucy-prefill-{tournamentId}`.
  // We read it once, mark those players as selected, and clear the slot.
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('players')
        .select('id, display_name, phone')
        .order('display_name');
      setRegisteredPlayers(data || []);
      setLoadingPlayers(false);

      // RSVP handoff: pre-select players who said "yes"
      try {
        const key = `deucy-prefill-${tournament.id}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const handoff = JSON.parse(raw) as Array<{ player_id: string; name: string }>;
          if (Array.isArray(handoff) && handoff.length > 0) {
            const ids = new Set(handoff.map(h => h.player_id));
            setSelectedIds(ids);
          }
          localStorage.removeItem(key);
        }
      } catch { /* localStorage missing/JSON broken — ignore */ }
    };
    fetchPlayers();
  }, [tournament.id]);

  const numPlayers = selectedIds.size + guestNames.length;
  // If the roster drops below 8 (guest removed or player unchecked), fall
  // back to single court — dual court needs 8 active per round.
  useEffect(() => {
    if (courts === 2 && numPlayers < 8) {
      setCourts(1);
      setSelectedConfig(null);
    }
  }, [numPlayers, courts]);
  const configs = numPlayers >= 5 ? getAllBlitzConfigs(numPlayers, totalMinutes, pauseSeconds, courts) : [];
  const currentStepIndex = STEP_INDEX[step];

  const togglePlayer = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectedPlayers = registeredPlayers.filter(p => selectedIds.has(p.id));

  // Combined list used by Confirm step and the final onStart payload.
  // Registered players first, guests appended at the end with player_id=null.
  type SetupRow = { name: string; player_id: string | null; isGuest: boolean };
  const combinedRoster: SetupRow[] = [
    ...selectedPlayers.map(p => ({ name: p.display_name, player_id: p.id as string | null, isGuest: false })),
    ...guestNames.map(n => ({ name: n, player_id: null, isGuest: true })),
  ];

  const addGuest = () => {
    const trimmed = guestInput.trim();
    if (!trimmed) return;
    // Block exact-match duplicates against registered + existing guests.
    // Avoids accidental "Andrea + Andrea" rosters that would break the
    // leaderboard naming. Case-insensitive comparison.
    const lower = trimmed.toLowerCase();
    const clash = registeredPlayers.some(p => p.display_name.toLowerCase() === lower)
      || guestNames.some(g => g.toLowerCase() === lower);
    if (clash) {
      setGuestInput('');
      return;
    }
    setGuestNames([...guestNames, trimmed]);
    setGuestInput('');
  };
  const removeGuest = (name: string) => {
    setGuestNames(guestNames.filter(g => g !== name));
  };

  const buttonStyle = (primary: boolean, disabled = false): React.CSSProperties => ({
    flex: 1,
    padding: spacing.md,
    backgroundColor: primary ? colors.primary : colors.surfaceElevated,
    color: primary ? colors.bg : colors.textSecondary,
    border: primary ? 'none' : `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: fonts.sans,
    opacity: disabled ? 0.4 : 1,
  });

  return (
    <div style={{ padding: spacing.lg }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
        <span style={{
          fontSize: 28, fontWeight: 900,
          fontFamily: fonts.brand, color: colors.text,
          letterSpacing: '-0.03em',
        }}>deucy<span style={{ color: colors.primary }}>.</span></span>
        <h2 style={{ ...typeScale.headline, color: colors.text, marginTop: spacing.sm }}>
          {tournament.name}
        </h2>
      </div>

      {/* Step indicator */}
      <div style={{
        display: 'flex', gap: 3, marginBottom: spacing.xxl,
        padding: `0 ${spacing.xxl}px`,
      }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            backgroundColor: i <= currentStepIndex ? colors.primary : colors.border,
            transition: 'background-color 0.3s',
          }} />
        ))}
      </div>

      {/* Step: Select Players */}
      {step === 'players' && (
        <div style={{
          padding: spacing.lg,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typeScale.title, color: colors.text, textAlign: 'center', marginBottom: spacing.xs }}>
            Select players
          </p>
          <p style={{ ...typeScale.caption, color: colors.muted, textAlign: 'center', marginBottom: spacing.xl }}>
            {numPlayers} selected · min 5 · 2v2 format
          </p>

          {loadingPlayers ? (
            <p style={{ ...typeScale.body, color: colors.muted, textAlign: 'center', padding: spacing.xl }}>
              Loading players...
            </p>
          ) : registeredPlayers.length === 0 ? (
            <p style={{ ...typeScale.body, color: colors.muted, textAlign: 'center', padding: spacing.xl }}>
              No registered players yet. Players need to sign up first.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.xl, maxHeight: 360, overflowY: 'auto' }}>
              {registeredPlayers.map(player => {
                const isSelected = selectedIds.has(player.id);
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: `${spacing.md}px ${spacing.lg}px`,
                      backgroundColor: isSelected ? colors.primaryMuted : colors.bg,
                      border: `2px solid ${isSelected ? colors.primary : colors.border}`,
                      borderRadius: radius.md,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      width: '100%',
                      textAlign: 'left',
                      fontFamily: fonts.sans,
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 24, height: 24, borderRadius: radius.sm,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      border: isSelected ? 'none' : `2px solid ${colors.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}>
                      {isSelected && (
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.bg} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      backgroundColor: isSelected ? colors.primary : colors.surfaceElevated,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700,
                      color: isSelected ? colors.bg : colors.textSecondary,
                      flexShrink: 0,
                    }}>
                      {player.display_name.charAt(0).toUpperCase()}
                    </div>

                    {/* Name */}
                    <span style={{
                      fontSize: 15, fontWeight: 600,
                      color: isSelected ? colors.text : colors.textSecondary,
                    }}>
                      {player.display_name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Guest players — ad-hoc names that play this tournament only
              and stay OUT of the global ranking. Use case: a friend comes
              once, you don't want to register a phone+PIN for them.
              Card padding is `md` (not `lg`) because the parent step
              wrapper already adds `lg` — nesting two `lg` paddings ate
              ~96px on a 430px mobile container and pushed the input
              + Add button past the card edge. */}
          <div style={{
            padding: spacing.md,
            backgroundColor: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            marginBottom: spacing.lg,
            boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.xs }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: colors.muted,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                Guest players
              </span>
              <span style={{ fontSize: 12, color: colors.muted }}>
                {guestNames.length} added
              </span>
            </div>
            <p style={{ ...typeScale.caption, color: colors.muted, marginTop: 0, marginBottom: spacing.md }}>
              Won&apos;t count toward Deucy ranking.
            </p>
            <div style={{
              display: 'flex',
              gap: spacing.sm,
              marginBottom: spacing.md,
              width: '100%',
            }}>
              <input
                type="text"
                value={guestInput}
                onChange={(e) => setGuestInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGuest(); } }}
                placeholder="Guest name (e.g. Mario)"
                maxLength={30}
                style={{
                  flex: 1,
                  minWidth: 0,
                  boxSizing: 'border-box',
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.sm,
                  color: colors.text,
                  fontSize: 14, fontFamily: fonts.sans,
                  outline: 'none',
                }}
              />
              <button
                onClick={addGuest}
                disabled={!guestInput.trim()}
                style={{
                  flexShrink: 0,
                  boxSizing: 'border-box',
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  backgroundColor: guestInput.trim() ? colors.primary : colors.surfaceElevated,
                  color: guestInput.trim() ? colors.bg : colors.muted,
                  border: 'none',
                  borderRadius: radius.sm,
                  fontSize: 14, fontWeight: 700, fontFamily: fonts.sans,
                  cursor: guestInput.trim() ? 'pointer' : 'default',
                }}
              >
                Add
              </button>
            </div>
            {guestNames.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                {guestNames.map(g => (
                  <button
                    key={g}
                    onClick={() => removeGuest(g)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: spacing.xs,
                      padding: `${spacing.xs}px ${spacing.md}px`,
                      background: colors.surface,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.pill,
                      cursor: 'pointer',
                      fontFamily: fonts.sans,
                    }}
                    title="Remove guest"
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{g}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: colors.accent,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      padding: `1px ${spacing.xs}px`, background: 'rgba(245,158,11,0.12)',
                      borderRadius: radius.sm,
                    }}>guest</span>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setStep('time')}
            disabled={numPlayers < 5}
            style={buttonStyle(true, numPlayers < 5)}
          >
            Next — {numPlayers} players →
          </button>
        </div>
      )}

      {/* Step: Time */}
      {step === 'time' && (
        <div style={{
          padding: spacing.lg,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typeScale.title, color: colors.text, textAlign: 'center', marginBottom: spacing.xs }}>
            How much time do you have?
          </p>
          <p style={{ ...typeScale.caption, color: colors.muted, textAlign: 'center', marginBottom: spacing.xl }}>
            Total minutes of play
          </p>

          <div style={{ textAlign: 'center', marginBottom: spacing.xl }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
              <button
                onClick={() => setTotalMinutes(Math.max(30, totalMinutes - 15))}
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  backgroundColor: colors.surfaceElevated,
                  border: `1px solid ${colors.border}`,
                  color: colors.text, fontSize: 22, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: fonts.sans,
                }}
              >−</button>
              <div style={{ textAlign: 'center' }}>
                <span style={{
                  fontSize: 56, fontWeight: 900,
                  fontFamily: typeScale.display.fontFamily,
                  color: colors.accent,
                  letterSpacing: '-0.03em',
                }}>{totalMinutes}</span>
                <span style={{
                  display: 'block', ...typeScale.caption, color: colors.muted, marginTop: 2,
                }}>minutes</span>
              </div>
              <button
                onClick={() => setTotalMinutes(Math.min(300, totalMinutes + 15))}
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  backgroundColor: colors.surfaceElevated,
                  border: `1px solid ${colors.border}`,
                  color: colors.text, fontSize: 22, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: fonts.sans,
                }}
              >+</button>
            </div>
          </div>

          {/* Quick picks */}
          <div style={{
            display: 'flex', gap: spacing.sm,
            justifyContent: 'center', marginBottom: spacing.xl,
          }}>
            {[60, 90, 120, 150, 180].map(m => (
              <button
                key={m}
                onClick={() => setTotalMinutes(m)}
                style={{
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  borderRadius: radius.pill,
                  backgroundColor: totalMinutes === m ? colors.accentMuted : colors.bg,
                  border: `2px solid ${totalMinutes === m ? colors.accent : colors.border}`,
                  color: totalMinutes === m ? colors.accent : colors.textSecondary,
                  fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: fonts.sans,
                  transition: 'all 0.15s',
                }}
              >{m} min</button>
            ))}
          </div>

          {/* Pause between rounds — minimal segmented control.
              All four values share the mm:ss format so the row reads as a
              numeric scale, not a label catalog. The current value lives
              in the header strip, so the pills themselves carry no other
              text. Tight padding so all four fit a 430px container even
              with the parent step wrapper already adding spacing.lg. */}
          <div style={{
            padding: spacing.md,
            backgroundColor: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            marginBottom: spacing.xl,
            boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.sm }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: colors.muted,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                Pause
              </span>
              <span style={{
                fontSize: 13, fontWeight: 700, color: colors.text,
                fontFamily: fonts.mono,
              }}>
                {Math.floor(pauseSeconds / 60)}:{String(pauseSeconds % 60).padStart(2, '0')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: spacing.xs, width: '100%' }}>
              {[60, 120, 150, 180].map(sec => {
                const isActive = pauseSeconds === sec;
                const label = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
                return (
                  <button
                    key={sec}
                    onClick={() => setPauseSeconds(sec)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      boxSizing: 'border-box',
                      padding: `${spacing.sm}px 0`,
                      borderRadius: radius.sm,
                      backgroundColor: isActive ? colors.primaryMuted : colors.surface,
                      border: `1px solid ${isActive ? colors.primary : colors.border}`,
                      color: isActive ? colors.primary : colors.textSecondary,
                      fontSize: 14, fontWeight: 700,
                      fontFamily: fonts.mono,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: spacing.sm }}>
                      {/* Courts selector — 1 or 2 parallel courts. Dual court requires
              at least 8 players (2 matches x 4 players simultaneous). */}
          <div style={{
            padding: spacing.md,
            backgroundColor: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            marginBottom: spacing.xl,
            boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.sm }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: colors.muted,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                Courts
              </span>
              <span style={{
                fontSize: 13, fontWeight: 700, color: colors.text,
                fontFamily: fonts.mono,
              }}>
                {courts === 1 ? '1 court' : '2 courts'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: spacing.xs, width: '100%' }}>
              {[1, 2].map(c => {
                const isActive = courts === c;
                const disabled = c === 2 && numPlayers < 8;
                return (
                  <button
                    key={c}
                    onClick={() => { if (!disabled) { setCourts(c as 1 | 2); setSelectedConfig(null); } }}
                    disabled={disabled}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      boxSizing: 'border-box',
                      padding: `${spacing.sm}px 0`,
                      borderRadius: radius.sm,
                      backgroundColor: isActive ? colors.primaryMuted : colors.surface,
                      border: `1px solid ${isActive ? colors.primary : colors.border}`,
                      color: disabled ? colors.muted : isActive ? colors.primary : colors.textSecondary,
                      fontSize: 14, fontWeight: 700,
                      fontFamily: fonts.sans,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      opacity: disabled ? 0.5 : 1,
                    }}
                    title={disabled ? 'Requires at least 8 players' : ''}
                  >
                    {c} court{c === 2 ? 's' : ''}
                  </button>
                );
              })}
            </div>
            {numPlayers < 8 && (
              <p style={{
                ...typeScale.caption, color: colors.muted, marginTop: spacing.sm, marginBottom: 0,
              }}>
                2 courts requires 8+ players.
              </p>
            )}
          </div>

          <button onClick={() => setStep('players')} style={buttonStyle(false)}>
              ← Back
            </button>
            <button onClick={() => { setSelectedConfig(null); setStep('config'); }} style={buttonStyle(true)}>
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step: Config */}
      {step === 'config' && (
        <div style={{
          padding: spacing.lg,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typeScale.title, color: colors.text, textAlign: 'center', marginBottom: spacing.xs }}>
            Choose a format
          </p>
          <p style={{ ...typeScale.caption, color: colors.muted, textAlign: 'center', marginBottom: spacing.xl }}>
            {numPlayers} players · {totalMinutes} min · pause {Math.floor(pauseSeconds/60)}:{String(pauseSeconds%60).padStart(2,"0")}
          </p>

          {configs.length === 0 ? (
            <p style={{ ...typeScale.body, color: colors.destructive, textAlign: 'center', padding: spacing.xl }}>
              No valid configurations. Try more time or fewer players.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.xl }}>
              {configs.map((c, i) => {
                const mins = Math.floor(c.roundDurationSeconds / 60);
                const secs = c.roundDurationSeconds % 60;
                const isSelected = selectedConfig?.totalRounds === c.totalRounds;
                const isSweet = c.roundDurationSeconds >= 300 && c.roundDurationSeconds <= 900;

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedConfig(c)}
                    style={{
                      width: '100%', padding: spacing.lg,
                      backgroundColor: isSelected ? colors.primaryMuted : colors.bg,
                      border: `2px solid ${isSelected ? colors.primary : isSweet ? colors.primary + '40' : colors.border}`,
                      borderRadius: radius.md,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s',
                      fontFamily: fonts.sans,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ ...typeScale.title, color: colors.text, display: 'block' }}>
                          {c.totalRounds} round × {mins}:{String(secs).padStart(2, '0')}
                        </span>
                        <span style={{ ...typeScale.caption, color: colors.muted, marginTop: 2, display: 'block' }}>
                          Each player plays {c.gamesPerPlayer} rounds
                        </span>
                      </div>
                      {isSweet && (
                        <span style={{
                          ...typeScale.micro,
                          padding: `${spacing.xs}px ${spacing.sm}px`,
                          borderRadius: radius.pill,
                          backgroundColor: colors.primaryMuted,
                          color: colors.primary,
                        }}>Recommended</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: spacing.sm }}>
            <button onClick={() => setStep('time')} style={buttonStyle(false)}>
              ← Back
            </button>
            <button
              onClick={() => setStep('confirm')}
              disabled={!selectedConfig}
              style={buttonStyle(true, !selectedConfig)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && selectedConfig && (
        <div style={{
          padding: spacing.lg,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typeScale.title, color: colors.text, textAlign: 'center', marginBottom: spacing.xs }}>
            Ready to start?
          </p>
          <p style={{ ...typeScale.caption, color: colors.muted, textAlign: 'center', marginBottom: spacing.xl }}>
            {numPlayers} players · {selectedConfig.totalRounds} rounds · {Math.floor(selectedConfig.roundDurationSeconds / 60)} min each
          </p>

          {/* Player list preview */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: spacing.sm,
            justifyContent: 'center', marginBottom: spacing.xl,
          }}>
            {combinedRoster.map((p, i) => (
              <div key={p.player_id || `guest-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: spacing.sm,
                padding: `${spacing.xs}px ${spacing.md}px`,
                backgroundColor: p.isGuest ? 'rgba(245,158,11,0.08)' : colors.primaryMuted,
                borderRadius: radius.pill,
                border: `1px solid ${p.isGuest ? colors.accent : colors.primary}`,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  backgroundColor: p.isGuest ? colors.accent : colors.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: colors.bg,
                }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
                  {p.name}
                </span>
                {p.isGuest && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: colors.accent,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>guest</span>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: spacing.sm }}>
            <button onClick={() => setStep('config')} style={buttonStyle(false)}>
              ← Back
            </button>
            <button
              onClick={() => onStart(
                selectedConfig,
                combinedRoster.map(p => p.name),
                combinedRoster.map(p => p.player_id),
                combinedRoster.map(p => p.isGuest),
                courts
              )}
              style={buttonStyle(true)}
            >
              Start tournament
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
