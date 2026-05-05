import { useState } from 'react';
import { getAllBlitzConfigs } from '@/lib/blitz-schedule';
import { BlitzTournamentData } from '@/services/blitzService';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';

interface Props {
  tournament: BlitzTournamentData;
  onStart: (config: { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number }, playerNames: string[]) => Promise<void>;
}

type Step = 'players_count' | 'time' | 'config' | 'names';

const STEP_INDEX: Record<Step, number> = { players_count: 0, time: 1, config: 2, names: 3 };

export default function BlitzSetup({ tournament, onStart }: Props) {
  const [step, setStep] = useState<Step>('players_count');
  const [numPlayers, setNumPlayers] = useState(tournament.players.length > 0 ? tournament.players.length : 8);
  const [totalMinutes, setTotalMinutes] = useState(90);
  const [selectedConfig, setSelectedConfig] = useState<{ totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number } | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>(
    tournament.players.length > 0 ? tournament.players.map(p => p.name) : []
  );

  const configs = getAllBlitzConfigs(numPlayers, totalMinutes);
  const currentStepIndex = STEP_INDEX[step];

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
          fontSize: 28, fontWeight: 900, fontStyle: 'italic',
          fontFamily: fonts.brand, color: colors.text,
        }}>deucy</span>
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

      {/* Step: Player Count */}
      {step === 'players_count' && (
        <div style={{
          padding: spacing.lg,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typeScale.title, color: colors.text, textAlign: 'center', marginBottom: spacing.xs }}>
            How many players?
          </p>
          <p style={{ ...typeScale.caption, color: colors.muted, textAlign: 'center', marginBottom: spacing.xl }}>
            5 to 16 · 2v2 format
          </p>

          {/* Big number display */}
          <div style={{ textAlign: 'center', marginBottom: spacing.xl }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
              <button
                onClick={() => setNumPlayers(Math.max(5, numPlayers - 1))}
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  backgroundColor: colors.surfaceElevated,
                  border: `1px solid ${colors.border}`,
                  color: colors.text, fontSize: 22, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: fonts.sans,
                }}
              >−</button>
              <span style={{
                fontSize: 56, fontWeight: 900,
                fontFamily: typeScale.display.fontFamily,
                color: colors.primary,
                letterSpacing: '-0.03em',
                minWidth: 80, textAlign: 'center',
              }}>{numPlayers}</span>
              <button
                onClick={() => setNumPlayers(Math.min(16, numPlayers + 1))}
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


          <button onClick={() => setStep('time')} style={buttonStyle(true)}>
            Next →
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
            <button onClick={() => setStep('players_count')} style={buttonStyle(false)}>
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
              onClick={() => { setPlayerNames(Array(numPlayers).fill('')); setStep('names'); }}
              disabled={!selectedConfig}
              style={buttonStyle(true, !selectedConfig)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step: Names */}
      {step === 'names' && selectedConfig && (
        <div style={{
          padding: spacing.lg,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typeScale.title, color: colors.text, textAlign: 'center', marginBottom: spacing.xs }}>
            Enter {numPlayers} player names
          </p>
          <p style={{ ...typeScale.caption, color: colors.muted, textAlign: 'center', marginBottom: spacing.xl }}>
            {selectedConfig.totalRounds} rounds · {Math.floor(selectedConfig.roundDurationSeconds / 60)} min each · {selectedConfig.gamesPerPlayer} games per player
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.xl }}>
            {playerNames.map((pName, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                <span style={{
                  ...typeScale.mono,
                  color: colors.muted,
                  width: 24, textAlign: 'right', flexShrink: 0,
                }}>{i + 1}.</span>
                <input
                  placeholder={`Player ${i + 1}`}
                  value={pName}
                  onChange={e => {
                    const n = [...playerNames];
                    n[i] = e.target.value;
                    setPlayerNames(n);
                  }}
                  style={{
                    flex: 1, padding: spacing.md,
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.sm,
                    color: colors.text,
                    fontSize: 14, fontWeight: 600,
                    fontFamily: fonts.sans,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: spacing.sm }}>
            <button onClick={() => setStep('config')} style={buttonStyle(false)}>
              ← Back
            </button>
            <button
              onClick={() => onStart(selectedConfig, playerNames)}
              disabled={playerNames.filter(n => n.trim()).length !== numPlayers}
              style={buttonStyle(true, playerNames.filter(n => n.trim()).length !== numPlayers)}
            >
              Start tournament
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
