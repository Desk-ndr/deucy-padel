import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { listTournaments, createTournament, deleteTournament, BlitzTournamentData } from '@/services/blitzService';
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
  const [deleteTarget, setDeleteTarget] = useState<BlitzTournamentData | null>(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [ranking, setRanking] = useState<RankedPlayer[]>([]);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [myRank, setMyRank] = useState<{ position: number; score: number } | null>(null);
  const [myResults, setMyResults] = useState<Record<string, { placement: number; points: number }>>({});

  const globalPlayer = useMemo(() => getGlobalPlayer(), []);

  // Access gate
  useEffect(() => {
    if (!globalPlayer) navigate('/blitz/login');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const load = async () => {
    const { data } = await listTournaments();
    setTournaments(data || []);
  };

  useEffect(() => { load(); }, []);

  // Fetch ranking + my position (with retry)
  useEffect(() => {
    let cancelled = false;
    setRankingLoading(true);
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
        if (globalPlayer) {
          const idx = data.findIndex(p => p.playerId === globalPlayer.playerId);
          if (idx >= 0) setMyRank({ position: idx + 1, score: data[idx].rankingScore });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalPlayer?.playerId]);

  // Fetch my per-tournament results
  useEffect(() => {
    if (!globalPlayer) return;
    supabase
      .from('ranking_entries')
      .select('tournament_id, placement, total_points')
      .eq('player_id', globalPlayer.playerId)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, { placement: number; points: number }> = {};
        for (const e of data) map[e.tournament_id] = { placement: e.placement, points: e.total_points };
        setMyResults(map);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalPlayer?.playerId]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const { data, error } = await createTournament(name, deviceId);
    setCreating(false);
    if (!error && data) navigate(`/blitz/${data.id}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteTournament(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    setDeleteCode('');
    load();
  };

  const liveTournaments = tournaments.filter(t => t.status === 'live');
  const otherTournaments = tournaments.filter(t => t.status !== 'live');
  const top3 = ranking.slice(0, 3);

  const ordinalSuffix = (n: number) => {
    if (n === 1) return 'st';
    if (n === 2) return 'nd';
    if (n === 3) return 'rd';
    return 'th';
  };

  const medalColors = [colors.primary, colors.silver, colors.bronze];
  const medalSizes = [48, 38, 38];

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

        {/* ── Ranking Mini-Podium ── */}
        {(top3.length > 0 || (rankingLoading && ranking.length === 0)) && (
          <div
            onClick={() => navigate('/blitz/ranking')}
            style={{
              background: colors.surface, borderRadius: radius.lg,
              padding: `${spacing.lg}px ${spacing.lg}px ${spacing.md}px`,
              marginBottom: spacing.xl, cursor: 'pointer',
              border: `1px solid ${colors.border}`,
            }}
          >
            {/* Section label */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: spacing.md,
            }}>
              <span style={{ ...typeScale.micro, color: colors.muted, fontSize: 11 }}>Ranking</span>
              <span style={{ fontSize: 12, color: colors.muted }}>
                best 4 of 6 →
              </span>
            </div>

            {/* Loading skeleton */}
            {rankingLoading && ranking.length === 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: spacing.xl, padding: `${spacing.lg}px 0`,
              }}>
                {[38, 48, 38].map((s, i) => (
                  <div key={i} style={{
                    width: s, height: s, borderRadius: '50%',
                    background: colors.surfaceElevated, border: `2px solid ${colors.border}`,
                    animation: 'shimmer 1.5s ease-in-out infinite',
                  }} />
                ))}
              </div>
            )}

            {/* Top 3 podium */}
            <div style={{
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              gap: spacing.xl, paddingBottom: spacing.sm,
            }}>
              {/* 2nd place */}
              {top3[1] && (
                <PodiumAvatar
                  name={top3[1].displayName}
                  score={top3[1].rankingScore}
                  color={medalColors[1]}
                  size={medalSizes[1]}
                  isCrown={top3[1].isCrownHolder}
                />
              )}
              {/* 1st place */}
              {top3[0] && (
                <PodiumAvatar
                  name={top3[0].displayName}
                  score={top3[0].rankingScore}
                  color={medalColors[0]}
                  size={medalSizes[0]}
                  tall
                  isCrown={top3[0].isCrownHolder}
                />
              )}
              {/* 3rd place */}
              {top3[2] && (
                <PodiumAvatar
                  name={top3[2].displayName}
                  score={top3[2].rankingScore}
                  color={medalColors[2]}
                  size={medalSizes[2]}
                  isCrown={top3[2].isCrownHolder}
                />
              )}
            </div>

            {/* My position */}
            {myRank && (
              <div style={{
                textAlign: 'center', marginTop: spacing.sm,
                paddingTop: spacing.sm, borderTop: `1px solid ${colors.border}`,
              }}>
                <span style={{ fontSize: 12, color: colors.muted }}>
                  You are{' '}
                  <span style={{ color: colors.textSecondary, fontWeight: 600 }}>
                    #{myRank.position}
                  </span>
                  {' '}with{' '}
                  <span style={{ color: colors.textSecondary, fontWeight: 600 }}>
                    {myRank.score} pts
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Section label ── */}
        {tournaments.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: spacing.sm,
          }}>
            <span style={{ ...typeScale.micro, color: colors.muted, fontSize: 11 }}>
              Tournaments
            </span>
          </div>
        )}

        {/* ── Live Tournaments ── */}
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
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: spacing.xs, color: colors.muted, display: 'flex',
                  }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
                <span style={{ fontSize: 22, color: colors.primary }}>→</span>
              </div>
            </div>
          </div>
        ))}

        {/* ── Finished / Setup Tournaments ── */}
        {otherTournaments.map(t => {
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
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: spacing.xs, color: colors.muted, display: 'flex',
                      opacity: 0.5,
                    }}
                  >
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Empty state ── */}
        {tournaments.length === 0 && !showCreate && (
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

        {/* ── Create form ── */}
        {showCreate && (
          <div style={{
            padding: spacing.lg, backgroundColor: colors.surface,
            borderRadius: radius.md, border: `1px solid ${colors.border}`,
            marginBottom: spacing.lg,
          }}>
            <span style={{ ...typeScale.caption, color: colors.muted, display: 'block', marginBottom: spacing.md }}>
              Tournament name
            </span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Saturday Blitz"
              style={{
                width: '100%', padding: spacing.md,
                backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
                borderRadius: radius.sm, color: colors.text,
                fontSize: 16, fontWeight: 600, fontFamily: fonts.sans,
                outline: 'none', boxSizing: 'border-box', marginBottom: spacing.md,
              }}
            />
            <div style={{ display: 'flex', gap: spacing.sm }}>
              <button onClick={() => setShowCreate(false)} style={{
                flex: 1, padding: spacing.md,
                backgroundColor: colors.surfaceElevated, border: `1px solid ${colors.border}`,
                borderRadius: radius.sm, color: colors.textSecondary,
                fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: fonts.sans,
              }}>Cancel</button>
              <button onClick={handleCreate} disabled={creating} style={{
                flex: 1, padding: spacing.md,
                backgroundColor: colors.primary, border: 'none', borderRadius: radius.sm,
                color: colors.bg, fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: fonts.sans,
                opacity: creating ? 0.6 : 1,
              }}>{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        )}

        {/* ── New Blitz button ── */}
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            width: '100%', padding: `${spacing.md}px`,
            backgroundColor: showCreate ? 'transparent' : colors.primary,
            border: showCreate ? `2px solid ${colors.primary}` : 'none',
            borderRadius: radius.md,
            color: showCreate ? colors.primary : colors.bg,
            fontSize: 15, fontWeight: 800,
            cursor: 'pointer', fontFamily: fonts.sans,
            marginTop: spacing.sm,
          }}
        >
          + New Blitz
        </button>
      </div>

      {/* ── Delete dialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) { setDeleteTarget(null); setDeleteCode(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.status === 'finished'
                ? 'This tournament has ranking data. Deleting it will recalculate the overall ranking for all players.'
                : 'This will permanently remove the tournament.'}
              {' '}This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div style={{ padding: '0 24px' }}>
            <p style={{ fontSize: 14, color: colors.muted, marginBottom: 8 }}>
              Enter the secret code to confirm
            </p>
            <input
              type="text"
              value={deleteCode}
              onChange={(e) => setDeleteCode(e.target.value)}
              placeholder="Secret code"
              autoComplete="off"
              style={{
                width: '100%', padding: '10px 12px',
                backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
                borderRadius: radius.sm, color: colors.text,
                fontSize: 14, fontFamily: fonts.mono, fontWeight: 600,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} onClick={() => setDeleteCode('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || deleteCode !== 'Valencia2026'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              style={{ opacity: deleteCode === 'Valencia2026' ? 1 : 0.4 }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
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
function PodiumAvatar({ name, score, color, size, tall, isCrown }: {
  name: string; score: number; color: string; size: number;
  tall?: boolean; isCrown?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: spacing.xs, marginBottom: tall ? 0 : spacing.md,
    }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: `2px solid ${color}`,
        backgroundColor: colors.surfaceElevated,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: tall ? 18 : 15, fontWeight: 800,
        color, fontFamily: fonts.sans,
        boxShadow: tall ? `0 0 20px ${color}30` : 'none',
      }}>
        {name.charAt(0).toUpperCase()}
      </div>
      <span style={{
        fontSize: tall ? 13 : 12,
        color: tall ? colors.text : colors.textSecondary,
        fontWeight: tall ? 600 : 400,
        maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', textAlign: 'center',
      }}>
        {name}
        {isCrown && <svg width={12} height={12} viewBox="0 0 24 24" fill={colors.accent} stroke="none" style={{ marginLeft: 2, display: 'inline-block', verticalAlign: 'middle' }}><path d="M2 20h20l-2-8-4 4-4-8-4 8-4-4z" /></svg>}
      </span>
      <span style={{
        fontFamily: fonts.mono, fontWeight: tall ? 900 : 800,
        fontSize: tall ? 14 : 12,
        color: tall ? color : colors.textSecondary,
      }}>
        {score}
      </span>
    </div>
  );
}
