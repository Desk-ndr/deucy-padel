import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTournaments, createTournament, subscribeAllTournaments, BlitzTournamentData } from '@/services/blitzService';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getRanking, RankedPlayer } from '@/services/rankingService';
import { supabase } from '@/integrations/supabase/client';
import { useBlitzIdentity, getGlobalPlayer } from '@/hooks/useBlitzIdentity';
import { colors, spacing, radius, fonts, typeScale, animationCSS } from '@/lib/design-tokens';

export default function BlitzList() {
  const navigate = useNavigate();
  const { deviceId } = useBlitzIdentity(undefined, null);
  const [tournaments, setTournaments] = useState<BlitzTournamentData[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('Saturday Blitz');
  const [creating, setCreating] = useState(false);
  const [ranking, setRanking] = useState<RankedPlayer[]>([]);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [myRank, setMyRank] = useState<{ position: number; score: number; delta: number | null } | null>(null);
  const [myResults, setMyResults] = useState<Record<string, { placement: number; points: number }>>({});
  const [winners, setWinners] = useState<Record<string, string>>({});

  const globalPlayerRef = useRef(getGlobalPlayer());
  const globalPlayer = globalPlayerRef.current;

  // Access gate (runs once)
  useEffect(() => {
    if (!globalPlayerRef.current) navigate('/blitz/login');
  }, [navigate]);

  const load = async () => {
    const { data } = await listTournaments();
    setTournaments(data || []);
  };

  useEffect(() => { load(); }, []);

  // Realtime: re-pull the tournament list whenever ANY change happens to
  // blitz_tournaments. Covers INSERT (someone created a new Blitz),
  // UPDATE (status setup -> live -> finished), DELETE. So Andrea sees
  // Bruno's new tournament appear within ~500ms without refreshing.
  useEffect(() => {
    const channel = subscribeAllTournaments(() => {
      load();
    });
    return () => { channel.unsubscribe(); };
  }, []);

  // Fetch ranking + my position (with retry)
  useEffect(() => {
    let cancelled = false;
    const fetchRanking = async (attempt = 0) => {
      try {
        const { data, error } = await getRanking();
        if (cancelled) return;
        if (error && attempt < 2) {
          setTimeout(() => fetchRanking(attempt + 1), 2000);
          return;
        }
        setRanking(data);
        setRankingLoading(false);
        const gp = globalPlayerRef.current;
        if (gp) {
          const idx = data.findIndex(p => p.playerId === gp.playerId);
          if (idx >= 0) {
            setMyRank({
              position: idx + 1,
              score: data[idx].rankingScore,
              delta: data[idx].pointsDelta,
            });
          }
        }
      } catch {
        if (!cancelled && attempt < 2) {
          setTimeout(() => fetchRanking(attempt + 1), 2000);
        } else if (!cancelled) {
          setRankingLoading(false);
        }
      }
    };
    fetchRanking();
    return () => { cancelled = true; };
  }, []);

  // Fetch my per-tournament results — re-runs when the tournaments list
  // changes so newly-finished tournaments get their result populated
  // without a manual refresh.
  useEffect(() => {
    const gp = globalPlayerRef.current;
    if (!gp) return;
    supabase
      .from('ranking_entries')
      .select('tournament_id, placement, total_points')
      .eq('player_id', gp.playerId)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, { placement: number; points: number }> = {};
        for (const e of data) map[e.tournament_id] = { placement: e.placement, points: e.total_points };
        setMyResults(map);
      });
  }, [tournaments]);

  // Fetch the winner (placement=1) for every finished tournament. We
  // join players to get the display name in a single round trip. This
  // powers the "… · won by Bruno" line on the History cards.
  useEffect(() => {
    const finishedIds = tournaments.filter(t => t.status === 'finished').map(t => t.id);
    if (finishedIds.length === 0) {
      setWinners({});
      return;
    }
    supabase
      .from('ranking_entries')
      .select('tournament_id, players(display_name)')
      .eq('placement', 1)
      .in('tournament_id', finishedIds)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const e of (data || [])) {
          const name = (e.players as any)?.display_name as string | undefined;
          if (name) map[(e as any).tournament_id] = name;
        }
        setWinners(map);
      });
  }, [tournaments]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const { data, error } = await createTournament(name, deviceId);
    setCreating(false);
    if (!error && data) navigate(`/blitz/${data.id}`);
  };

  const liveTournaments = tournaments.filter(t => t.status === 'live');
  const upcomingTournaments = tournaments.filter(t => t.status === 'setup');
  const finishedTournaments = tournaments.filter(t => t.status === 'finished');
  const top3 = ranking.slice(0, 3);

  const ordinalSuffix = (n: number) => {
    if (n === 1) return 'st';
    if (n === 2) return 'nd';
    if (n === 3) return 'rd';
    return 'th';
  };


  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, fontFamily: fonts.sans }}>
      <style>{animationCSS}</style>

      <div style={{ maxWidth: 430, margin: '0 auto', padding: spacing.lg }}>
        {/* ── Header ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: spacing.sm, marginBottom: spacing.xl,
        }}>
          <span style={{
            fontSize: 26, fontWeight: 900, fontStyle: 'italic',
            fontFamily: fonts.brand, color: colors.text,
          }}>deucy</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            {globalPlayer && (
              <span style={{ fontSize: 14, color: colors.textSecondary }}>
                {globalPlayer.playerName}
              </span>
            )}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: `linear-gradient(135deg, ${colors.primary}, #15803d)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: colors.bg,
            }}>
              {globalPlayer?.playerName?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </div>

        {/* ── Ranking Leaderboard Card ── */}
        {(
          <div
            onClick={() => navigate('/blitz/ranking')}
            style={{
              background: colors.surface, borderRadius: radius.lg,
              padding: `${spacing.lg}px`,
              marginBottom: spacing.xl, cursor: 'pointer',
              border: `1px solid ${colors.border}`,
            }}
          >
            {/* Header row */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span style={{
                  fontFamily: fonts.sans, fontSize: 16, fontWeight: 700,
                  color: colors.text,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>Deucy Ranking</span>
                {/* Decorative stock-ticker pair — always shown, signals
                    that the ranking is a live, moving thing */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 2,
                  lineHeight: 1, fontSize: 10, fontWeight: 800,
                }}>
                  <span style={{ color: colors.primary }}>▲</span>
                  <span style={{ color: colors.destructive }}>▼</span>
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); navigate('/blitz/how-it-works'); }}
                aria-label="How it works"
                title="How it works"
                style={{
                  width: 23, height: 23, borderRadius: '50%',
                  background: 'transparent',
                  border: '1px solid #75d4e6',
                  color: '#75d4e6',
                  cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  fontFamily: fonts.sans,
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                ?
              </button>
            </div>

            {/* Column headers — # / NAME / PTS, aligned with the rows below */}
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: `0 ${spacing.sm}px`,
              marginTop: spacing.lg, marginBottom: spacing.xs,
            }}>
              <span style={{
                fontFamily: fonts.mono, fontSize: 10, fontWeight: 600,
                color: colors.textSecondary, letterSpacing: 0.5,
                minWidth: 28,
              }}>#</span>
              <span style={{
                flex: 1,
                fontFamily: fonts.mono, fontSize: 10, fontWeight: 600,
                color: colors.textSecondary, letterSpacing: 0.5,
              }}>NAME</span>
              <span style={{
                fontFamily: fonts.mono, fontSize: 10, fontWeight: 600,
                color: colors.textSecondary, letterSpacing: 0.5,
              }}>PTS</span>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: colors.border, marginBottom: spacing.sm }} />

            {/* Loading skeleton */}
            {rankingLoading && ranking.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    height: 48, borderRadius: radius.md,
                    background: colors.surfaceElevated,
                    animation: 'shimmer 1.5s ease-in-out infinite',
                  }} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!rankingLoading && top3.length === 0 && (
              <div style={{
                textAlign: 'center', padding: `${spacing.xl}px 0`,
              }}>
                <span style={{ fontSize: 14, color: colors.muted }}>
                  No players yet
                </span>
              </div>
            )}

            {/* Top 3 rows */}
            {top3.map((player, i) => {
              const posColors = [colors.gold, colors.silver, colors.bronze];
              const isFirst = i === 0;
              const delta = player.pointsDelta;
              const showDelta = delta !== null && delta !== 0;
              return (
                <div
                  key={player.playerId}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: `${spacing.sm + 2}px ${spacing.sm}px`,
                    borderRadius: radius.md,
                    marginBottom: i < 2 ? spacing.xs : 0,
                  }}
                >
                  {/* Position number */}
                  <span style={{
                    fontFamily: fonts.mono, fontSize: isFirst ? 18 : 16,
                    fontWeight: 900, color: posColors[i],
                    minWidth: 28,
                  }}>
                    {i + 1}
                  </span>

                  {/* Name + stats */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: isFirst ? 15 : 14,
                      fontWeight: isFirst ? 600 : 500,
                      color: isFirst ? colors.text : colors.textSecondary,
                    }}>
                      {player.displayName}
                    </div>
                    <div style={{
                      fontSize: 11, color: colors.muted, marginTop: 1,
                    }}>
                      {player.tournamentsPlayed} played{player.winRate > 0 ? ` · ${player.winRate}% W` : ''}
                    </div>
                  </div>

                  {/* Score + small delta below */}
                  <div style={{ textAlign: 'right', minWidth: 48 }}>
                    <div style={{
                      fontFamily: fonts.mono,
                      fontSize: isFirst ? 18 : 16,
                      fontWeight: 900,
                      color: isFirst ? colors.primary : colors.textSecondary,
                      lineHeight: 1,
                    }}>
                      {player.rankingScore}
                    </div>
                    {showDelta && (
                      <div style={{
                        fontFamily: fonts.mono, fontSize: 11, fontWeight: 700,
                        color: delta > 0 ? colors.primary : colors.destructive,
                        marginTop: 2,
                      }}>
                        {delta > 0 ? '+' : ''}{delta}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* My position — only if user is outside the visible top 3 */}
            {myRank && myRank.position > 3 && (
              <>
                <div style={{ height: 1, background: colors.border, marginTop: spacing.sm }} />
                <div style={{
                  display: 'flex', alignItems: 'center',
                  padding: `${spacing.sm + 2}px ${spacing.sm}px`,
                  marginTop: spacing.xs,
                  borderRadius: radius.md,
                  background: 'rgba(34,197,94,0.06)',
                  border: `1px solid rgba(34,197,94,0.12)`,
                }}>
                  <span style={{
                    fontFamily: fonts.mono, fontSize: 14,
                    fontWeight: 700, color: colors.muted,
                    minWidth: 28,
                  }}>
                    {myRank.position}
                  </span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: colors.text }}>You</span>
                  <div style={{ textAlign: 'right', minWidth: 48 }}>
                    <div style={{
                      fontFamily: fonts.mono, fontSize: 14,
                      fontWeight: 700, color: colors.muted,
                      lineHeight: 1,
                    }}>
                      {myRank.score}
                    </div>
                    {myRank.delta !== null && myRank.delta !== 0 && (
                      <div style={{
                        fontFamily: fonts.mono, fontSize: 11, fontWeight: 700,
                        color: myRank.delta > 0 ? colors.primary : colors.destructive,
                        marginTop: 2,
                      }}>
                        {myRank.delta > 0 ? '+' : ''}{myRank.delta}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* See all CTA */}
            <div style={{
              textAlign: 'center', marginTop: spacing.md,
              paddingTop: spacing.sm, borderTop: `1px solid ${colors.border}`,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: colors.primary }}>
                See all →
              </span>
            </div>
          </div>
        )}

        {/* ── Live section ── */}
        {liveTournaments.length > 0 && (
          <div style={{ marginBottom: spacing.sm }}>
            <span style={{
              ...typeScale.micro, color: colors.primary, fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              display: 'flex', alignItems: 'center', gap: spacing.xs,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: colors.primary, display: 'inline-block',
                animation: 'livePulse 1.6s ease-in-out infinite',
              }} />
              Live now
            </span>
          </div>
        )}
        {liveTournaments.map(t => (
          <div
            key={t.id}
            onClick={() => navigate(`/blitz/${t.id}`)}
            style={{
              background: colors.surface,
              border: `1px solid ${colors.primary}`,
              borderRadius: radius.md,
              padding: `${spacing.md}px`,
              marginBottom: spacing.sm,
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Green top accent */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg, ${colors.primary}, #15803d)`,
            }} />
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>
                    {t.name}
                  </span>
                  <span style={{
                    background: colors.primary, color: colors.bg,
                    fontSize: 10, fontWeight: 800,
                    padding: '2px 8px', borderRadius: radius.pill,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>Live</span>
                </div>
                <span style={{ fontSize: 12, color: colors.muted }}>
                  {t.players.length} players · R{t.current_round}/{t.total_rounds}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span style={{ fontSize: 22, color: colors.primary }}>→</span>
              </div>
            </div>
          </div>
        ))}

        {/* ── Upcoming section ── */}
        {upcomingTournaments.length > 0 && (
          <div style={{ marginTop: liveTournaments.length > 0 ? spacing.lg : 0, marginBottom: spacing.sm }}>
            <span style={{
              ...typeScale.micro, color: colors.muted, fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Upcoming
            </span>
          </div>
        )}
        {upcomingTournaments.map(t => {
          const result = myResults[t.id];
          const dateStr = t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
          return (
            <div
              key={t.id}
              onClick={() => navigate(`/blitz/${t.id}`)}
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                padding: `${spacing.md}px`,
                marginBottom: spacing.sm,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: colors.textSecondary }}>
                    {t.name}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    {t.players.length} players
                    {dateStr ? ` · ${dateStr}` : ''}
                    {t.status === 'setup' ? ' · Setup' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  {/* My result in this tournament */}
                  {result && t.status === 'finished' && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 12, color: colors.muted }}>
                        {result.placement}{ordinalSuffix(result.placement)}
                      </span>
                      <span style={{
                        display: 'block', fontFamily: fonts.mono,
                        fontSize: 13, fontWeight: 800,
                        color: result.points > 0 ? colors.textSecondary : colors.muted,
                      }}>
                        {result.points > 0 ? `+${result.points}` : '0'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* ── History section ── */}
        {finishedTournaments.length > 0 && (
          <div style={{
            marginTop: (liveTournaments.length > 0 || upcomingTournaments.length > 0) ? spacing.lg : 0,
            marginBottom: spacing.sm,
          }}>
            <span style={{
              ...typeScale.micro, color: colors.muted, fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              History
            </span>
          </div>
        )}
        {finishedTournaments.map(t => {
          const result = myResults[t.id];
          const winnerName = winners[t.id];
          const dateStr = t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
          return (
            <div
              key={t.id}
              onClick={() => navigate(`/blitz/${t.id}`)}
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                padding: `${spacing.md}px`,
                marginBottom: spacing.sm,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'baseline', gap: spacing.sm,
                    overflow: 'hidden', whiteSpace: 'nowrap',
                  }}>
                    <span style={{
                      fontSize: 15, fontWeight: 600, color: colors.textSecondary,
                      flexShrink: 0,
                    }}>
                      {t.name}
                    </span>
                    {winnerName && (
                      <span style={{
                        fontSize: 14, fontWeight: 500, color: colors.textSecondary,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        · won by {winnerName}
                      </span>
                    )}
                  </div>
                  <span style={{
                    display: 'block', fontSize: 12, color: colors.muted, marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t.players.length} players{dateStr ? ` · ${dateStr}` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  {/* My result — highlighted, or "Did not play" pill if I wasn't in the pool */}
                  {result ? (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 600 }}>
                        {result.placement}{ordinalSuffix(result.placement)}
                      </span>
                      <div style={{ marginTop: 4 }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          background: result.points > 0 ? colors.primaryMuted : 'transparent',
                          border: result.points > 0 ? `1px solid rgba(34,197,94,0.25)` : '1px solid transparent',
                          borderRadius: radius.pill,
                          fontFamily: fonts.mono,
                          fontSize: 12, fontWeight: 800,
                          color: result.points > 0 ? colors.primary : colors.muted,
                        }}>
                          {result.points > 0 ? `+${result.points} pts` : '0 pts'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      background: 'transparent',
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.pill,
                      fontFamily: fonts.sans,
                      fontSize: 11, fontWeight: 600,
                      color: colors.muted,
                      whiteSpace: 'nowrap',
                    }}>
                      Did not play
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Empty state ── */}
        {tournaments.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 64, paddingBottom: 32 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              backgroundColor: colors.primaryMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <p style={{ ...typeScale.title, color: colors.text, marginBottom: 4 }}>No tournaments yet</p>
            <p style={{ ...typeScale.body, color: colors.muted, marginBottom: spacing.xl }}>Create your first Blitz</p>
          </div>
        )}

      </div>

      {/* ── FAB: New Blitz ── */}
      <button
        onClick={() => setShowCreate(true)}
        aria-label="Create new Blitz"
        title="Create new Blitz"
        style={{
          position: 'fixed',
          bottom: `calc(${spacing.lg}px + env(safe-area-inset-bottom, 0px))`,
          right: spacing.lg,
          width: 56, height: 56,
          borderRadius: '50%',
          background: colors.primary,
          border: 'none',
          color: colors.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: `0 4px 16px rgba(34,197,94,0.35), 0 2px 6px rgba(0,0,0,0.4)`,
          zIndex: 50,
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
      >
        <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* ── Create dialog (modal) ── */}
      <AlertDialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) setShowCreate(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>New Blitz</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a name for your tournament.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div style={{ padding: '0 24px' }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && name.trim() && !creating) handleCreate();
              }}
              placeholder="e.g. Saturday Blitz"
              autoFocus
              style={{
                width: '100%', padding: spacing.md,
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.sm,
                color: colors.text,
                fontSize: 16, fontWeight: 600, fontFamily: fonts.sans,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={creating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              style={{ opacity: creating || !name.trim() ? 0.5 : 1 }}
            >
              {creating ? 'Creating...' : 'Create'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom spacer */}
      <div style={{ height: 80 }} />
    </div>
  );
}

/* ── Podium Avatar ── */

