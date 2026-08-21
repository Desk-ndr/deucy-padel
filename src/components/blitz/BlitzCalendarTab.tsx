import { useState, useEffect, useRef } from 'react';
import {
  DndContext, DragEndEvent, KeyboardSensor, MouseSensor, TouchSensor,
  useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';
import { LiveBadge } from '@/components/ui/deucy';
import { BlitzTournamentData, BlitzRound } from '@/services/blitzService';

interface Props {
  tournament: BlitzTournamentData;
  rounds: BlitzRound[];
  isCreator?: boolean;
  onReorder?: (fromIndex: number, toIndex: number) => Promise<void>;
  /** Whether the viewer may still correct a score. */
  canEdit?: boolean;
  onEditScore?: (
    roundId: string, roundIndex: number, scoreA: number, scoreB: number, court?: 'A' | 'B',
  ) => Promise<void>;
}

export default function BlitzCalendarTab({
  tournament, rounds, isCreator = false, onReorder, canEdit = false, onEditScore,
}: Props) {
  // Score correction lives here now. The schedule is the one chronological
  // view of every round, so the number and the fix for it belong on the same
  // line — it used to mean finding the round again in a separate list.
  const [editing, setEditing] = useState<{ roundId: string; court: 'A' | 'B' } | null>(null);
  const [editA, setEditA] = useState('');
  const [editB, setEditB] = useState('');

  const beginEdit = (roundId: string, court: 'A' | 'B', a: number, b: number) => {
    setEditing({ roundId, court });
    setEditA(String(a));
    setEditB(String(b));
  };

  const confirmEdit = async (roundId: string, roundNum: number, court: 'A' | 'B') => {
    const a = parseInt(editA, 10);
    const b = parseInt(editB, 10);
    if (!onEditScore || isNaN(a) || isNaN(b) || a < 0 || b < 0) return;
    await onEditScore(roundId, roundNum, a, b, court);
    setEditing(null);
  };

  const editInputStyle = {
    width: 36, padding: '2px 0',
    backgroundColor: colors.bg,
    border: `1px solid ${colors.primary}`,
    borderRadius: radius.sm,
    color: colors.text, fontSize: 14, fontWeight: 800,
    textAlign: 'center' as const, fontFamily: fonts.mono, outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const editActionStyle = {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: `2px ${spacing.sm}px`,
    fontFamily: fonts.sans, fontSize: 12, fontWeight: 700,
  };

  const totalRounds = tournament.total_rounds;

  // Auto-scroll to the active round on mount, so opening the Calendar
  // tab in a long tournament (round 7/10) lands directly on the live
  // card instead of forcing the user to scroll past completed history.
  const activeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (tournament.status !== 'live') return;
    const t = setTimeout(() => {
      activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200); // small delay so the layout has settled
    return () => clearTimeout(t);
    // intentionally only on mount + when current_round changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.current_round]);

  // Pointer + touch + keyboard sensors so DnD works on desktop and mobile.
  // The 8px activation distance prevents tap-to-toggle from being misread
  // as a drag start.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Build the items list. We use round_index as the sortable id since
  // it's stable for a given round slot. Completed rounds are NOT in the
  // sortable items: they're rendered separately above as locked, and we
  // disable drag for them.
  const completedSet = new Set(
    rounds.filter(r => r.status === 'completed').map(r => r.round_index)
  );
  const maxCompleted = completedSet.size > 0
    ? Math.max(...Array.from(completedSet))
    : 0;
  const movableIndices = Array.from({ length: totalRounds }, (_, i) => i + 1)
    .filter(rn => rn > maxCompleted);

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!onReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = Number(active.id);
    const to = Number(over.id);
    if (Number.isNaN(from) || Number.isNaN(to)) return;
    await onReorder(from, to);
  };

  const renderRoundCard = (roundNum: number, dragHandle?: {
    listeners: any; setActivatorNodeRef: (n: HTMLElement | null) => void;
  }) => {
    const s = tournament.schedule[roundNum - 1];
    if (!s) return null;
    const round = rounds.find(r => r.round_index === roundNum);
    const isActive = roundNum === tournament.current_round && tournament.status === 'live';
    const isCompleted = round?.status === 'completed';
    const isMovable = isCreator && !!onReorder && !isCompleted && roundNum > maxCompleted;

    // Every round shows its whole line-up. Hiding it behind a chevron meant a
    // nine-round tournament needed nine taps to answer "who am I with", and
    // the collapsed header was already taking most of the height a condensed
    // row needs anyway.
    const courtLine = (
      court: 'A' | 'B',
      label: string | null,
      teamA: readonly number[],
      teamB: readonly number[],
      scoreA: number | null | undefined,
      scoreB: number | null | undefined,
    ) => {
      const played = scoreA != null && scoreB != null;
      const aWon = played && (scoreA as number) > (scoreB as number);
      const bWon = played && (scoreB as number) > (scoreA as number);
      const editable = played && canEdit && !!onEditScore && !!round;
      const isEditing = !!round && editing?.roundId === round.id && editing.court === court;

      // The score already says who won, but dimming the losing side lets the
      // eye find it without reading the numbers.
      const side = (lost: boolean) => ({
        fontFamily: fonts.sans,
        fontSize: 13,
        fontWeight: lost ? 500 : 600,
        color: lost ? colors.textSecondary : colors.text,
        lineHeight: 1.35,
        minWidth: 0,
      });
      const names = (team: readonly number[]) =>
        team.map(idx => tournament.players[idx]?.name ?? '—').join(' + ');

      return (
        <div key={court} style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: label ? '10px 1fr auto 1fr' : '1fr auto 1fr',
            alignItems: 'center', gap: spacing.sm,
          }}>
            {label && (
              <span style={{
                fontFamily: fonts.sans, fontSize: 10, fontWeight: 800,
                color: colors.muted,
              }}>
                {label}
              </span>
            )}
            <span style={{ ...side(bWon), textAlign: 'left' }}>{names(teamA)}</span>

            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="number" min="0" value={editA}
                  onChange={e => setEditA(e.target.value)} style={editInputStyle} />
                <span style={{ color: colors.muted, fontWeight: 700 }}>–</span>
                <input type="number" min="0" value={editB}
                  onChange={e => setEditB(e.target.value)} style={editInputStyle} />
              </div>
            ) : played ? (
              // A score that can still be corrected gets a frame, so the tap
              // target is visible without adding a pencil to every row.
              <button
                onClick={() => editable && beginEdit(round!.id, court, scoreA as number, scoreB as number)}
                disabled={!editable}
                title={editable ? 'Tap to correct' : undefined}
                style={{
                  fontFamily: fonts.mono, fontSize: 13, fontWeight: 800,
                  color: colors.primary, whiteSpace: 'nowrap',
                  background: 'transparent',
                  border: `1px solid ${editable ? colors.border : 'transparent'}`,
                  borderRadius: radius.sm,
                  padding: editable ? '2px 6px' : 0,
                  cursor: editable ? 'pointer' : 'default',
                }}
              >
                {scoreA} – {scoreB}
              </button>
            ) : (
              <span style={{
                fontFamily: fonts.sans, fontSize: 10, fontWeight: 700,
                color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                vs
              </span>
            )}

            <span style={{ ...side(aWon), textAlign: 'right' }}>{names(teamB)}</span>
          </div>

          {isEditing && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.xs }}>
              <button onClick={() => setEditing(null)}
                style={{ ...editActionStyle, color: colors.textSecondary }}>
                Cancel
              </button>
              <button onClick={() => confirmEdit(round!.id, roundNum, court)}
                style={{ ...editActionStyle, color: colors.primary }}>
                Save
              </button>
            </div>
          )}
        </div>
      );
    };

    return (
      <div
        ref={isActive ? activeRef : undefined}
        style={{
          display: 'flex', flexDirection: 'column', gap: spacing.sm,
          backgroundColor: colors.surface,
          border: `1px solid ${isActive ? colors.primary : colors.border}`,
          borderRadius: radius.md,
          padding: spacing.md,
          transition: 'all 0.2s',
          opacity: isCompleted ? 0.75 : 1,
          boxShadow: isActive ? `0 0 20px ${colors.primaryGlow}` : 'none',
          userSelect: 'none',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minWidth: 0 }}>
          {isMovable && dragHandle && (
            <button
              ref={dragHandle.setActivatorNodeRef}
              {...dragHandle.listeners}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Drag round ${roundNum}`}
              title="Drag to reorder"
              style={{
                width: 28, height: 28, borderRadius: radius.sm,
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                cursor: 'grab',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, flexShrink: 0,
                touchAction: 'none', // critical for touch drag to work
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
          <span style={{
            fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
            color: isActive ? colors.primary : colors.text,
          }}>
            Round {roundNum}
          </span>
          {isActive && <LiveBadge size="sm" />}
          {isCompleted && (
            <span style={{
              ...typeScale.micro,
              padding: `2px ${spacing.sm}px`,
              borderRadius: radius.pill,
              backgroundColor: colors.primaryMuted,
              color: colors.primary,
            }}>
              Done
            </span>
          )}
        </div>

        {/* One line per court. The letter only appears when there are two. */}
        {courtLine('A', s.courtB ? 'A' : null, s.teamA, s.teamB, round?.team_a_score, round?.team_b_score)}
        {s.courtB && courtLine('B', 'B', s.courtB.teamA, s.courtB.teamB, round?.team_a_score_b, round?.team_b_score_b)}

        {/* Resting players */}
        {s.rest.length > 0 && (
          <div style={{
            paddingTop: spacing.sm,
            borderTop: `1px solid ${colors.border}`,
            display: 'flex', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center',
          }}>
            <span style={{ ...typeScale.micro, color: colors.muted }}>Resting</span>
            {s.rest.map((idx: number) => (
              <span key={idx} style={{
                ...typeScale.caption, color: colors.textSecondary,
                padding: `2px ${spacing.sm}px`,
                backgroundColor: colors.bg, borderRadius: radius.pill,
                border: `1px solid ${colors.border}`,
              }}>
                {tournament.players[idx]?.name}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Header */}
      <div>
        <h2 style={{ ...typeScale.headline, color: colors.text, margin: 0 }}>
          Full Schedule
        </h2>
        <p style={{ ...typeScale.caption, color: colors.muted, margin: `${spacing.xs}px 0 0` }}>
          {totalRounds} rounds · {Math.floor(tournament.round_duration_seconds / 60)} min each
          {isCreator && onReorder && movableIndices.length > 1 && ' · drag to reorder'}
        </p>
      </div>

      {/* Segmented progress bar */}
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: totalRounds }).map((_, i) => {
          const rn = i + 1;
          const round = rounds.find(r => r.round_index === rn);
          const isCompleted = round?.status === 'completed';
          const isActive = rn === tournament.current_round && tournament.status === 'live';
          return (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              backgroundColor: isCompleted || isActive ? colors.primary : colors.border,
              boxShadow: isActive ? `0 0 8px ${colors.primaryGlow}` : 'none',
              transition: 'all 0.3s',
            }} />
          );
        })}
      </div>

      {/* Round cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        {/* Locked completed rounds: rendered first, never draggable */}
        {Array.from({ length: maxCompleted }, (_, i) => i + 1).map(rn => (
          <div key={`locked-${rn}`}>
            {renderRoundCard(rn)}
          </div>
        ))}

        {/* Movable rounds: wrapped in DndContext + SortableContext */}
        {isCreator && onReorder && movableIndices.length > 1 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={movableIndices}
              strategy={verticalListSortingStrategy}
            >
              {movableIndices.map(rn => (
                <SortableRoundCard
                  key={rn}
                  id={rn}
                  render={(handle) => renderRoundCard(rn, handle)}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          // Non-host, or only one movable round: render plain (no drag)
          movableIndices.map(rn => (
            <div key={rn}>{renderRoundCard(rn)}</div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Sortable wrapper ──────────────────────────────────────────── */

function SortableRoundCard({ id, render }: {
  id: number;
  render: (handle: {
    listeners: any;
    setActivatorNodeRef: (n: HTMLElement | null) => void;
  }) => React.ReactNode;
}) {
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {render({ listeners, setActivatorNodeRef })}
    </div>
  );
}
