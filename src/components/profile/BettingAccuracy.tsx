import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

interface BettingAccuracyProps {
  playerId: string;
  tournamentId: string;
  showDecimals?: boolean;
}

interface BetStats {
  total: number;
  won: number;
  lost: number;
  pending: number;
  accuracy: number;
  totalStaked: number;
  totalPayout: number;
  netProfit: number;
}

export function BettingAccuracy({ playerId, tournamentId, showDecimals }: BettingAccuracyProps) {
  const [stats, setStats] = useState<BetStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [playerId, tournamentId]);

  const loadStats = async () => {
    const { data } = await supabase
      .from('match_bets')
      .select('*')
      .eq('player_id', playerId)
      .eq('tournament_id', tournamentId);

    if (!data || data.length === 0) {
      setStats(null);
      setLoading(false);
      return;
    }

    const won = data.filter(b => b.status === 'Won').length;
    const lost = data.filter(b => b.status === 'Lost').length;
    const pending = data.filter(b => b.status === 'Pending').length;
    const settled = won + lost;
    const accuracy = settled > 0 ? Math.round((won / settled) * 100) : 0;
    const totalStaked = data.reduce((s, b) => s + b.stake, 0);
    const totalPayout = data.filter(b => b.status === 'Won').reduce((s, b) => s + (b.payout || 0), 0);
    const netProfit = totalPayout - totalStaked;

    setStats({
      total: data.length,
      won,
      lost,
      pending,
      accuracy,
      totalStaked,
      totalPayout,
      netProfit,
    });
    setLoading(false);
  };

  if (loading) return null;
  if (!stats || stats.total === 0) return null;

  const settled = stats.won + stats.lost;
  const fmt = (cents: number) => {
    const val = cents / 100;
    return showDecimals ? `€${val.toFixed(2)}` : `€${Math.round(val)}`;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Betting Record
      </h3>

      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Accuracy ring */}
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                <circle
                  cx="18" cy="18" r="15.5"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="3"
                />
                <circle
                  cx="18" cy="18" r="15.5"
                  fill="none"
                  stroke={stats.accuracy >= 50 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'}
                  strokeWidth="3"
                  strokeDasharray={`${stats.accuracy} ${100 - stats.accuracy}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold">{stats.accuracy}%</span>
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold">
                {stats.accuracy >= 70 ? '🔥 Sharp bettor' : stats.accuracy >= 50 ? '🎯 Decent read' : '🎲 Risky gambler'}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.won}W – {stats.lost}L{stats.pending > 0 ? ` – ${stats.pending} pending` : ''} ({settled} settled)
              </p>
            </div>
          </div>

          {/* W/L bar */}
          {settled > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span className="text-primary font-medium">Won {stats.won}</span>
                <span className="text-destructive font-medium">Lost {stats.lost}</span>
              </div>
              <div className="h-2 rounded-full bg-destructive/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(stats.won / settled) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Profit line */}
          <div className="flex items-center justify-between text-sm pt-1 border-t border-border">
            <span className="text-muted-foreground flex items-center gap-1">
              {stats.netProfit >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              )}
              Net P&L
            </span>
            <span className={`font-semibold tabular-nums ${stats.netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {stats.netProfit >= 0 ? '+' : ''}{fmt(stats.netProfit)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
