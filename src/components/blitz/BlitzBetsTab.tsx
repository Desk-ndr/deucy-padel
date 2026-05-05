import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dice1 } from 'lucide-react';
import { BlitzTournamentData, BlitzBet } from '@/services/blitzService';
import { cn } from '@/lib/utils';

const MAX_BET = 3;

interface Props {
  tournament: BlitzTournamentData;
  bets: BlitzBet[];
  playerIndex: number | null;
  onPlaceBet: (bettorIndex: number, prediction: 'A' | 'B', stake: number) => Promise<void>;
}

export default function BlitzBetsTab({ tournament, bets, playerIndex, onPlaceBet }: Props) {
  const [betPrediction, setBetPrediction] = useState<'A' | 'B' | null>(null);
  const [betStake, setBetStake] = useState(1);

  const currentSchedule = tournament.current_round > 0 && tournament.schedule.length > 0
    ? tournament.schedule[tournament.current_round - 1] : null;
  const currentRoundBets = bets.filter(b => b.round_index === tournament.current_round);
  const hasPlayerBet = playerIndex !== null && currentRoundBets.some(b => b.bettor_index === playerIndex);
  const isPlaying = playerIndex !== null && currentSchedule
    ? [...currentSchedule.teamA, ...currentSchedule.teamB].includes(playerIndex) : false;
  const isResting = playerIndex !== null && currentSchedule
    ? currentSchedule.rest.includes(playerIndex) : false;

  const handleBet = async () => {
    if (playerIndex === null || !betPrediction) return;
    await onPlaceBet(playerIndex, betPrediction, betStake);
    setBetPrediction(null); setBetStake(1);
  };

  return (
    <div className="space-y-4">
      {tournament.status === 'live' && currentSchedule && (
        <Card className="border-accent/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Dice1 className="h-4 w-4 text-primary" /> Bet on Round {tournament.current_round}
              </p>
              <span className="text-xs text-muted-foreground">Max €{MAX_BET}</span>
            </div>

            {playerIndex === null && (
              <p className="text-sm text-muted-foreground text-center py-2">Pick your identity to place bets</p>
            )}

            {isPlaying && (
              <p className="text-sm text-muted-foreground text-center py-2">You're playing this round!</p>
            )}

            {hasPlayerBet && (
              <p className="text-sm text-center py-2">Bet placed ✅</p>
            )}

            {playerIndex !== null && isResting && !hasPlayerBet && (
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
                      {[1, 2, 3].filter(a => a <= Math.min(MAX_BET, tournament.players[playerIndex]?.balance || 0)).map(amount => (
                        <Button key={amount} variant={betStake === amount ? 'default' : 'outline'} size="sm"
                          className="flex-1 h-10 text-base font-bold" onClick={() => setBetStake(amount)}>
                          €{amount}
                        </Button>
                      ))}
                    </div>
                    {(tournament.players[playerIndex]?.balance || 0) <= 0 && (
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
                    <Button className="w-full" onClick={handleBet}
                      disabled={betStake > (tournament.players[playerIndex]?.balance || 0) || betStake <= 0}>
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
    </div>
  );
}
