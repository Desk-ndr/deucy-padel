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
  onStart: (config: { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number }, playerNames: string[], playerIds: string[]) => Promise<void>;
}

type Step = 'players' | 'time' | 'config' | 'confirm';

const STEP_INDEX: Record<Step, number> = { players: 0, time: 1, config: 2, confirm: 3 };

export default function BlitzSetup({ tournament, onStart }: Props) {
  const [step, setStep] = useState<Step>('players');
  const [registeredPlayers, setRegisteredPlayers] = useState<RegisteredPlayer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [totalMinutes, setTotalMinutes] = useState(90);
  const [selectedConfig, setSelectedConfig] = useState<{ totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number } | null>(null);

  // Fetch registered players
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('players')
        .select('id, display_name, phone')
        .order('display_name');
      setRegisteredPlayers(data || []);
      setLoadingPlayers(false);
    };
    fetchPlayers();
  }, []);

  const numPlayers = selectedIds.size;
  const configs = numPlayers >= 5 ? getAllBlitzConfigs(numPlayers, totalMinutes) : [];
  const currentStepIndex = STEP_INDEX[step];

  const togglePlayer = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectedPlayers = registeredPlayers.filter(p => selectedIds.has(p.id));

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
            {[60, 90, 120, 150].map(m => (
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

          <div style={{ display: 'flex', gap: spacing.sm }}>
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
            {numPlayers} players · {totalMinutes} minutes · 2v2
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
            {selectedPlayers.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: spacing.sm,
                padding: `${spacing.xs}px ${spacing.md}px`,
                backgroundColor: colors.primaryMuted,
                borderRadius: radius.pill,
                border: `1px solid ${colors.primary}`,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  backgroundColor: colors.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: colors.bg,
                }}>
                  {p.display_name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
                  {p.display_name}
                </span>
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
                selectedPlayers.map(p => p.display_name),
                selectedPlayers.map(p => p.id)
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
