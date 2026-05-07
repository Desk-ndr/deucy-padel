import { useState } from 'react';
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
}

export default function BlitzCalendarTab({ tournament, rounds, isCreator = false, onReorder }: Props) {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const totalRounds = tournament.total_rounds;

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
    const isExpanded = expandedRound === roundNum || isActive;
    const isMovable = isCreator && !!onReorder && !isCompleted && roundNum > maxCompleted;

    return (
      <div
        onClick={() => setExpandedRound(expandedRound === roundNum ? null : roundNum)}
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${isActive ? colors.primary : colors.border}`,
          borderRadius: radius.md,
          padding: spacing.md,
          cursor: 'pointer',
          transition: 'all 0.2s',
          opacity: isCompleted ? 0.65 : 1,
          boxShadow: isActive ? `0 0 20px ${colors.primaryGlow}` : 'none',
          userSelect: 'none',
        }}
      >
        {/* Row header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: isExpanded ? spacing.md : 0,
          gap: spacing.sm,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minWidth: 0 }}>
            {/* Drag handle (host only, non-completed only) */}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            {isCompleted && round && (
              <span style={{
                fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
                color: colors.primary,
              }}>
                {round.team_a_score} - {round.team_b_score}
              </span>
            )}
            {/* Chevron */}
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.muted}
              strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <>
            {/* Teams grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center', gap: spacing.sm,
            }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ ...typeScale.micro, color: colors.muted, display: 'block', marginBottom: spacing.xs }}>
                  Team A
                </span>
                <p style={{ ...typeScale.body, color: colors.text, fontWeight: 600, margin: 0 }}>
                  {tournament.players[s.teamA[0]]?.name}
                </p>
                <p style={{ ...typeScale.body, color: colors.text, fontWeight: 600, margin: 0 }}>
                  {tournament.players[s.teamA[1]]?.name}
                </p>
              </div>
              <span style={{ ...typeScale.caption, color: colors.muted, fontWeight: 800 }}>vs</span>
              <div style={{ textAlign: 'center' }}>
                <span style={{ ...typeScale.micro, color: colors.muted, display: 'block', marginBottom: spacing.xs }}>
                  Team B
                </span>
                <p style={{ ...typeScale.body, color: colors.text, fontWeight: 600, margin: 0 }}>
                  {tournament.players[s.teamB[0]]?.name}
                </p>
                <p style={{ ...typeScale.body, color: colors.text, fontWeight: 600, margin: 0 }}>
                  {tournament.players[s.teamB[1]]?.name}
                </p>
              </div>
            </div>

            {/* Resting players */}
            {s.rest.length > 0 && (
              <div style={{
                marginTop: spacing.md, paddingTop: spacing.sm,
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
          </>
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
