import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusChip } from '@/components/ui/StatusChip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Tournament, Round, Match, Player } from '@/lib/types';
import { Copy, MessageSquare, Edit, RotateCcw, Ban, UserPlus, Trash2, Shuffle, Plus, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  tournament: Tournament;
  rounds: Round[];
  matches: Match[];
  players: Player[];
  onReload: () => void;
  callEngine: (action: string, extra?: any) => Promise<any>;
  isUpdating: boolean;
}

export default function AdminMatchesSection({ tournament, rounds, matches, players, onReload, callEngine, isUpdating }: Props) {
  const { toast } = useToast();
  const [selectedRoundId, setSelectedRoundId] = useState<string>(rounds.find(r => r.status === 'Live')?.id || rounds[0]?.id || '');
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [setsA, setSetsA] = useState(0);
  const [setsB, setSetsB] = useState(0);
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);
  const [swapMatch, setSwapMatch] = useState<{ matchId: string; slot: string } | null>(null);
  const [swapPlayerId, setSwapPlayerId] = useState('');
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [newMatch, setNewMatch] = useState({ a1: '', a2: '', b1: '', b2: '' });

  const playerMap = new Map(players.map(p => [p.id, p]));
  const getName = (id: string | null) => id ? playerMap.get(id)?.full_name || '?' : '?';
  const getPhone = (id: string | null) => id ? playerMap.get(id)?.phone || '' : '';

  const roundMatches = matches.filter(m => m.round_id === selectedRoundId && !m.is_bye);
  const byeMatches = matches.filter(m => m.round_id === selectedRoundId && m.is_bye);

  // Find unmatched players for the selected round
  const matchedPlayerIds = new Set<string>();
  matches.filter(m => m.round_id === selectedRoundId).forEach(m => {
    [m.team_a_player1_id, m.team_a_player2_id, m.team_b_player1_id, m.team_b_player2_id, m.bye_player_id]
      .forEach(id => { if (id) matchedPlayerIds.add(id); });
  });

  const activePlayers = players.filter(p => p.status === 'Active' && p.confirmed);
  const unmatchedPlayers = activePlayers.filter(p => !matchedPlayerIds.has(p.id));

  const getMatchStatusVariant = (s: string) => {
    switch (s) {
      case 'Played': return 'success' as const;
      case 'BookingClaimed': return 'info' as const;
      case 'Overdue': case 'AutoResolved': return 'error' as const;
      default: return 'neutral' as const;
    }
  };

  const copyContacts = (m: Match) => {
    const ids = [m.team_a_player1_id, m.team_a_player2_id, m.team_b_player1_id, m.team_b_player2_id];
    const block = ids.filter(Boolean).map(id => `${getName(id)}: ${getPhone(id)}`).join('\n');
    navigator.clipboard.writeText(block);
    toast({ title: 'Contacts copied' });
  };

  const generateNudge = (m: Match) => {
    const names = [m.team_a_player1_id, m.team_a_player2_id, m.team_b_player1_id, m.team_b_player2_id]
      .filter(Boolean).map(getName).join(', ');
    const deadline = m.deadline_at ? format(new Date(m.deadline_at), 'MMM d') : 'soon';
    const msg = `🏓 Hey! Your match (${names}) is due by ${deadline}. Book it ASAP! 💪`;
    navigator.clipboard.writeText(msg);
    toast({ title: 'Nudge message copied' });
  };

  const submitResult = async (matchId: string) => {
    await callEngine('process_match_result', {
      match_id: matchId,
      sets_a: setsA,
      sets_b: setsB,
      is_unfinished: false,
      player_id: null,
    });
    setEditingMatch(null);
  };

  const resetResult = async (matchId: string) => {
    await supabase.from('matches').update({ status: 'Scheduled' as any, sets_a: 0, sets_b: 0, played_at: null, is_unfinished: false }).eq('id', matchId);
    toast({ title: 'Result reset' });
    onReload();
  };

  const voidMatch = async (matchId: string) => {
    await supabase.from('matches').update({ status: 'AutoResolved' as any, is_unfinished: true }).eq('id', matchId);
    toast({ title: 'Match voided' });
    onReload();
  };

  const deleteMatch = async (matchId: string) => {
    // Delete related bets first, then the match
    await supabase.from('match_bets').delete().eq('match_id', matchId);
    await supabase.from('credit_ledger_entries').delete().eq('match_id', matchId);
    const { error } = await supabase.from('matches').delete().eq('id', matchId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Match deleted' });
    }
    setDeleteMatchId(null);
    onReload();
  };

  const swapPlayer = async () => {
    if (!swapMatch || !swapPlayerId) return;
    const update = { [swapMatch.slot]: swapPlayerId } as any;
    const { error } = await supabase.from('matches').update(update).eq('id', swapMatch.matchId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Player swapped' });
    }
    setSwapMatch(null);
    setSwapPlayerId('');
    onReload();
  };

  const createManualMatch = async () => {
    const { a1, a2, b1, b2 } = newMatch;
    if (!a1 || !a2 || !b1 || !b2) {
      toast({ title: 'Select all 4 players', variant: 'destructive' });
      return;
    }
    if (new Set([a1, a2, b1, b2]).size !== 4) {
      toast({ title: 'All players must be different', variant: 'destructive' });
      return;
    }
    const round = rounds.find(r => r.id === selectedRoundId);
    const { error } = await supabase.from('matches').insert({
      tournament_id: tournament.id,
      round_id: selectedRoundId,
      team_a_player1_id: a1,
      team_a_player2_id: a2,
      team_b_player1_id: b1,
      team_b_player2_id: b2,
      status: 'Scheduled' as any,
      deadline_at: round?.end_at || null,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Match created' });
      setShowCreateMatch(false);
      setNewMatch({ a1: '', a2: '', b1: '', b2: '' });
    }
    onReload();
  };

  const autoMatchRemaining = async () => {
    if (!selectedRoundId) return;
    const result = await callEngine('auto_match_remaining', { round_id: selectedRoundId });
    if (result?.success) {
      toast({ title: `Auto-matched ${result.matches_created || 0} new match(es)` });
    }
  };

  const deleteAllRoundMatches = async () => {
    const roundMatchIds = matches.filter(m => m.round_id === selectedRoundId).map(m => m.id);
    if (!roundMatchIds.length) return;
    for (const id of roundMatchIds) {
      await supabase.from('match_bets').delete().eq('match_id', id);
      await supabase.from('credit_ledger_entries').delete().eq('match_id', id);
    }
    await supabase.from('matches').delete().in('id', roundMatchIds);
    toast({ title: `Deleted ${roundMatchIds.length} match(es)` });
    onReload();
  };

  const playerSelectOptions = activePlayers.sort((a, b) => a.full_name.localeCompare(b.full_name));

  const PlayerSelect = ({ value, onChange, exclude = [], showAll = false }: { value: string; onChange: (v: string) => void; exclude?: string[]; showAll?: boolean }) => {
    const filtered = playerSelectOptions.filter(p => !exclude.includes(p.id) || p.id === value);
    const unmatchedFirst = showAll
      ? [...filtered.filter(p => unmatchedPlayers.some(u => u.id === p.id)), ...filtered.filter(p => !unmatchedPlayers.some(u => u.id === p.id))]
      : filtered;
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select player" /></SelectTrigger>
        <SelectContent>
          {showAll && unmatchedPlayers.length > 0 && (
            <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground border-b border-border mb-1">Unmatched players shown first</div>
          )}
          {unmatchedFirst.map(p => (
            <SelectItem key={p.id} value={p.id} className="text-xs">
              {p.full_name} {unmatchedPlayers.some(u => u.id === p.id) ? '🟢' : '🔵'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const slotLabels: Record<string, string> = {
    team_a_player1_id: 'Team A P1',
    team_a_player2_id: 'Team A P2',
    team_b_player1_id: 'Team B P1',
    team_b_player2_id: 'Team B P2',
  };

  return (
    <div className="space-y-3">
      {rounds.length > 0 && (
        <Select value={selectedRoundId} onValueChange={setSelectedRoundId}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Select round" /></SelectTrigger>
          <SelectContent>
            {rounds.map(r => (
              <SelectItem key={r.id} value={r.id}>
                {r.is_playoff ? r.playoff_type : `Round ${r.index}`} ({r.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Round-level actions */}
      <div className="flex flex-wrap gap-1">
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowCreateMatch(true)}>
          <Plus className="mr-1 h-3 w-3" /> Create Match
        </Button>
        {unmatchedPlayers.length >= 4 && (
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={autoMatchRemaining} disabled={isUpdating}>
            <UserPlus className="mr-1 h-3 w-3" /> Auto-match ({unmatchedPlayers.length})
          </Button>
        )}
        {roundMatches.length > 0 && (
          <Button variant="outline" size="sm" className="h-8 text-xs text-destructive" onClick={deleteAllRoundMatches}>
            <Trash2 className="mr-1 h-3 w-3" /> Delete All
          </Button>
        )}
      </div>

      {/* Unmatched players info */}
      {unmatchedPlayers.length > 0 && (
        <div className="rounded-lg bg-muted/50 border border-border p-2">
          <p className="text-xs text-muted-foreground font-medium mb-1">
            🟢 {unmatchedPlayers.length} unmatched:
          </p>
          <p className="text-xs text-foreground">{unmatchedPlayers.map(p => p.full_name).join(', ')}</p>
        </div>
      )}

      {/* Create match form */}
      {showCreateMatch && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <p className="text-xs font-medium">Create Manual Match</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Team A</p>
              <PlayerSelect value={newMatch.a1} onChange={v => setNewMatch(p => ({ ...p, a1: v }))} exclude={[newMatch.a2, newMatch.b1, newMatch.b2]} />
              <PlayerSelect value={newMatch.a2} onChange={v => setNewMatch(p => ({ ...p, a2: v }))} exclude={[newMatch.a1, newMatch.b1, newMatch.b2]} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Team B</p>
              <PlayerSelect value={newMatch.b1} onChange={v => setNewMatch(p => ({ ...p, b1: v }))} exclude={[newMatch.a1, newMatch.a2, newMatch.b2]} />
              <PlayerSelect value={newMatch.b2} onChange={v => setNewMatch(p => ({ ...p, b2: v }))} exclude={[newMatch.a1, newMatch.a2, newMatch.b1]} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs flex-1" onClick={createManualMatch}>Create</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowCreateMatch(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Match list */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {roundMatches.map(m => (
          <div key={m.id} className="rounded-lg bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="font-medium">{getName(m.team_a_player1_id)} & {getName(m.team_a_player2_id)}</p>
                <p className="text-muted-foreground">vs {getName(m.team_b_player1_id)} & {getName(m.team_b_player2_id)}</p>
                {m.status === 'Played' && <p className="text-primary font-mono mt-0.5">{m.sets_a}–{m.sets_b}</p>}
                {m.booking_claimed_by_player_id && (
                  <p className="text-xs text-accent">📋 {getName(m.booking_claimed_by_player_id)}</p>
                )}
              </div>
              <StatusChip variant={getMatchStatusVariant(m.status)} size="sm">{m.status}</StatusChip>
            </div>

            {/* Inline result editor */}
            {editingMatch === m.id && (
              <div className="flex items-center gap-2">
                <Input type="number" min={0} max={2} value={setsA} onChange={e => setSetsA(Number(e.target.value))} className="h-8 w-16" placeholder="A" />
                <span className="text-muted-foreground">–</span>
                <Input type="number" min={0} max={2} value={setsB} onChange={e => setSetsB(Number(e.target.value))} className="h-8 w-16" placeholder="B" />
                <Button size="sm" className="h-8" onClick={() => submitResult(m.id)} disabled={isUpdating}>Save</Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingMatch(null)}>Cancel</Button>
              </div>
            )}

            {/* Swap player UI */}
            {swapMatch?.matchId === m.id && (
              <div className="rounded-md border border-border bg-background p-2 space-y-2">
                <p className="text-xs font-medium">Replace {slotLabels[swapMatch.slot]} ({getName((m as any)[swapMatch.slot])})</p>
                <p className="text-[10px] text-muted-foreground">Pick any player — 🟢 unmatched, 🔵 in another match</p>
                <PlayerSelect value={swapPlayerId} onChange={setSwapPlayerId} showAll />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={swapPlayer} disabled={!swapPlayerId}>Swap</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setSwapMatch(null); setSwapPlayerId(''); }}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => copyContacts(m)}>
                <Copy className="mr-1 h-3 w-3" />Contacts
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => generateNudge(m)}>
                <MessageSquare className="mr-1 h-3 w-3" />Nudge
              </Button>

              {/* Result actions */}
              {m.status !== 'Played' && m.status !== 'AutoResolved' && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setEditingMatch(m.id); setSetsA(0); setSetsB(0); }}>
                  <Edit className="mr-1 h-3 w-3" />Result
                </Button>
              )}
              {m.status === 'Played' && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setEditingMatch(m.id); setSetsA(m.sets_a); setSetsB(m.sets_b); }}>
                  <Edit className="mr-1 h-3 w-3" />Override
                </Button>
              )}

              {/* Swap player buttons */}
              {swapMatch?.matchId !== m.id && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSwapMatch({ matchId: m.id, slot: 'team_a_player1_id' })}>
                  <ArrowRightLeft className="mr-1 h-3 w-3" />Swap
                </Button>
              )}

              {/* Reset */}
              {m.status === 'Played' && (
                <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={() => resetResult(m.id)}>
                  <RotateCcw className="mr-1 h-3 w-3" />Reset
                </Button>
              )}

              {/* Void */}
              {m.status !== 'AutoResolved' && m.status !== 'Played' && (
                <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={() => voidMatch(m.id)}>
                  <Ban className="mr-1 h-3 w-3" />Void
                </Button>
              )}

              {/* Delete */}
              <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={() => setDeleteMatchId(m.id)}>
                <Trash2 className="mr-1 h-3 w-3" />Delete
              </Button>
            </div>

            {/* Swap slot selector (when swap is active for this match) */}
            {swapMatch?.matchId === m.id && (
              <div className="flex gap-1 flex-wrap">
                {(['team_a_player1_id', 'team_a_player2_id', 'team_b_player1_id', 'team_b_player2_id'] as const).map(slot => (
                  <Button
                    key={slot}
                    variant={swapMatch.slot === slot ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={() => setSwapMatch({ matchId: m.id, slot })}
                  >
                    {getName((m as any)[slot])}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Bye matches */}
        {byeMatches.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Byes</p>
            {byeMatches.map(m => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted/20 p-2">
                <span className="text-xs">{getName(m.bye_player_id)} (bye)</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => setDeleteMatchId(m.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {roundMatches.length === 0 && byeMatches.length === 0 && (
          <p className="text-muted-foreground text-center py-4 text-sm">No matches for this round</p>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteMatchId} onOpenChange={() => setDeleteMatchId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Match?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this match and all associated bets and ledger entries. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteMatchId && deleteMatch(deleteMatchId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
