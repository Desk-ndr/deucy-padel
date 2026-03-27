import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Zap, Play, Pause, RotateCcw, Trophy, Users, Clock, ChevronLeft, Gift, Dice1 } from 'lucide-react';
import { BLITZ_SCHEDULE, TOTAL_ROUNDS, ROUND_DURATION_SECONDS } from '@/lib/blitz-schedule';
import { cn } from '@/lib/utils';

interface BlitzPlayer { name: string; score: number; }
interface BlitzRound { id: string; round_index: number; team_a_score: number | null; team_b_score: number | null; status: string; }
interface BlitzPledge { id: string; player_index: number; item_text: string; }
interface BlitzBet { id: string; round_index: number; bettor_index: number; predicted_winner: string; status: string; }

export default function BlitzTournament() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tournament, setTournament] = useState<{ id: string; name: string; status: string; players: BlitzPlayer[]; current_round: number } | null>(null);
  const [rounds, setRounds] = useState<BlitzRound[]>([]);
  const [pledges, setPledges] = useState<BlitzPledge[]>([]);
  const [bets, setBets] = useState<BlitzBet[]>([]);

  // Setup state
  const [playerNames, setPlayerNames] = useState<string[]>(Array(8).fill(''));

  // Round state
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(ROUND_DURATION_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pledge/bet state
  const [newPledgePlayer, setNewPledgePlayer] = useState(0);
  const [newPledgeText, setNewPledgeText] = useState('');
  const [betPlayer, setBetPlayer] = useState(0);
  const [betPrediction, setBetPrediction] = useState<'A' | 'B'>('A');

  const load = useCallback(async () => {
    if (!id) return;
    const { data: t } = await supabase.from('blitz_tournaments').select('*').eq('id', id).maybeSingle();
    if (!t) return;
    setTournament(t as any);
    if (t.status === 'setup') setPlayerNames((t.players as any[]).length === 8 ? (t.players as any[]).map((p: any) => p.name) : Array(8).fill(''));

    const { data: r } = await supabase.from('blitz_rounds').select('*').eq('tournament_id', id).order('round_index');
    setRounds((r || []) as BlitzRound[]);

    const { data: p } = await supabase.from('blitz_pledges').select('*').eq('tournament_id', id).order('created_at');
    setPledges((p || []) as BlitzPledge[]);

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

  // ── SETUP ──
  const handleStartTournament = async () => {
    const names = playerNames.map(n => n.trim()).filter(Boolean);
    if (names.length !== 8) { toast({ title: 'Need exactly 8 players', variant: 'destructive' }); return; }
    if (new Set(names).size !== 8) { toast({ title: 'All names must be unique', variant: 'destructive' }); return; }

    const players = names.map(name => ({ name, score: 0 })) as any;
    // Create all 12 rounds
    const roundInserts = Array.from({ length: TOTAL_ROUNDS }, (_, i) => ({
      tournament_id: id!,
      round_index: i + 1,
      status: i === 0 ? 'active' : 'pending',
    }));

    await supabase.from('blitz_tournaments').update({ players, status: 'live', current_round: 1 }).eq('id', id!);
    await supabase.from('blitz_rounds').insert(roundInserts);
    setTimerSeconds(ROUND_DURATION_SECONDS);
    load();
    toast({ title: 'Tournament started! ⚡' });
  };

  // ── SUBMIT SCORE ──
  const handleSubmitScore = async () => {
    if (!tournament) return;
    const a = parseInt(scoreA); const b = parseInt(scoreB);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) { toast({ title: 'Enter valid scores', variant: 'destructive' }); return; }

    const roundIdx = tournament.current_round;
    const schedule = BLITZ_SCHEDULE[roundIdx - 1];
    const round = rounds.find(r => r.round_index === roundIdx);
    if (!round) return;

    // Update round score
    await supabase.from('blitz_rounds').update({ team_a_score: a, team_b_score: b, status: 'completed' }).eq('id', round.id);

    // Update player scores
    const updatedPlayers = [...tournament.players];
    schedule.teamA.forEach(idx => { updatedPlayers[idx] = { ...updatedPlayers[idx], score: updatedPlayers[idx].score + a } as BlitzPlayer; });
    schedule.teamB.forEach(idx => { updatedPlayers[idx] = { ...updatedPlayers[idx], score: updatedPlayers[idx].score + b } as BlitzPlayer; });
    

    // Settle bets for this round
    const roundBets = bets.filter(bet => bet.round_index === roundIdx && bet.status === 'pending');
    const winner = a > b ? 'A' : b > a ? 'B' : 'draw';
    for (const bet of roundBets) {
      const betStatus = winner === 'draw' ? 'draw' : bet.predicted_winner === winner ? 'won' : 'lost';
      await supabase.from('blitz_bets').update({ status: betStatus }).eq('id', bet.id);
    }

    const isLast = roundIdx >= TOTAL_ROUNDS;
    if (isLast) {
      await supabase.from('blitz_tournaments').update({ players: updatedPlayers as any, current_round: roundIdx, status: 'finished' }).eq('id', id!);
      toast({ title: 'Tournament complete! 🏆' });
    } else {
      // Activate next round
      const nextRound = rounds.find(r => r.round_index === roundIdx + 1);
      if (nextRound) await supabase.from('blitz_rounds').update({ status: 'active' }).eq('id', nextRound.id);
      await supabase.from('blitz_tournaments').update({ players: updatedPlayers as any, current_round: roundIdx + 1 }).eq('id', id!);
      toast({ title: `Round ${roundIdx} done! Moving to Round ${roundIdx + 1}` });
    }

    setScoreA(''); setScoreB('');
    setTimerSeconds(ROUND_DURATION_SECONDS);
    setTimerRunning(false);
    load();
  };

  // ── PLEDGES ──
  const handleAddPledge = async () => {
    if (!newPledgeText.trim()) return;
    await supabase.from('blitz_pledges').insert({ tournament_id: id!, player_index: newPledgePlayer, item_text: newPledgeText.trim() });
    setNewPledgeText('');
    load();
    toast({ title: 'Pledge added! 🎁' });
  };

  // ── BETS ──
  const handlePlaceBet = async () => {
    if (!tournament) return;
    const roundIdx = tournament.current_round;
    // Check not already bet this round
    const existing = bets.find(b => b.round_index === roundIdx && b.bettor_index === betPlayer);
    if (existing) { toast({ title: 'Already bet this round', variant: 'destructive' }); return; }
    // Can't bet if playing this round
    const schedule = BLITZ_SCHEDULE[roundIdx - 1];
    const isPlaying = [...schedule.teamA, ...schedule.teamB].includes(betPlayer);
    if (isPlaying) { toast({ title: "Can't bet on your own match!", variant: 'destructive' }); return; }

    await supabase.from('blitz_bets').insert({ tournament_id: id!, round_index: roundIdx, bettor_index: betPlayer, predicted_winner: betPrediction });
    load();
    toast({ title: 'Bet placed! 🎲' });
  };

  if (!tournament) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-4xl animate-pulse">⚡</div></div>;

  const currentSchedule = tournament.current_round > 0 && tournament.current_round <= TOTAL_ROUNDS ? BLITZ_SCHEDULE[tournament.current_round - 1] : null;
  const sortedPlayers = tournament.players.map((p, i) => ({ ...p, index: i })).sort((a, b) => b.score - a.score);

  // ── SETUP VIEW ──
  if (tournament.status === 'setup') {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto p-4 space-y-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/blitz')}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
          <div className="text-center space-y-2">
            <div className="text-5xl">⚡</div>
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
            <p className="text-muted-foreground text-sm">Enter the names of 8 players</p>
          </div>
          <Card>
            <CardContent className="p-4 space-y-3">
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
              <Button className="w-full mt-4" size="lg" onClick={handleStartTournament} disabled={playerNames.filter(n => n.trim()).length !== 8}>
                <Zap className="h-4 w-4 mr-2" /> Start Tournament
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── MAIN DASHBOARD ──
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/blitz')}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
          <h1 className="font-bold text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> {tournament.name}</h1>
          <div className="w-16" />
        </div>

        <Tabs defaultValue="match" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="match"><Play className="h-3.5 w-3.5 mr-1" /> Match</TabsTrigger>
            <TabsTrigger value="leaderboard"><Trophy className="h-3.5 w-3.5 mr-1" /> Rank</TabsTrigger>
            <TabsTrigger value="pledges"><Gift className="h-3.5 w-3.5 mr-1" /> Pledges</TabsTrigger>
            <TabsTrigger value="bets"><Dice1 className="h-3.5 w-3.5 mr-1" /> Bets</TabsTrigger>
          </TabsList>

          {/* ── MATCH TAB ── */}
          <TabsContent value="match" className="space-y-4 mt-4">
            {tournament.status === 'finished' ? (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="text-5xl">🏆</div>
                  <h2 className="text-xl font-bold">Tournament Complete!</h2>
                  <p className="text-muted-foreground">Winner: <span className="text-primary font-bold">{sortedPlayers[0]?.name}</span> with {sortedPlayers[0]?.score} points</p>
                </CardContent>
              </Card>
            ) : currentSchedule && (
              <>
                {/* Round header */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Round</p>
                  <p className="text-3xl font-black text-primary">{tournament.current_round} <span className="text-base font-normal text-muted-foreground">/ {TOTAL_ROUNDS}</span></p>
                </div>

                {/* Teams */}
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

                {/* Resting */}
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
                          <Play className="h-4 w-4 mr-1" /> {timerSeconds === ROUND_DURATION_SECONDS ? 'Start' : 'Resume'}
                        </Button>
                      ) : (
                        <Button variant="secondary" onClick={() => setTimerRunning(false)}>
                          <Pause className="h-4 w-4 mr-1" /> Pause
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => { setTimerRunning(false); setTimerSeconds(ROUND_DURATION_SECONDS); }}>
                        <RotateCcw className="h-4 w-4 mr-1" /> Reset
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Score input */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm font-semibold text-center">Enter Final Points</p>
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
                    <Button className="w-full" onClick={handleSubmitScore} disabled={!scoreA || !scoreB}>
                      Submit Score & {tournament.current_round >= TOTAL_ROUNDS ? 'Finish' : 'Next Round'} →
                    </Button>
                  </CardContent>
                </Card>

                {/* Past rounds summary */}
                {rounds.filter(r => r.status === 'completed').length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Completed Rounds</p>
                    {rounds.filter(r => r.status === 'completed').map(r => {
                      const s = BLITZ_SCHEDULE[r.round_index - 1];
                      return (
                        <div key={r.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/30">
                          <span className="text-muted-foreground">R{r.round_index}</span>
                          <span>{tournament.players[s.teamA[0]]?.name} & {tournament.players[s.teamA[1]]?.name}</span>
                          <span className="font-bold">{r.team_a_score} - {r.team_b_score}</span>
                          <span>{tournament.players[s.teamB[0]]?.name} & {tournament.players[s.teamB[1]]?.name}</span>
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
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-xs text-muted-foreground">#</th>
                      <th className="text-left p-3 text-xs text-muted-foreground">Player</th>
                      <th className="text-right p-3 text-xs text-muted-foreground">Points</th>
                      <th className="text-right p-3 text-xs text-muted-foreground">Rounds</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayers.map((p, rank) => {
                      const roundsPlayed = rounds.filter(r => r.status === 'completed').filter(r => {
                        const s = BLITZ_SCHEDULE[r.round_index - 1];
                        return [...s.teamA, ...s.teamB].includes(p.index);
                      }).length;
                      return (
                        <tr key={p.index} className={cn('border-b last:border-0', rank === 0 && 'bg-primary/5')}>
                          <td className="p-3 font-bold">{rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : rank + 1}</td>
                          <td className="p-3 font-medium">{p.name}</td>
                          <td className="p-3 text-right font-bold text-primary">{p.score}</td>
                          <td className="p-3 text-right text-sm text-muted-foreground">{roundsPlayed}/6</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PLEDGES TAB ── */}
          <TabsContent value="pledges" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold">Add a Pledge 🎁</p>
                <div className="flex gap-2">
                  <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={newPledgePlayer} onChange={e => setNewPledgePlayer(Number(e.target.value))}>
                    {tournament.players.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
                  </select>
                  <Input placeholder="What are you pledging?" value={newPledgeText} onChange={e => setNewPledgeText(e.target.value)} className="flex-1" />
                  <Button size="sm" onClick={handleAddPledge} disabled={!newPledgeText.trim()}>Add</Button>
                </div>
              </CardContent>
            </Card>
            {pledges.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pledges yet. Be the first!</p>
            ) : (
              <div className="space-y-2">
                {pledges.map(p => (
                  <Card key={p.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{p.item_text}</p>
                        <p className="text-xs text-muted-foreground">by {tournament.players[p.player_index]?.name || 'Unknown'}</p>
                      </div>
                      <span className="text-xl">🎁</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── BETS TAB ── */}
          <TabsContent value="bets" className="mt-4 space-y-4">
            {tournament.status === 'live' && currentSchedule && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold">Place a Bet on Round {tournament.current_round} 🎲</p>
                  <p className="text-xs text-muted-foreground">Only resting players can bet</p>
                  <div className="flex gap-2 items-end">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Who are you?</label>
                      <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={betPlayer} onChange={e => setBetPlayer(Number(e.target.value))}>
                        {currentSchedule.rest.map(i => <option key={i} value={i}>{tournament.players[i]?.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Winner?</label>
                      <div className="flex gap-1">
                        <Button size="sm" variant={betPrediction === 'A' ? 'default' : 'outline'} onClick={() => setBetPrediction('A')}>Team A</Button>
                        <Button size="sm" variant={betPrediction === 'B' ? 'default' : 'outline'} onClick={() => setBetPrediction('B')}>Team B</Button>
                      </div>
                    </div>
                    <Button size="sm" onClick={handlePlaceBet}>Bet!</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bet history */}
            {bets.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No bets yet</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Bet History</p>
                {bets.map(b => (
                  <div key={b.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/30">
                    <span>{tournament.players[b.bettor_index]?.name}</span>
                    <span>R{b.round_index} → Team {b.predicted_winner}</span>
                    <span className={cn(
                      'font-bold',
                      b.status === 'won' && 'text-primary',
                      b.status === 'lost' && 'text-destructive',
                    )}>
                      {b.status === 'pending' ? '⏳' : b.status === 'won' ? '✅' : b.status === 'draw' ? '🤝' : '❌'}
                    </span>
                  </div>
                ))}

                {/* Bet accuracy per player */}
                {bets.some(b => b.status !== 'pending') && (
                  <div className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Betting Accuracy</p>
                    {tournament.players.map((p, i) => {
                      const playerBets = bets.filter(b => b.bettor_index === i);
                      const settled = playerBets.filter(b => b.status === 'won' || b.status === 'lost');
                      if (settled.length === 0) return null;
                      const wins = settled.filter(b => b.status === 'won').length;
                      const accuracy = Math.round((wins / settled.length) * 100);
                      return (
                        <div key={i} className="flex items-center justify-between text-sm px-3 py-1.5">
                          <span>{p.name}</span>
                          <span className="font-medium">{wins}/{settled.length} ({accuracy}%)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
