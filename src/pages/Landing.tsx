import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusChip } from '@/components/ui/StatusChip';
import { supabase } from '@/integrations/supabase/client';
import { usePlayer } from '@/contexts/PlayerContext';
import type { Tournament } from '@/lib/types';
import { Users, Trophy, Loader2, Settings } from 'lucide-react';
import { formatEuros } from '@/lib/euros';

export default function LandingPage() {
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get('t');
  const navigate = useNavigate();
  const { session, isLoading: sessionLoading } = usePlayer();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session && !sessionLoading) {
      // Already logged in, redirect to home
      navigate('/tournaments');
      return;
    }

    const loadTournament = async () => {
      if (!tournamentId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: t, error } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', tournamentId)
          .single();

        if (error) throw error;
        setTournament(t as Tournament);

        // Get player count
        const { count } = await supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId);

        setPlayerCount(count || 0);
      } catch (error) {
        console.error('Error loading tournament:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTournament();
  }, [tournamentId, session, sessionLoading, navigate]);

  if (sessionLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournamentId || !tournament) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="text-6xl mb-6">🎾</div>
        <h1 className="text-3xl font-bold text-gradient-primary mb-4">Deucy</h1>
        <p className="text-muted-foreground mb-8 max-w-sm">
          Where friendships are tested and legends are made. Need an invite link to join a tournament.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Ask your tournament organizer for the invite link
        </p>
        <Link 
          to="/admin" 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <Settings className="h-4 w-4" />
          Admin Panel
        </Link>
      </div>
    );
  }

  const statusVariant = 
    tournament.status === 'Live' ? 'live' :
    tournament.status === 'SignupOpen' ? 'success' :
    tournament.status === 'AuctionLive' ? 'warning' :
    tournament.status === 'Finished' || tournament.status === 'Closed' ? 'ended' : 'neutral';

  const taglines = [
    "Where friendships are tested",
    "May your partner not choke",
    "Ego optional, chaos mandatory",
    "Rotating partners, lasting trauma",
  ];
  const tagline = taglines[Math.floor(Math.random() * taglines.length)];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-7xl mb-6 animate-fade-in">🎾</div>
        
        <h1 className="text-4xl font-bold text-gradient-primary mb-2 animate-fade-in">
          {tournament.name}
        </h1>
        
        {tournament.club_name && (
          <p className="text-lg text-muted-foreground mb-4">
            @ {tournament.club_name}
          </p>
        )}

        <p className="text-lg text-muted-foreground italic mb-6">
          "{tagline}"
        </p>

        <StatusChip variant={statusVariant} pulse={tournament.status === 'Live'}>
          {tournament.status === 'SignupOpen' ? 'Signups Open' :
           tournament.status === 'Live' ? 'Tournament Live' :
           tournament.status === 'AuctionLive' ? 'Auction Live' :
           tournament.status}
        </StatusChip>

        {/* Stats */}
        <Card className="chaos-card mt-8 w-full max-w-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-around">
              <div className="flex flex-col items-center">
                <Users className="h-5 w-5 text-primary mb-1" />
                <span className="text-2xl font-bold">{playerCount}</span>
                <span className="text-xs text-muted-foreground">Players</span>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="flex flex-col items-center">
                <Trophy className="h-5 w-5 text-accent mb-1" />
                <span className="text-2xl font-bold">{formatEuros(tournament.starting_credits, tournament.display_decimals)}</span>
                <span className="text-xs text-muted-foreground">Starting Credits</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Join code */}
        {tournament.join_code && (
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Join Code</p>
            <p className="text-2xl font-mono font-bold text-primary tracking-wider">
              {tournament.join_code}
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-6 space-y-3 safe-bottom">
        {tournament.status === 'SignupOpen' && (
          <Button
            variant="hot"
            className="w-full touch-target text-lg"
            onClick={() => navigate(`/join?t=${tournamentId}`)}
          >
            Join Tournament
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full touch-target"
          onClick={() => navigate(`/login?t=${tournamentId}`)}
        >
          I Already Joined - Sign In
        </Button>

        <Link 
          to="/admin" 
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors pt-4"
        >
          <Settings className="h-4 w-4" />
          Admin Panel
        </Link>
      </div>
    </div>
  );
}
