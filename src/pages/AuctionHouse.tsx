import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { PledgeCard } from '@/components/auction/PledgeCard';
import { PledgeForm } from '@/components/auction/PledgeForm';
import { StatusChip } from '@/components/ui/StatusChip';
import { Progress } from '@/components/ui/progress';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { EuroDisclaimer } from '@/components/ui/EuroDisclaimer';
import { usePlayer } from '@/contexts/PlayerContext';
import { supabase } from '@/integrations/supabase/client';
import type { PledgeItem, Player, Auction } from '@/lib/types';
import { Gavel, Plus, Pencil, Lock, Shuffle, TrendingDown, Clock } from 'lucide-react';
import { AuctionIntroModal } from '@/components/onboarding/AuctionIntroModal';

type CategoryFilter = 'all' | 'food' | 'drink' | 'object' | 'service' | 'chaos';
type SortMode = 'random' | 'expensive' | 'newest';

export default function AuctionHousePage() {
  const navigate = useNavigate();
  const { player, tournament, session, isLoading, refreshPlayer } = usePlayer();

  const [pledges, setPledges] = useState<PledgeItem[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [myPledges, setMyPledges] = useState<PledgeItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPledge, setEditingPledge] = useState<PledgeItem | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [sort, setSort] = useState<SortMode>('random');
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (!isLoading && !session) {
      navigate('/');
      return;
    }
    if (tournament && player) {
      loadData();
      const dismissed = localStorage.getItem(`auction_intro_dismissed_${player.id}`);
      if (!player.has_seen_auction_intro && !dismissed) {
        setShowIntro(true);
      }
    }
  }, [session, tournament, player, isLoading, navigate]);

  const handleIntroComplete = async (action: 'view' | 'pledge' | 'skip') => {
    setShowIntro(false);
    if (player) {
      await supabase.from('players').update({ has_seen_auction_intro: true }).eq('id', player.id);
      await refreshPlayer();
    }
    if (action === 'pledge') {
      setShowForm(true);
    }
  };

  const loadData = async () => {
    if (!tournament || !player) return;

    const [pledgeRes, playerRes, auctionRes] = await Promise.all([
      supabase.from('pledge_items').select('*').eq('tournament_id', tournament.id).order('created_at', { ascending: false }),
      supabase.from('players').select('*').eq('tournament_id', tournament.id),
      supabase.from('auctions').select('*').eq('tournament_id', tournament.id).maybeSingle(),
    ]);

    const allPledges = (pledgeRes.data || []) as PledgeItem[];
    setPlayers((playerRes.data || []) as Player[]);
    setAuction(auctionRes.data as Auction | null);

    const mine = allPledges.filter(p => p.pledged_by_player_id === player.id && p.status !== 'Hidden');
    setMyPledges(mine);

    // Show all Approved pledges to everyone. Show Draft pledges only to the player who created them.
    const visible = allPledges.filter(p =>
      p.status === 'Approved' || (p.status === 'Draft' && p.pledged_by_player_id === player.id)
    );
    setPledges(visible);
  };

  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);
  const activePlayers = useMemo(() => players.filter(p => p.status === 'Active'), [players]);

  // Count unique players who have pledged
  const playersWithPledges = useMemo(() => {
    const ids = new Set(pledges.map(p => p.pledged_by_player_id));
    return ids.size;
  }, [pledges]);

  const filteredPledges = useMemo(() => {
    let items = pledges;
    if (filter !== 'all') {
      items = items.filter(p => p.category === filter);
    }
    switch (sort) {
      case 'expensive':
        items = [...items].sort((a, b) => (b.estimate_high ?? b.estimate_low ?? 0) - (a.estimate_high ?? a.estimate_low ?? 0));
        break;
      case 'newest':
        items = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'random':
        items = [...items].sort(() => Math.random() - 0.5);
        break;
    }
    return items;
  }, [pledges, filter, sort]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-4xl animate-pulse">🏪</div>
      </div>
    );
  }

  if (!player || !tournament) {
    return (
      <>
        <PageLayout hasBottomNav={true}>
          <div className="text-center py-16 space-y-3">
            <div className="text-4xl">🏪</div>
            <p className="font-semibold">No active tournament</p>
            <p className="text-sm text-muted-foreground">Join a tournament to browse the Auction House</p>
            <Button variant="outline" onClick={() => navigate('/tournaments')} className="mt-2">Browse Tournaments</Button>
          </div>
        </PageLayout>
        <BottomNav />
      </>
    );
  }

  const auctionLive = auction?.status === 'Live';
  const auctionEnded = auction?.status === 'Ended';
  const hasAnyPledge = myPledges.length > 0;
  const canAddMore = !auctionLive && !auctionEnded;

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'food', label: '🍕 Food' },
    { key: 'drink', label: '🍷 Drink' },
    { key: 'object', label: '🎁 Object' },
    { key: 'service', label: '💆 Service' },
    { key: 'chaos', label: '🎲 Chaos' },
  ];

  return (
    <>
      <AuctionIntroModal
        open={showIntro}
        hasPledged={hasAnyPledge}
        onViewGallery={() => handleIntroComplete('view')}
        onAddPledge={() => handleIntroComplete('pledge')}
        onSkip={() => handleIntroComplete('skip')}
        onDontShowAgain={() => {
          if (player) {
            localStorage.setItem(`auction_intro_dismissed_${player.id}`, 'true');
          }
        }}
      />
      <PageLayout
        header={
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h1 className="font-bold text-xl flex items-center gap-2">
                <Gavel className="h-6 w-6 text-chaos-orange" />
                Auction House
              </h1>
              {auctionLive ? (
                <StatusChip variant="live" pulse>Live</StatusChip>
              ) : auctionEnded ? (
                <StatusChip variant="ended">Ended</StatusChip>
              ) : (
                <StatusChip variant="neutral" size="sm">
                  <Lock className="h-3 w-3 mr-1" />
                  Gallery
                </StatusChip>
              )}
            </div>

            {/* Auction countdown when live */}
            {auctionLive && auction?.ends_at && (
              <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-center space-y-1">
                <p className="text-xs text-muted-foreground">Auction ends in</p>
                <CountdownTimer targetDate={auction.ends_at} variant="large" />
                <EuroDisclaimer variant="inline" />
              </div>
            )}

            {!auctionLive && !auctionEnded && (
              <p className="text-sm text-muted-foreground">
                Browse pledges. Bidding unlocks when the auction goes live.
              </p>
            )}

            {/* Pledge progress - how many players have contributed */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {playersWithPledges}/{activePlayers.length} players have pledged ({pledges.length} items total)
                </span>
                <span className="font-medium text-primary">
                  {playersWithPledges === activePlayers.length ? '✅ All in!' : `${activePlayers.length - playersWithPledges} missing`}
                </span>
              </div>
              <Progress value={activePlayers.length > 0 ? (playersWithPledges / activePlayers.length) * 100 : 0} className="h-2" />
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Add pledge CTA */}
          {!hasAnyPledge && !showForm && canAddMore && (
            <button
              onClick={() => { setEditingPledge(null); setShowForm(true); }}
              className="w-full rounded-xl border-2 border-dashed border-primary/40 hover:border-primary/70 transition-colors p-6 text-center space-y-2"
            >
              <Plus className="h-8 w-8 mx-auto text-primary" />
              <p className="font-semibold text-primary">Submit your pledge</p>
              <p className="text-xs text-muted-foreground">Everyone brings something to the chaos</p>
            </button>
          )}

          {/* Has pledges - show status + add more */}
          {hasAnyPledge && !showForm && (
            <div className="space-y-2">
              <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">
                    You've pledged {myPledges.length} item{myPledges.length > 1 ? 's' : ''} ✅
                  </p>
                  <p className="text-xs text-muted-foreground">They become biddable lots when the auction starts</p>
                </div>
                {canAddMore && (
                  <Button variant="outline" size="sm" onClick={() => { setEditingPledge(null); setShowForm(true); }}>
                    <Plus className="h-3 w-3 mr-1" />Add more
                  </Button>
                )}
              </div>
            </div>
          )}

          {showForm && (
            <PledgeForm
              tournamentId={tournament.id}
              playerId={player.id}
              existing={editingPledge}
              onSaved={() => { setShowForm(false); setEditingPledge(null); loadData(); }}
              onCancel={() => { setShowForm(false); setEditingPledge(null); }}
            />
          )}

          {/* Category filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {categories.map(c => (
              <Button
                key={c.key}
                variant={filter === c.key ? 'default' : 'outline'}
                size="sm"
                className={filter === c.key ? 'bg-gradient-primary shrink-0' : 'shrink-0'}
                onClick={() => setFilter(c.key)}
              >
                {c.label}
              </Button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort:</span>
            {([
              { key: 'random', label: 'Random', icon: Shuffle },
              { key: 'expensive', label: 'Top value', icon: TrendingDown },
              { key: 'newest', label: 'Newest', icon: Clock },
            ] as const).map(s => (
              <Button
                key={s.key}
                variant={sort === s.key ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSort(s.key)}
              >
                <s.icon className="h-3 w-3 mr-1" />{s.label}
              </Button>
            ))}
          </div>

          {/* Gallery grid */}
          <div className="grid grid-cols-2 gap-3">
            {filteredPledges.map(pledge => (
              <PledgeCard
                key={pledge.id}
                pledge={pledge}
                pledger={playerMap.get(pledge.pledged_by_player_id)}
                isOwner={pledge.pledged_by_player_id === player.id}
                onClick={() => {
                  if (auctionLive) {
                    navigate(`/auction/pledge/${pledge.id}`);
                  } else {
                    navigate(`/auction/${pledge.id}`);
                  }
                }}
              />
            ))}
          </div>

          {filteredPledges.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🏜️</div>
              <p className="text-muted-foreground text-sm">
                {filter === 'all' ? 'No pledges yet. Be the first!' : 'No items in this category yet'}
              </p>
            </div>
          )}

          {/* Lock state message */}
          {!auctionLive && !auctionEnded && filteredPledges.length > 0 && (
            <div className="rounded-lg bg-muted/50 border border-border p-4 text-center space-y-1">
              <Lock className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                Bidding unlocks when auction goes live
              </p>
              <p className="text-xs text-muted-foreground/70">
                Admin will launch the auction after the tournament ends
              </p>
            </div>
          )}

          {/* Go to live auction */}
          {auctionLive && (
            <Button
              onClick={() => navigate('/auction/live')}
              variant="hot"
              className="w-full touch-target"
            >
              <Gavel className="mr-2 h-5 w-5" />
              Go to Live Auction →
            </Button>
          )}
        </div>
      </PageLayout>

      <BottomNav />
    </>
  );
}
