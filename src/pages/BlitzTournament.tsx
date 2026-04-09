import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Zap, Play, Pause, RotateCcw, Trophy, Users, Clock, ChevronLeft, Dice1, Share2, Trash2, CalendarDays } from 'lucide-react';
import { generateSchedule, getAllBlitzConfigs, BlitzRoundSchedule, EUROS_PER_GAME } from '@/lib/blitz-schedule';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const MAX_BET = 3;

interface BlitzPlayer { name: string; balance: number; }
interface BlitzRound { id: string; round_index: number; team_a_score: number | null; team_b_score: number | null; status: string; }
interface BlitzBet { id: string; round_index: number; bettor_index: number; predicted_winner: string; status: string; stake: number; }
interface TournamentData {
  id: string; name: string; status: string; players: BlitzPlayer[]; current_round: number;
  total_rounds: number; round_duration_seconds: number; schedule: BlitzRoundSchedule[];
}

export default function BlitzTournament() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [rounds, setRounds] = useState<BlitzRound[]>([]);
  const [bets, setBets] = useState<BlitzBet[]>([]);

  // Setup state — multi-step
  const [setupStep, setSetupStep] = useState<'players_count' | 'time' | 'config' | 'names'>('players_count');
  const [numPlayers, setNumPlayers] = useState(9);
  const [totalMinutes, setTotalMinutes] = useState(90);
  const [selectedConfig, setSelectedConfig] = useState<{ totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number } | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>([]);

  // Round state
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(600);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bet state
  const [betPlayer, setBetPlayer] = useState<number | null>(null);
  const [betPrediction, setBetPrediction] = useState<'A' | 'B' | null>(null);
  const [betStake, setBetStake] = useState(1);

  const load = useCallback(async () => {
    if (!id) return;
    const { data: t } = await supabase.from('blitz_tournaments').select('*').eq('id', id).maybeSingle();
    if (!t) return;
    const players = (t.players as any[]).map((p: any) => ({
      name: p.name, balance: p.balance ?? p.score ?? 0,
    }));
    const schedule = (t.schedule as any[]) || [];
    setTournament({
      ...t, players, schedule,
      total_rounds: t.total_rounds,
      round_duration_seconds: t.round_duration_seconds,
    } as TournamentData);
    if (t.status === 'setup') {
      if (players.length > 0 && players[0]?.name) {
        setPlayerNames(players.map((p: any) => p.name));
        setNumPlayers(players.length);
      }
    }
    if (t.round_duration_seconds) setTimerSeconds(t.round_duration_seconds);

    const { data: r } = await supabase.from('blitz_rounds').select('*').eq('tournament_id', id).order('round_index');
    setRounds((r || []) as BlitzRound[]);
    const { data: b } = await supabase.from('blitz_bets').select('*').eq('tournament_id', id).order('created_at');
    setBets((b || []) as BlitzBet[]);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Timer logic
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => setTimerSeconds(s => { if (s <= 1) { setTimerRunning(false); return 0; } return s - 1; }), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // Configs
  const configs = getAllBlitzConfigs(numPlayers, totalMinutes);

  // ── SETUP: Start Tournament ──
  const handleStartTournament = async () => {
    if (!selectedConfig) return;
    const names = playerNames.map(n => n.trim()).filter(Boolean);
    if (names.length !== numPlayers) { toast({ title: `Need exactly ${numPlayers} players`, variant: 'destructive' }); return; }
    if (new Set(names).size !== numPlayers) { toast({ title: 'All names must be unique', variant: 'destructive' }); return; }

    const schedule = generateSchedule(numPlayers, selectedConfig.totalRounds);
    const players = names.map(name => ({ name, balance: 0 }));
    const roundInserts = Array.from({ length: selectedConfig.totalRounds }, (_, i) => ({
      tournament_id: id!,
      round_index: i + 1,
      status: i === 0 ? 'active' : 'pending',
    }));

    await supabase.from('blitz_tournaments').update({
      players: players as any,
      status: 'live',
      current_round: 1,
      total_rounds: selectedConfig.totalRounds,
      round_duration_seconds: selectedConfig.roundDurationSeconds,
      schedule: schedule as any,
    }).eq('id', id!);
    await supabase.from('blitz_rounds').insert(roundInserts);
    setTimerSeconds(selectedConfig.roundDurationSeconds);
    load();
    toast({ title: 'Tournament started! ⚡' });
  };

  // ── SUBMIT SCORE ──
  const handleSubmitScore = async () => {
    if (!tournament || tournament.schedule.length === 0) return;
    const a = parseInt(scoreA); const b = parseInt(scoreB);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) { toast({ title: 'Enter valid scores', variant: 'destructive' }); return; }

    const roundIdx = tournament.current_round;
    const schedule = tournament.schedule[roundIdx - 1];
    if (!schedule) return;
    const round = rounds.find(r => r.round_index === roundIdx);
    if (!round) return;

    await supabase.from('blitz_rounds').update({ team_a_score: a, team_b_score: b, status: 'completed' }).eq('id', round.id);

    const updatedPlayers = [...tournament.players];
    schedule.teamA.forEach(idx => { updatedPlayers[idx] = { ...updatedPlayers[idx], balance: updatedPlayers[idx].balance + (a * EUROS_PER_GAME) }; });
    schedule.teamB.forEach(idx => { updatedPlayers[idx] = { ...updatedPlayers[idx], balance: updatedPlayers[idx].balance + (b * EUROS_PER_GAME) }; });

    // Settle bets
    const roundBets = bets.filter(bet => bet.round_index === roundIdx && bet.status === 'pending');
    const winner = a > b ? 'A' : b > a ? 'B' : 'draw';
    for (const bet of roundBets) {
      if (winner === 'draw') {
        updatedPlayers[bet.bettor_index] = { ...updatedPlayers[bet.bettor_index], balance: updatedPlayers[bet.bettor_index].balance + bet.stake };
        await supabase.from('blitz_bets').update({ status: 'draw' }).eq('id', bet.id);
      } else if (bet.predicted_winner === winner) {
        updatedPlayers[bet.bettor_index] = { ...updatedPlayers[bet.bettor_index], balance: updatedPlayers[bet.bettor_index].balance + (bet.stake * 2) };
        await supabase.from('blitz_bets').update({ status: 'won' }).eq('id', bet.id);
      } else {
        await supabase.from('blitz_bets').update({ status: 'lost' }).eq('id', bet.id);
      }
    }

    const totalRounds = tournament.total_rounds;
    const isLast = roundIdx >= totalRounds;
    if (isLast) {
      await supabase.from('blitz_tournaments').update({ players: updatedPlayers as any, current_round: roundIdx, status: 'finished' }).eq('id', id!);
      toast({ title: 'Tournament complete! 🏆' });
    } else {
      const nextRound = rounds.find(r => r.round_index === roundIdx + 1);
      if (nextRound) await supabase.from('blitz_rounds').update({ status: 'active' }).eq('id', nextRound.id);
      await supabase.from('blitz_tournaments').update({ players: updatedPlayers as any, current_round: roundIdx + 1 }).eq('id', id!);
      toast({ title: `Round ${roundIdx} done! Moving to Round ${roundIdx + 1}` });
    }

    setScoreA(''); setScoreB('');
    setTimerSeconds(tournament.round_duration_seconds);
    setTimerRunning(false);
    setBetPrediction(null); setBetPlayer(null);
    load();
  };

  // ── RESET ──
  const handleResetTournament = async () => {
    if (!id) return;
    await supabase.from('blitz_bets').delete().eq('tournament_id', id);
    await supabase.from('blitz_rounds').delete().eq('tournament_id', id);
    const resetPlayers = (tournament?.players || []).map(p => ({ name: p.name, balance: 0 }));
    await supabase.from('blitz_tournaments').update({
      status: 'setup', current_round: 0, players: resetPlayers as any, schedule: [] as any,
    }).eq('id', id);
    setTimerSeconds(600);
    setTimerRunning(false);
    setScoreA(''); setScoreB('');
    setBets([]); setRounds([]);
    setSetupStep('players_count');
    load();
    toast({ title: 'Tournament reset! ⚡', description: 'All data has been wiped.' });
  };

  // ── BETS ──
  const handlePlaceBet = async () => {
    if (!tournament || betPlayer === null || !betPrediction) return;
    const roundIdx = tournament.current_round;
    const existing = bets.find(b => b.round_index === roundIdx && b.bettor_index === betPlayer);
    if (existing) { toast({ title: 'Already bet this round', variant: 'destructive' }); return; }
    const schedule = tournament.schedule[roundIdx - 1];
    if (!schedule) return;
    const isPlaying = [...schedule.teamA, ...schedule.teamB].includes(betPlayer);
    if (isPlaying) { toast({ title: "Can't bet on your own match!", variant: 'destructive' }); return; }

    const playerBalance = tournament.players[betPlayer]?.balance || 0;
    if (betStake > playerBalance) { toast({ title: `Not enough €. You have €${playerBalance}`, variant: 'destructive' }); return; }

    const updatedPlayers = [...tournament.players];
    updatedPlayers[betPlayer] = { ...updatedPlayers[betPlayer], balance: updatedPlayers[betPlayer].balance - betStake };
    await supabase.from('blitz_tournaments').update({ players: updatedPlayers as any }).eq('id', id!);

    await supabase.from('blitz_bets').insert({
      tournament_id: id!, round_index: roundIdx, bettor_index: betPlayer, predicted_winner: betPrediction, stake: betStake,
    });
    setBetPrediction(null);
    load();
    toast({ title: `€${betStake} bet placed on Team ${betPrediction}! 🎲` });
  };

  if (!tournament) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-4xl animate-pulse">⚡</div></div>;

  const totalRounds = tournament.total_rounds;
  const currentSchedule = tournament.current_round > 0 && tournament.current_round <= totalRounds && tournament.schedule.length > 0
    ? tournament.schedule[tournament.current_round - 1] : null;
  const sortedPlayers = tournament.players.map((p, i) => ({ ...p, index: i })).sort((a, b) => b.balance - a.balance);

  // ── SETUP VIEW ── (multi-step)
  if (tournament.status === 'setup') {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto p-4 space-y-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/blitz')}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
          <div className="text-center space-y-2">
            <div className="text-5xl">⚡</div>
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
          </div>

          {/* Step 1: Number of players */}
          {setupStep === 'players_count' && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <p className="text-sm font-semibold text-center">How many players?</p>
                <p className="text-xs text-muted-foreground text-center">Minimum 4 players for 2v2 format</p>
                <Input
                  type="number" min="4" max="20" value={numPlayers}
                  onChange={e => setNumPlayers(Math.max(4, parseInt(e.target.value) || 4))}
                  className="text-center text-2xl font-bold h-14"
                />
                <div className="flex gap-2 justify-center">
                  {[6, 8, 9, 10, 12].map(n => (
                    <Button key={n} variant={numPlayers === n ? 'default' : 'outline'} size="sm" onClick={() => setNumPlayers(n)}>
                      {n}
                    </Button>
                  ))}
                </div>
                <Button className="w-full" size="lg" onClick={() => setSetupStep('time')}>
                  Next →
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Total time */}
          {setupStep === 'time' && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <p className="text-sm font-semibold text-center">How much time do you have?</p>
                <p className="text-xs text-muted-foreground text-center">Total minutes of play (excluding breaks)</p>
                <Input
                  type="number" min="30" max="300" value={totalMinutes}
                  onChange={e => setTotalMinutes(Math.max(30, parseInt(e.target.value) || 30))}
                  className="text-center text-2xl font-bold h-14"
                />
                <div className="flex gap-2 justify-center">
                  {[60, 90, 120, 150].map(m => (
                    <Button key={m} variant={totalMinutes === m ? 'default' : 'outline'} size="sm" onClick={() => setTotalMinutes(m)}>
                      {m} min
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSetupStep('players_count')}>← Back</Button>
                  <Button className="flex-1" onClick={() => {
                    setSelectedConfig(null);
                    setSetupStep('config');
                  }}>Next →</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Choose configuration */}
          {setupStep === 'config' && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <p className="text-sm font-semibold text-center">Choose a format</p>
                <p className="text-xs text-muted-foreground text-center">
                  {numPlayers} players · {totalMinutes} minutes · 2v2
                </p>
                {configs.length === 0 ? (
                  <p className="text-sm text-destructive text-center">No valid configurations. Try more time or fewer players.</p>
                ) : (
                  <div className="space-y-2">
                    {configs.map((c, i) => {
                      const mins = Math.floor(c.roundDurationSeconds / 60);
                      const secs = c.roundDurationSeconds % 60;
                      const isSelected = selectedConfig?.totalRounds === c.totalRounds;
                      const isSweet = c.roundDurationSeconds >= 300 && c.roundDurationSeconds <= 900;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedConfig(c)}
                          className={cn(
                            'w-full rounded-lg border-2 p-4 text-left transition-all',
                            isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground/40',
                            isSweet && !isSelected && 'border-primary/30',
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold">{c.totalRounds} rounds × {mins}:{secs.toString().padStart(2, '0')} each</p>
                              <p className="text-xs text-muted-foreground">
                                Each player plays {c.gamesPerPlayer} rounds
                              </p>
                            </div>
                            {isSweet && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Recommended</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSetupStep('time')}>← Back</Button>
                  <Button className="flex-1" disabled={!selectedConfig} onClick={() => {
                    setPlayerNames(Array(numPlayers).fill(''));
                    setSetupStep('names');
                  }}>Next →</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Player names */}
          {setupStep === 'names' && selectedConfig && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-center">Enter {numPlayers} player names</p>
                <p className="text-xs text-muted-foreground text-center">
                  {selectedConfig.totalRounds} rounds · {Math.floor(selectedConfig.roundDurationSeconds / 60)} min each · {selectedConfig.gamesPerPlayer} games per player
                </p>
                {playerNames.map((name, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm font-mono text-muted-foreground w-6">{i + 1}.</span>
                    <Input
                      placeholder={`Player ${i + 1}`}
                      value={name}
                      onChange={e => { const n = [...playerNames]; n[i] = e.target.value; setPlayerNames(n); }}
                    />
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSetupStep('config')}>← Back</Button>
                  <Button className="flex-1" size="lg" onClick={handleStartTournament}
                    disabled={playerNames.filter(n => n.trim()).length !== numPlayers}>
                    <Zap className="h-4 w-4 mr-2" /> Start Tournament
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Current round bets for display
  const currentRoundBets = bets.filter(b => b.round_index === tournament.current_round);
  const currentPlayerBet = betPlayer !== null ? currentRoundBets.find(b => b.bettor_index === betPlayer) : null;

  // ── MAIN DASHBOARD ──
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/blitz')}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
          <h1 className="font-bold text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> {tournament.name}</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => {
              const url = window.location.href;
              if (navigator.share) {
                navigator.share({ title: tournament.name, text: `Join the blitz tournament: ${tournament.name}`, url });
              } else {
                navigator.clipboard.writeText(url);
                toast({ title: 'Link copied! 📋' });
              }
            }}><Share2 className="h-4 w-4" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Tournament?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will <span className="font-semibold text-destructive">permanently wipe all data</span> — scores, rounds, bets, and balances. The tournament will go back to the setup screen. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetTournament} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, reset everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Tabs defaultValue="match" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="match"><Play className="h-3.5 w-3.5 mr-1" /> Match</TabsTrigger>
            <TabsTrigger value="leaderboard"><Trophy className="h-3.5 w-3.5 mr-1" /> Rank</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarDays className="h-3.5 w-3.5 mr-1" /> Calendar</TabsTrigger>
            <TabsTrigger value="bets"><Dice1 className="h-3.5 w-3.5 mr-1" /> Bets</TabsTrigger>
          </TabsList>

          {/* ── MATCH TAB ── */}
          <TabsContent value="match" className="space-y-4 mt-4">
            {tournament.status === 'finished' ? (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="text-5xl">🏆</div>
                  <h2 className="text-xl font-bold">Tournament Complete!</h2>
                  <p className="text-muted-foreground">Winner: <span className="text-primary font-bold">{sortedPlayers[0]?.name}</span> with €{sortedPlayers[0]?.balance}</p>
                </CardContent>
              </Card>
            ) : currentSchedule && (
              <>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Round</p>
                  <p className="text-3xl font-black text-primary">{tournament.current_round} <span className="text-base font-normal text-muted-foreground">/ {totalRounds}</span></p>
                </div>

                <Card className="border-primary/40 bg-[hsl(145_80%_50%/0.08)]">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="text-center space-y-1">
                        <p className="text-xs text-muted-foreground uppercase">Team A</p>
                        <p className="font-bold">{tournament.players[currentSchedule.teamA[0]]?.name}</p>
                        <p className="font-bold">{tournament.players[currentSchedule.teamA[1]]?.name}</p>
                      </div>
                      <div className="text-2xl font-black text-muted-foreground">VS</div>
                      <div className="text-center space-y-1">
                        <p className="text-xs text-muted-foreground uppercase">Team B</p>
                        <p className="font-bold">{tournament.players[currentSchedule.teamB[0]]?.name}</p>
                        <p className="font-bold">{tournament.players[currentSchedule.teamB[1]]?.name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" /> Resting: {currentSchedule.rest.map(i => tournament.players[i]?.name).join(', ')}
                </div>

                {/* Timer */}
                <Card>
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <span className={cn(
                        'text-5xl font-mono font-black tracking-wider',
                        timerSeconds <= 60 && timerSeconds > 0 && 'text-destructive animate-pulse',
                        timerSeconds === 0 && 'text-destructive',
                      )}>
                        {formatTime(timerSeconds)}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      {!timerRunning ? (
                        <Button onClick={() => setTimerRunning(true)} disabled={timerSeconds === 0}>
                          <Play className="h-4 w-4 mr-1" /> {timerSeconds === tournament.round_duration_seconds ? 'Start' : 'Resume'}
                        </Button>
                      ) : (
                        <Button variant="secondary" onClick={() => setTimerRunning(false)}>
                          <Pause className="h-4 w-4 mr-1" /> Pause
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => { setTimerRunning(false); setTimerSeconds(tournament.round_duration_seconds); }}>
                        <RotateCcw className="h-4 w-4 mr-1" /> Reset
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Score input */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm font-semibold text-center">Enter Final Score</p>
                    <p className="text-xs text-muted-foreground text-center">Each game won = €{EUROS_PER_GAME} per player</p>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground text-center block">Team A</label>
                        <Input type="number" min="0" placeholder="0" value={scoreA} onChange={e => setScoreA(e.target.value)} className="text-center text-xl font-bold" />
                      </div>
                      <span className="text-muted-foreground font-bold mt-4">—</span>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground text-center block">Team B</label>
                        <Input type="number" min="0" placeholder="0" value={scoreB} onChange={e => setScoreB(e.target.value)} className="text-center text-xl font-bold" />
                      </div>
                    </div>
                    {scoreA && scoreB && (
                      <div className="text-xs text-muted-foreground text-center space-y-0.5">
                        <p>Team A players each earn: <span className="font-semibold text-primary">€{parseInt(scoreA) * EUROS_PER_GAME}</span></p>
                        <p>Team B players each earn: <span className="font-semibold text-primary">€{parseInt(scoreB) * EUROS_PER_GAME}</span></p>
                      </div>
                    )}
                    <Button className="w-full" onClick={handleSubmitScore} disabled={!scoreA || !scoreB}>
                      Submit Score & {tournament.current_round >= totalRounds ? 'Finish' : 'Next Round'} →
                    </Button>
                  </CardContent>
                </Card>

                {/* Past rounds */}
                {rounds.filter(r => r.status === 'completed').length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Completed Rounds</p>
                    {rounds.filter(r => r.status === 'completed').map(r => {
                      const s = tournament.schedule[r.round_index - 1];
                      if (!s) return null;
                      return (
                        <div key={r.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/30">
                          <span className="text-muted-foreground">R{r.round_index}</span>
                          <span className="truncate">{tournament.players[s.teamA[0]]?.name} & {tournament.players[s.teamA[1]]?.name}</span>
                          <span className="font-bold">{r.team_a_score} - {r.team_b_score}</span>
                          <span className="truncate">{tournament.players[s.teamB[0]]?.name} & {tournament.players[s.teamB[1]]?.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── LEADERBOARD TAB ── */}
          <TabsContent value="leaderboard" className="mt-4">
            <LeaderboardTable players={sortedPlayers} rounds={rounds} bets={bets} schedule={tournament.schedule} />
          </TabsContent>

          {/* ── CALENDAR TAB ── */}
          <TabsContent value="calendar" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              Full Match Calendar · {totalRounds} rounds · {Math.floor(tournament.round_duration_seconds / 60)} min each
            </p>
            {tournament.schedule.map((s, i) => {
              const roundNum = i + 1;
              const round = rounds.find(r => r.round_index === roundNum);
              const isActive = roundNum === tournament.current_round && tournament.status === 'live';
              const isCompleted = round?.status === 'completed';
              return (
                <Card key={i} className={cn(
                  'transition-all',
                  isActive && 'border-primary/50 bg-primary/5',
                  isCompleted && 'opacity-70',
                )}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn('text-xs font-bold', isActive && 'text-primary')}>
                        Round {roundNum}
                        {isActive && <span className="ml-1 text-xs animate-pulse">● LIVE</span>}
                      </span>
                      {isCompleted && round && (
                        <span className="text-xs font-bold">{round.team_a_score} - {round.team_b_score}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                      <div className="text-center">
                        <p className="font-medium">{tournament.players[s.teamA[0]]?.name}</p>
                        <p className="font-medium">{tournament.players[s.teamA[1]]?.name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground font-bold">vs</span>
                      <div className="text-center">
                        <p className="font-medium">{tournament.players[s.teamB[0]]?.name}</p>
                        <p className="font-medium">{tournament.players[s.teamB[1]]?.name}</p>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground text-center mt-1">
                      Resting: {s.rest.map(idx => tournament.players[idx]?.name).join(', ')}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ── BETS TAB ── */}
          <TabsContent value="bets" className="mt-4 space-y-4">
            {tournament.status === 'live' && currentSchedule && (
              <Card className="border-accent/30">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <Dice1 className="h-4 w-4 text-accent" /> Bet on Round {tournament.current_round}
                    </p>
                    <span className="text-xs text-muted-foreground">Max €{MAX_BET}</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Who are you?</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {currentSchedule.rest.map(i => {
                        const alreadyBet = currentRoundBets.some(b => b.bettor_index === i);
                        return (
                          <button key={i} onClick={() => { setBetPlayer(i); setBetPrediction(null); }} disabled={alreadyBet}
                            className={cn(
                              'rounded-lg border px-3 py-2 text-sm text-left transition-all',
                              betPlayer === i ? 'border-primary bg-primary/10 font-semibold' : 'border-border hover:border-muted-foreground/40',
                              alreadyBet && 'opacity-40 cursor-not-allowed',
                            )}>
                            {tournament.players[i]?.name}
                            {alreadyBet && <span className="text-xs ml-1">✅</span>}
                            {!alreadyBet && <span className="text-xs text-muted-foreground ml-1">(€{tournament.players[i]?.balance})</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {betPlayer !== null && !currentPlayerBet && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Who wins?</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => setBetPrediction('A')}
                            className={cn('rounded-lg border-2 p-3 text-center transition-all',
                              betPrediction === 'A' ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground/30')}>
                            <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Team A</p>
                            <p className="text-sm font-bold">{tournament.players[currentSchedule.teamA[0]]?.name}</p>
                            <p className="text-sm font-bold">{tournament.players[currentSchedule.teamA[1]]?.name}</p>
                          </button>
                          <button onClick={() => setBetPrediction('B')}
                            className={cn('rounded-lg border-2 p-3 text-center transition-all',
                              betPrediction === 'B' ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground/30')}>
                            <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Team B</p>
                            <p className="text-sm font-bold">{tournament.players[currentSchedule.teamB[0]]?.name}</p>
                            <p className="text-sm font-bold">{tournament.players[currentSchedule.teamB[1]]?.name}</p>
                          </button>
                        </div>
                      </div>

                      {betPrediction && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">How much?</label>
                          <div className="flex gap-2">
                            {[1, 2, 3].filter(a => a <= Math.min(MAX_BET, tournament.players[betPlayer]?.balance || 0)).map(amount => (
                              <Button key={amount} variant={betStake === amount ? 'default' : 'outline'} size="sm"
                                className="flex-1 h-10 text-base font-bold" onClick={() => setBetStake(amount)}>
                                €{amount}
                              </Button>
                            ))}
                          </div>
                          {(tournament.players[betPlayer]?.balance || 0) <= 0 && (
                            <p className="text-xs text-destructive">No € available to bet</p>
                          )}
                          <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-primary">✅ If you win</span>
                              <span className="font-bold text-primary">+€{betStake}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-destructive">❌ If you lose</span>
                              <span className="font-bold text-destructive">-€{betStake}</span>
                            </div>
                          </div>
                          <Button className="w-full" onClick={handlePlaceBet}
                            disabled={betStake > (tournament.players[betPlayer]?.balance || 0) || betStake <= 0}>
                            Bet €{betStake} on Team {betPrediction} →
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {currentRoundBets.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Round {tournament.current_round} Bets</p>
                {currentRoundBets.map(b => (
                  <div key={b.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/30">
                    <span className="font-medium">{tournament.players[b.bettor_index]?.name}</span>
                    <span className="text-muted-foreground">€{b.stake} on Team {b.predicted_winner}</span>
                    <span className={cn('font-bold', b.status === 'won' && 'text-primary', b.status === 'lost' && 'text-destructive')}>
                      {b.status === 'pending' ? '⏳' : b.status === 'won' ? `+€${b.stake} ✅` : b.status === 'draw' ? '🤝 refund' : `-€${b.stake} ❌`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {bets.filter(b => b.status !== 'pending').length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Bet History</p>
                {bets.filter(b => b.status !== 'pending').map(b => (
                  <div key={b.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/30">
                    <span>{tournament.players[b.bettor_index]?.name}</span>
                    <span className="text-muted-foreground">R{b.round_index} · €{b.stake} → Team {b.predicted_winner}</span>
                    <span className={cn('font-bold', b.status === 'won' && 'text-primary', b.status === 'lost' && 'text-destructive')}>
                      {b.status === 'won' ? `+€${b.stake}` : b.status === 'draw' ? '🤝' : `-€${b.stake}`}
                    </span>
                  </div>
                ))}

                <div className="pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Betting Accuracy</p>
                  {tournament.players.map((p, i) => {
                    const playerBets = bets.filter(b => b.bettor_index === i);
                    const settled = playerBets.filter(b => b.status === 'won' || b.status === 'lost');
                    if (settled.length === 0) return null;
                    const wins = settled.filter(b => b.status === 'won').length;
                    const profit = playerBets.reduce((sum, b) => {
                      if (b.status === 'won') return sum + b.stake;
                      if (b.status === 'lost') return sum - b.stake;
                      return sum;
                    }, 0);
                    const accuracy = Math.round((wins / settled.length) * 100);
                    return (
                      <div key={i} className="flex items-center justify-between text-sm px-3 py-1.5">
                        <span>{p.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{wins}/{settled.length} ({accuracy}%)</span>
                          <span className={cn('font-bold', profit >= 0 ? 'text-primary' : 'text-destructive')}>
                            {profit >= 0 ? '+' : ''}€{profit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {bets.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No bets yet. Pick your winner!</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── LEADERBOARD WITH EXPANDABLE LEDGER ──
function LeaderboardTable({ players, rounds, bets, schedule }: {
  players: (BlitzPlayer & { index: number })[];
  rounds: BlitzRound[];
  bets: BlitzBet[];
  schedule: BlitzRoundSchedule[];
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const completedRounds = rounds.filter(r => r.status === 'completed');

  const getPlayerStats = (playerIndex: number) => {
    let gamesWon = 0;
    const ledger: { round: number; type: string; amount: number; detail: string }[] = [];

    for (const r of completedRounds) {
      const s = schedule[r.round_index - 1];
      if (!s) continue;
      const onA = s.teamA.includes(playerIndex);
      const onB = s.teamB.includes(playerIndex);
      if (onA && r.team_a_score != null) {
        gamesWon += r.team_a_score;
        const earned = r.team_a_score * EUROS_PER_GAME;
        if (earned > 0) ledger.push({ round: r.round_index, type: '🎾 Games won', amount: earned, detail: `${r.team_a_score} games × €${EUROS_PER_GAME}` });
      } else if (onB && r.team_b_score != null) {
        gamesWon += r.team_b_score;
        const earned = r.team_b_score * EUROS_PER_GAME;
        if (earned > 0) ledger.push({ round: r.round_index, type: '🎾 Games won', amount: earned, detail: `${r.team_b_score} games × €${EUROS_PER_GAME}` });
      }
    }

    const playerBets = bets.filter(b => b.bettor_index === playerIndex && b.status !== 'pending');
    for (const bet of playerBets) {
      if (bet.status === 'won') {
        ledger.push({ round: bet.round_index, type: '🎲 Bet won', amount: bet.stake, detail: `+€${bet.stake} profit (Team ${bet.predicted_winner})` });
      } else if (bet.status === 'lost') {
        ledger.push({ round: bet.round_index, type: '🎲 Bet lost', amount: -bet.stake, detail: `-€${bet.stake} (Team ${bet.predicted_winner})` });
      } else if (bet.status === 'draw') {
        ledger.push({ round: bet.round_index, type: '🎲 Bet refund', amount: 0, detail: `€${bet.stake} returned (draw)` });
      }
    }

    ledger.sort((a, b) => a.round - b.round);
    return { gamesWon, ledger };
  };

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 text-xs text-muted-foreground">#</th>
              <th className="text-left p-3 text-xs text-muted-foreground">Player</th>
              <th className="text-right p-3 text-xs text-muted-foreground">Games</th>
              <th className="text-right p-3 text-xs text-muted-foreground">Balance</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, rank) => {
              const { gamesWon, ledger } = getPlayerStats(p.index);
              const isExpanded = expanded === p.index;
              return (
                <React.Fragment key={p.index}>
                  <tr
                    className={cn('border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors', rank === 0 && 'bg-primary/5')}
                    onClick={() => setExpanded(isExpanded ? null : p.index)}
                  >
                    <td className="p-3 font-bold">{rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : rank + 1}</td>
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 text-right text-sm font-semibold">{gamesWon}</td>
                    <td className="p-3 text-right font-bold text-primary">€{p.balance}</td>
                    <td className="p-2">
                      <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} className="bg-muted/20 px-4 py-3">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Transaction Ledger</p>
                          {ledger.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No transactions yet</p>
                          ) : (
                            ledger.map((entry, i) => (
                              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                                <span className="text-muted-foreground w-8">R{entry.round}</span>
                                <span className="flex-1">{entry.type}</span>
                                <span className="text-muted-foreground text-[10px] mr-2">{entry.detail}</span>
                                <span className={cn('font-bold', entry.amount > 0 ? 'text-primary' : entry.amount < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                                  {entry.amount > 0 ? '+' : ''}€{entry.amount}
                                </span>
                              </div>
                            ))
                          )}
                          <div className="flex justify-between pt-2 border-t border-border/50 mt-1">
                            <span className="text-xs font-semibold">Total</span>
                            <span className="text-sm font-bold text-primary">€{p.balance}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
