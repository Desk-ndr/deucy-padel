import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusChip } from '@/components/ui/StatusChip';
import { DeleteTournamentDialog } from '@/components/admin/DeleteTournamentDialog';
import type { Tournament } from '@/lib/types';
import { Plus, Trophy, Users, Calendar, LogOut, Loader2, Trash2, ChevronRight, Award, Shield, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatEuros } from '@/lib/euros';

type AdminGroup = 'live' | 'ready' | 'filling' | 'launching_soon' | 'coming_soon' | 'finished' | 'archived';

interface TournamentWithMeta {
  tournament: Tournament;
  playerCount: number;
  group: AdminGroup;
}

function getAdminGroup(t: Tournament, playerCount: number): AdminGroup {
  if (t.status === 'Live' || t.status === 'AuctionLive') return 'live';
  if (t.status === 'SignupOpen' && playerCount >= t.max_players) return 'ready';
  if (t.status === 'SignupOpen') return 'filling';
  if (t.status === 'Finished') return 'finished';
  if (t.status === 'Closed') return 'archived';
  // Draft
  if (t.signup_open_at) return 'launching_soon';
  return 'coming_soon';
}

const GROUP_ORDER: AdminGroup[] = ['live', 'ready', 'filling', 'launching_soon', 'coming_soon', 'finished', 'archived'];

const GROUP_LABELS: Record<AdminGroup, string> = {
  live: '🔴 Live',
  ready: '✅ Ready',
  filling: '📝 Filling',
  launching_soon: '🚀 Launching Soon',
  coming_soon: '📅 Coming Soon',
  finished: '🏁 Finished',
  archived: '📦 Archived',
};

const GROUP_CHIP_VARIANT: Record<AdminGroup, 'live' | 'success' | 'warning' | 'neutral' | 'ended'> = {
  live: 'live',
  ready: 'success',
  filling: 'warning',
  launching_soon: 'neutral',
  coming_soon: 'neutral',
  finished: 'ended',
  archived: 'ended',
};

function TierIcon({ tier }: { tier: string }) {
  switch (tier) {
    case 'Major': return <Award className="h-3 w-3 text-chaos-orange" />;
    case 'Mini': return <Zap className="h-3 w-3 text-accent" />;
    default: return <Shield className="h-3 w-3 text-primary" />;
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<TournamentWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TournamentWithMeta | null>(null);

  useEffect(() => { checkAuthAndLoad(); }, []);

  const checkAuthAndLoad = async () => {
    try {
      // Verify Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/admin');
        return;
      }

      // Check admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges.',
          variant: 'destructive',
        });
        await supabase.auth.signOut();
        navigate('/admin');
        return;
      }

      setIsAuthorized(true);
      await loadTournaments();
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify admin access.',
        variant: 'destructive',
      });
      navigate('/admin');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTournaments = async () => {
    const { data: tournamentsData, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    const tournaments = (tournamentsData || []) as Tournament[];

    // Get player counts
    const results: TournamentWithMeta[] = await Promise.all(
      tournaments.map(async (t) => {
        const { count } = await supabase
          .from('players')
          .select('id', { count: 'exact', head: true })
          .eq('tournament_id', t.id)
          .eq('status', 'Active');
        const playerCount = count || 0;
        return { tournament: t, playerCount, group: getAdminGroup(t, playerCount) };
      })
    );

    // Sort by group order, then by start date within group
    results.sort((a, b) => {
      const aIdx = GROUP_ORDER.indexOf(a.group);
      const bIdx = GROUP_ORDER.indexOf(b.group);
      if (aIdx !== bIdx) return aIdx - bIdx;
      // Within group: earliest start date first
      const aDate = a.tournament.started_at || a.tournament.signup_open_at || a.tournament.created_at;
      const bDate = b.tournament.started_at || b.tournament.signup_open_at || b.tournament.created_at;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });

    setItems(results);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) return null;

  // Group items
  const grouped = GROUP_ORDER.map(group => ({
    group,
    label: GROUP_LABELS[group],
    items: items.filter(i => i.group === group),
  })).filter(g => g.items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage your tournaments</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Button
          className="w-full touch-target bg-gradient-primary"
          onClick={() => navigate('/admin/tournaments/new')}
        >
          <Plus className="mr-2 h-5 w-5" />
          Create Tournament
        </Button>

        {grouped.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">🎾</div>
              <p className="text-muted-foreground">No tournaments yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first tournament to get started</p>
            </CardContent>
          </Card>
        ) : (
          grouped.map(({ group, label, items: groupItems }) => (
            <div key={group} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
                {label}
              </h2>
              {groupItems.map(({ tournament, playerCount }) => (
                <Card
                  key={tournament.id}
                  className="hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/tournaments/${tournament.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <TierIcon tier={tournament.tier} />
                          <h3 className="font-semibold text-sm truncate">{tournament.name}</h3>
                          <StatusChip variant={GROUP_CHIP_VARIANT[group]} size="sm">
                            {tournament.status}
                          </StatusChip>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {playerCount}/{tournament.max_players}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {tournament.round_duration_days}d × {tournament.rounds_count || '?'}
                          </span>
                          <span>{formatEuros(tournament.starting_credits)} start</span>
                          {tournament.signup_open_at && (
                            <span>Opens {new Date(tournament.signup_open_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {tournament.status !== 'Live' && tournament.status !== 'AuctionLive' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({ tournament, playerCount, group: getAdminGroup(tournament, playerCount) });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))
        )}
      </main>

      {deleteTarget && (
        <DeleteTournamentDialog
          open={!!deleteTarget}
          onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
          tournament={deleteTarget.tournament}
          hasPlayersOrPledges={deleteTarget.playerCount > 0}
          onDeleted={() => {
            setDeleteTarget(null);
            setIsLoading(true);
            loadTournaments().finally(() => setIsLoading(false));
          }}
        />
      )}
    </div>
  );
}
