import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { listTournaments, createTournament, deleteTournament, BlitzTournamentData } from '@/services/blitzService';
import { useBlitzIdentity } from '@/hooks/useBlitzIdentity';
import { colors, spacing, radius, fonts, typeScale, shadows, animationCSS, formatBalance } from '@/lib/design-tokens';
import { HeroCard, LiveBadge, MonoNumber } from '@/components/ui/deucy';

export default function BlitzList() {
  const navigate = useNavigate();
  const { deviceId } = useBlitzIdentity(undefined, null);
  const [tournaments, setTournaments] = useState<BlitzTournamentData[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('Saturday Blitz');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BlitzTournamentData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const { data } = await listTournaments();
    setTournaments(data || []);
  };

  useEffect(() => { load(); }, []);

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
    load();
  };

  const liveTournaments = tournaments.filter(t => t.status === 'live');
  const otherTournaments = tournaments.filter(t => t.status !== 'live');

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.bg,
      fontFamily: fonts.sans,
    }}>
      <style>{animationCSS}</style>

      <div style={{ maxWidth: 430, margin: '0 auto', padding: spacing.lg }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: spacing.sm,
          marginBottom: spacing.xl,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <span style={{
              fontSize: 28,
              fontWeight: 900,
              fontStyle: 'italic',
              fontFamily: fonts.brand,
              color: colors.text,
            }}>deucy</span>
            {liveTournaments.length > 0 && <LiveBadge size="sm" />}
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            backgroundColor: colors.surfaceElevated,
            border: `2px solid ${colors.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: colors.text,
          }}>A</div>
        </div>

        {/* Live tournaments */}
        {liveTournaments.map(t => (
          <div key={t.id} style={{ marginBottom: spacing.lg }}>
            <HeroCard glow="primary" onClick={() => navigate(`/blitz/${t.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                <div>
                  <span style={{ ...typeScale.caption, color: colors.muted }}>Active blitz</span>
                  <h3 style={{ ...typeScale.headline, color: colors.text, margin: '4px 0 0' }}>{t.name}</h3>
                </div>
                <LiveBadge />
              </div>
              <div style={{ display: 'flex', gap: spacing.xl, marginBottom: spacing.lg }}>
                <div>
                  <span style={{ ...typeScale.micro, color: colors.muted, display: 'block' }}>Players</span>
                  <span style={{ ...typeScale.title, color: colors.text }}>{t.players.length}</span>
                </div>
                <div>
                  <span style={{ ...typeScale.micro, color: colors.muted, display: 'block' }}>Round</span>
                  <span style={{ ...typeScale.title, color: colors.text }}>
                    {t.current_round}/{t.total_rounds}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/blitz/${t.id}`); }}
                style={{
                  width: '100%', padding: spacing.md,
                  backgroundColor: colors.primary,
                  color: colors.bg,
                  border: 'none', borderRadius: radius.sm,
                  fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: fonts.sans,
                }}
              >
                Join match →
              </button>
            </HeroCard>
          </div>
        ))}

        {/* Other tournaments */}
        {otherTournaments.map(t => (
          <div key={t.id} style={{ marginBottom: spacing.sm }}>
            <div
              onClick={() => navigate(`/blitz/${t.id}`)}
              style={{
                padding: spacing.md,
                backgroundColor: colors.surfaceElevated,
                borderRadius: radius.md,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: t.status === 'finished' ? 0.6 : 1,
              }}
            >
              <div>
                <span style={{ ...typeScale.body, fontWeight: 600, color: colors.text }}>{t.name}</span>
                <span style={{ display: 'block', ...typeScale.micro, color: colors.muted, marginTop: 2 }}>
                  {t.players.length} players ·{' '}
                  {t.status === 'finished' ? 'Finished' : t.status === 'setup' ? 'Setup' : `R${t.current_round}/${t.total_rounds}`}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                {t.status === 'finished' && (
                  <span style={{ ...typeScale.caption, color: colors.primary }}>Completed</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: spacing.xs, borderRadius: radius.sm,
                    color: colors.muted, display: 'flex',
                  }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty state */}
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

        {/* Create form */}
        {showCreate && (
          <div style={{
            padding: spacing.lg,
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            border: `1px solid ${colors.border}`,
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
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.sm,
                color: colors.text,
                fontSize: 16, fontWeight: 600,
                fontFamily: fonts.sans,
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: spacing.md,
              }}
            />
            <div style={{ display: 'flex', gap: spacing.sm }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  flex: 1, padding: spacing.md,
                  backgroundColor: colors.surfaceElevated,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.sm,
                  color: colors.textSecondary,
                  fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: fonts.sans,
                }}
              >Cancel</button>
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  flex: 1, padding: spacing.md,
                  backgroundColor: colors.primary,
                  border: 'none', borderRadius: radius.sm,
                  color: colors.bg,
                  fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: fonts.sans,
                  opacity: creating ? 0.6 : 1,
                }}
              >{creating ? 'Creating...' : 'Create tournament'}</button>
            </div>
          </div>
        )}

        {/* New blitz button */}
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            width: '100%', padding: spacing.md,
            backgroundColor: 'transparent',
            border: `2px solid ${colors.primary}`,
            borderRadius: radius.sm,
            color: colors.primary,
            fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: fonts.sans,
            marginTop: spacing.sm,
          }}
        >
          + New Blitz
        </button>
      </div>

      {/* Delete dialog — keep shadcn for complex UI patterns */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the tournament. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
