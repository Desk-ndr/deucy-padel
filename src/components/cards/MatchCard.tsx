import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusChip } from '@/components/ui/StatusChip';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { cn } from '@/lib/utils';
import { Phone, ExternalLink, Check, MapPin, MessageCircle, Flame, Clock, AlertTriangle, X } from 'lucide-react';
import { PlayerLink } from '@/components/ui/PlayerLink';
import { PledgeIndicator } from './PledgeIndicator';
import { useToast } from '@/hooks/use-toast';
import type { MatchWithPlayers, Player, Round, Tournament } from '@/lib/types';
import type { RoundPledgeMap } from '@/hooks/useRoundPledges';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

interface MatchCardProps {
  match: MatchWithPlayers;
  currentPlayerId: string;
  round?: Round;
  tournament?: Tournament;
  roundPledges?: RoundPledgeMap;
  betsCount?: number;
  onClaimBooking?: () => void;
  onReportResult?: () => void;
  onConfirmResult?: () => void;
  onPledgeSaved?: () => void;
  className?: string;
}

export function MatchCard({
  match,
  currentPlayerId,
  round,
  tournament,
  roundPledges = {},
  betsCount = 0,
  onClaimBooking,
  onReportResult,
  onConfirmResult,
  onPledgeSaved,
  className,
}: MatchCardProps) {
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);

  const isBookingClaimed = match.status === 'BookingClaimed' || match.booking_claimed_by_player_id;
  const isPlayed = match.status === 'Played';
  const isOverdue = match.status === 'Overdue' || match.status === 'AutoResolved';
  const isPendingConfirmation = match.status === 'PendingConfirmation';
  const isDisputed = match.status === 'Disputed';

  const isInMatch =
    match.team_a_player1_id === currentPlayerId ||
    match.team_a_player2_id === currentPlayerId ||
    match.team_b_player1_id === currentPlayerId ||
    match.team_b_player2_id === currentPlayerId;

  const isTeamA =
    match.team_a_player1_id === currentPlayerId ||
    match.team_a_player2_id === currentPlayerId;

  // Determine which team the reporter is on
  const reporterIsTeamA =
    match.reported_by_player_id === match.team_a_player1_id ||
    match.reported_by_player_id === match.team_a_player2_id;

  // Current player can only confirm if they're on the opposite team from the reporter
  const canConfirm =
    isPendingConfirmation &&
    match.reported_by_player_id &&
    isInMatch &&
    currentPlayerId !== match.reported_by_player_id &&
    reporterIsTeamA !== isTeamA &&
    !match.confirmed_by_player_id;

  const allPlayers = [
    match.team_a_player1,
    match.team_a_player2,
    match.team_b_player1,
    match.team_b_player2,
  ].filter(Boolean) as Player[];

  const roundLabel = round
    ? (round.is_playoff ? (round.playoff_type === 'final' ? '🏆 Final' : '⚔️ Semi-Final') : `Round ${round.index}`)
    : '';

  const renderPlayerWithPledge = (player: Player | undefined) => {
    if (!player) return <span className="font-semibold text-muted-foreground">TBD</span>;
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <PlayerLink player={player} showAvatar avatarClassName="h-7 w-7" className="font-medium min-w-0 flex-shrink truncate" />
        {round && <PledgeIndicator pledge={roundPledges[player.id]} className="shrink-0" />}
      </div>
    );
  };

  const handleConfirmResult = async () => {
    if (!match.reported_by_player_id || !canConfirm) return;
    
    setIsConfirming(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('matches').update({
        status: 'Played',
        confirmed_by_player_id: currentPlayerId,
        confirmed_at: now,
        played_at: now,
      }).eq('id', match.id);

      if (error) throw error;
      
      toast({ title: 'Risultato confermato!', description: 'Classifica aggiornata.' });
      onConfirmResult?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDisputeResult = async () => {
    if (!isPendingConfirmation || !isInMatch || !match.reported_by_player_id) return;

    setIsDisputing(true);
    try {
      const { error } = await supabase.from('matches').update({
        status: 'Disputed',
      }).eq('id', match.id);

      if (error) throw error;
      
      toast({ title: 'Risultato contestato', description: 'L\'admin verificherà.' });
      onConfirmResult?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsDisputing(false);
    }
  };

  return (
    <Card className={cn(
      'chaos-card transition-all',
      isInMatch && !isPlayed && !isOverdue && !isPendingConfirmation && !isDisputed && 'ring-2 ring-primary/60 border-primary/60 shadow-lg shadow-primary/20 bg-[hsl(145_80%_50%/0.08)]',
      className,
    )}>
      <CardContent className="p-4 space-y-4">
        {/* Header: label + status + countdown */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isInMatch && !isPlayed && !isOverdue && (
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                Your match ({roundLabel})
              </span>
            )}
            {!isInMatch && roundLabel && (
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {roundLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusChip
              variant={
                isPlayed ? 'success' :
                isDisputed ? 'error' :
                isPendingConfirmation ? 'warning' :
                isOverdue ? 'error' :
                isBookingClaimed ? 'info' : 'neutral'
              }
              size="sm"
            >
              {isPlayed ? 'Played' :
               isDisputed ? 'Disputed' :
               isPendingConfirmation ? 'Pending' :
               isOverdue ? 'Overdue' :
               isBookingClaimed ? 'Booked' : 'Pending'}
            </StatusChip>
            {betsCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-chaos-orange border border-chaos-orange/50 rounded-full px-1.5 py-0.5">
                <Flame className="h-2.5 w-2.5" /> Hot
              </span>
            )}
          </div>
        </div>

        {/* Countdown */}
        {match.deadline_at && !isPlayed && !isOverdue && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>⏳</span>
            <CountdownTimer targetDate={match.deadline_at} variant="compact" className="text-xs" />
            <span>left</span>
          </div>
        )}

        {/* Team A */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {isTeamA ? 'Your Team' : 'Team A'}
          </p>
          <div className="flex flex-col gap-2">
            {renderPlayerWithPledge(match.team_a_player1)}
            {renderPlayerWithPledge(match.team_a_player2)}
          </div>
        </div>

        {/* VS section */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm font-bold text-muted-foreground">VS</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Team B */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {!isTeamA ? 'Your Team' : 'Team B'}
          </p>
          <div className="flex flex-col gap-2">
            {renderPlayerWithPledge(match.team_b_player1)}
            {renderPlayerWithPledge(match.team_b_player2)}
          </div>
        </div>

        {/* Score if played */}
        {isPlayed && (
          <div className="flex items-center justify-center gap-4 py-2 bg-muted/50 rounded-lg">
            <span className={cn(
              'text-2xl font-bold',
              (isTeamA && match.sets_a > match.sets_b) || (!isTeamA && match.sets_b > match.sets_a)
                ? 'text-primary' : 'text-muted-foreground'
            )}>
              {isTeamA ? match.sets_a : match.sets_b}
            </span>
            <span className="text-muted-foreground">-</span>
            <span className={cn(
              'text-2xl font-bold',
              (isTeamA && match.sets_b > match.sets_a) || (!isTeamA && match.sets_a > match.sets_b)
                ? 'text-primary' : 'text-muted-foreground'
            )}>
              {isTeamA ? match.sets_b : match.sets_a}
            </span>
          </div>
        )}

        {/* Pending Confirmation state */}
        {isPendingConfirmation && (
          <>
            {/* Show reported score */}
            <div className="flex items-center justify-center gap-4 py-2 bg-muted/30 rounded-lg border border-primary/20">
              <span className="text-2xl font-bold text-primary">
                {match.sets_a}
              </span>
              <span className="text-muted-foreground">-</span>
              <span className="text-2xl font-bold text-primary">
                {match.sets_b}
              </span>
            </div>

            {/* If current player is on same team as reporter */}
            {match.reported_by_player_id && isInMatch && (reporterIsTeamA === isTeamA) && (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg border border-primary/20">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                  In attesa conferma avversario
                </p>
              </div>
            )}

            {/* If current player is on opposite team (can confirm or dispute) */}
            {canConfirm && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center px-1">
                  Conferma il risultato oppure contesta se non sei d'accordo
                </p>
                <Button
                  onClick={handleConfirmResult}
                  disabled={isConfirming || isDisputing}
                  className="w-full touch-target bg-gradient-primary hover:opacity-90"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Conferma Risultato
                </Button>
                <Button
                  onClick={handleDisputeResult}
                  disabled={isConfirming || isDisputing}
                  variant="secondary"
                  className="w-full touch-target"
                >
                  <X className="mr-2 h-4 w-4" />
                  Contesta
                </Button>
              </div>
            )}
          </>
        )}

        {/* Disputed state */}
        {isDisputed && (
          <div className="flex items-center gap-2 px-3 py-2 bg-chaos-orange/10 rounded-lg border border-chaos-orange/30">
            <AlertTriangle className="h-4 w-4 text-chaos-orange shrink-0" />
            <p className="text-xs text-chaos-orange font-medium">
              Risultato in discussione — Admin verificherà
            </p>
          </div>
        )}

        {/* Pledge indicators for players */}
        {!isPlayed && !isPendingConfirmation && Object.keys(roundPledges).length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Pledge Status</p>
            <div className="flex flex-wrap gap-1">
              {allPlayers.map(p => (
                <span key={p.id} className="text-[10px] text-muted-foreground">
                  {p.full_name.split(' ')[0]}: {roundPledges[p.id] ? '✅' : '⛔'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {!isPlayed && !isOverdue && !isPendingConfirmation && !isDisputed && (
          <div className="space-y-2">
            {!isBookingClaimed && onClaimBooking && (
              <Button
                onClick={onClaimBooking}
                className="w-full touch-target bg-gradient-primary hover:opacity-90"
              >
                <Check className="mr-2 h-5 w-5" />
                I'll Book It
              </Button>
            )}

            {isBookingClaimed && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary" />
                Booked by {
                  match.booking_claimed_by_player_id === currentPlayerId
                    ? 'you'
                    : allPlayers.find(p => p.id === match.booking_claimed_by_player_id)?.full_name || 'someone'
                }
              </div>
            )}

            {/* Court location & booking */}
            <div className="rounded-lg bg-muted/40 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground leading-snug">
                  {tournament?.club_name || 'BOIX TEAM TENNIS'} — Gran Vía de Fernando el Católico, 78, Extramurs, 46008 València
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full touch-target"
                onClick={() => window.open(tournament?.booking_url || 'https://boixteam.es/booking-gran-via', '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Book Court
              </Button>
            </div>

            {/* Match Chat - below Book Court */}
            <div className="pt-2 border-t border-border space-y-3">
              <p className="text-xs text-muted-foreground mb-2">Match Chat</p>
              <div className="flex flex-wrap gap-2">
                {allPlayers
                  .filter(p => p.id !== currentPlayerId)
                  .map((player) => (
                    <a
                      key={player.id}
                      href={`https://wa.me/${player.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-muted rounded-full hover:bg-muted/80 transition-colors"
                    >
                      <Phone className="h-3 w-3" />
                      {player.full_name.split(' ')[0]}
                    </a>
                  ))}
              </div>

              {/* WhatsApp group creation */}
              {allPlayers.length >= 2 && (() => {
                const deadlineText = match.deadline_at
                  ? format(new Date(match.deadline_at), 'EEE d MMM, HH:mm')
                  : 'TBD';
                const bookingUrl = tournament?.booking_url || 'https://boixteam.es/booking-gran-via';
                const tournamentName = tournament?.name || 'Deucy';

                const groupMsg = [
                  `${tournamentName} – ${roundLabel} 🥤`,
                  '',
                  `Team A: ${match.team_a_player1?.full_name || 'TBD'} + ${match.team_a_player2?.full_name || 'TBD'}`,
                  `Team B: ${match.team_b_player1?.full_name || 'TBD'} + ${match.team_b_player2?.full_name || 'TBD'}`,
                  '',
                  `⏰ Deadline: ${deadlineText}`,
                  `🎾 Book court: ${bookingUrl}`,
                  '',
                  "Let's pick a time – who's booking?",
                ].join('\n');

                const handleCreateGroup = () => {
                  navigator.clipboard.writeText(groupMsg).then(() => {
                    toast({ title: 'Message copied! 📋', description: 'Paste it in your new WhatsApp group' });
                  });
                  const firstOther = allPlayers.find(p => p.id !== currentPlayerId);
                  if (firstOther) {
                    const phone = firstOther.phone.replace(/\D/g, '');
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(groupMsg)}`, '_blank');
                  }
                };

                return (
                  <div className="space-y-1.5">
                    <Button
                      variant="outline"
                      className="w-full touch-target"
                      onClick={handleCreateGroup}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Create WhatsApp Group
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center leading-tight">
                      Opens WhatsApp & copies a group message with all players
                    </p>
                  </div>
                );
              })()}
            </div>

            {isBookingClaimed && onReportResult && (
              <Button
                variant="secondary"
                onClick={onReportResult}
                className="w-full touch-target"
              >
                Report Result
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
