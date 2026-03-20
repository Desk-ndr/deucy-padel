import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { BottomNav } from '@/components/layout/BottomNav';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { CreditsDisplay } from '@/components/ui/CreditsDisplay';
import { StatusChip } from '@/components/ui/StatusChip';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCategoryConfig } from '@/components/auction/PledgeCard';
import { usePlayer } from '@/contexts/PlayerContext';
import { supabase } from '@/integrations/supabase/client';
import type { Player, PledgeItem, Round } from '@/lib/types';
import { ArrowLeft, Camera } from 'lucide-react';
import { formatEuros } from '@/lib/euros';
import { PlayerLedger } from '@/components/profile/PlayerLedger';
import { BettingAccuracy } from '@/components/profile/BettingAccuracy';

export default function PlayerProfilePage() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const { player: currentPlayer, tournament, session, isLoading, refreshPlayer } = usePlayer();

  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);
  const [pledges, setPledges] = useState<PledgeItem[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [rank, setRank] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSelf = currentPlayer?.id === playerId;

  useEffect(() => {
    if (!isLoading && !session) {
      navigate('/');
      return;
    }
    if (tournament && playerId) {
      loadProfile();
    }
  }, [playerId, tournament, isLoading, session, navigate]);

  const loadProfile = async () => {
    if (!tournament || !playerId) return;

    const [playerRes, pledgeRes, roundRes] = await Promise.all([
      supabase.from('players').select('*').eq('id', playerId).single(),
      supabase.from('pledge_items').select('*').eq('pledged_by_player_id', playerId).eq('tournament_id', tournament.id).order('created_at', { ascending: false }),
      supabase.from('rounds').select('*').eq('tournament_id', tournament.id).order('index', { ascending: true }),
    ]);

    if (playerRes.data) {
      setProfilePlayer(playerRes.data as Player);

      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id)
        .eq('status', 'Active')
        .gt('credits_balance', (playerRes.data as Player).credits_balance);

      setRank((count || 0) + 1);
    } else {
      setNotFound(true);
    }

    setPledges((pledgeRes.data || []) as PledgeItem[]);
    setRounds((roundRes.data || []) as Round[]);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentPlayer) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${currentPlayer.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase
        .from('players')
        .update({ avatar_url: avatarUrl })
        .eq('id', currentPlayer.id);

      await refreshPlayer();
      setProfilePlayer(prev => prev ? { ...prev, avatar_url: avatarUrl } : prev);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  if (notFound) {
    return (
      <>
        <PageLayout hasBottomNav={true}>
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-semibold mb-2">Player not found</p>
            <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
          </div>
        </PageLayout>
        <BottomNav />
      </>
    );
  }

  if (isLoading || !profilePlayer || !tournament) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-4xl animate-pulse">👤</div>
      </div>
    );
  }

  const roundMap = new Map(rounds.map(r => [r.id, r]));
  const setDiff = profilePlayer.sets_won - profilePlayer.sets_lost;
  const showDecimals = tournament.display_decimals;

  return (
    <>
      <PageLayout
        header={
          <div className="p-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg">Player Profile</h1>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Hero header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <PlayerAvatar player={profilePlayer} className="h-24 w-24 text-2xl" />
              {isSelf && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <div>
              <h2 className="text-xl font-bold">{profilePlayer.full_name}</h2>
              <p className="text-sm text-muted-foreground">Rank #{rank}</p>
            </div>

            <CreditsDisplay amount={profilePlayer.credits_balance} variant="large" showDisclaimer showDecimals={showDecimals} />
          </div>

          {/* Stats chips */}
          <div className="flex justify-center gap-2 flex-wrap">
            <StatusChip variant="neutral" size="sm">
              🎾 {profilePlayer.matches_played} played
            </StatusChip>
            <StatusChip variant="info" size="sm">
              Sets Won: {profilePlayer.sets_won}
            </StatusChip>
            <StatusChip variant={setDiff >= 0 ? 'success' : 'warning'} size="sm">
              Sets: {setDiff >= 0 ? '+' : ''}{setDiff}
            </StatusChip>
            {profilePlayer.no_shows > 0 && (
              <StatusChip variant="error" size="sm">
                ⚠️ {profilePlayer.no_shows} no-show{profilePlayer.no_shows > 1 ? 's' : ''}
              </StatusChip>
            )}
          </div>

          {/* Pledges section */}
          {pledges.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {pledges.length === 1 ? 'Pledge' : 'Pledges'}
              </h3>

              {pledges.map((pledge) => {
                const cat = getCategoryConfig(pledge.category);
                const round = pledge.round_id ? roundMap.get(pledge.round_id) : null;
                const estimate = pledge.estimate_low != null || pledge.estimate_high != null;

                return (
                  <Card
                    key={pledge.id}
                    className="overflow-hidden cursor-pointer hover:border-primary/40 transition-all"
                    onClick={() => navigate(`/auction/${pledge.id}`)}
                  >
                    {pledge.image_url && (
                      <div className="aspect-video bg-muted overflow-hidden">
                        <img
                          src={pledge.image_url}
                          alt={pledge.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{pledge.title}</p>
                        {round && (
                          <span className="text-[10px] font-bold rounded-full bg-muted px-2 py-0.5">
                            Round {round.index}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cat.color}`}>
                          {cat.emoji} {cat.label}
                        </span>
                        {estimate ? (
                          <span className="text-xs text-primary font-medium">
                            {formatEuros(pledge.estimate_low ?? 0, showDecimals)}–{formatEuros(pledge.estimate_high ?? 0, showDecimals)}
                          </span>
                        ) : pledge.status !== 'Draft' ? (
                          <span className="text-xs text-muted-foreground">Pending estimate</span>
                        ) : null}
                      </div>
                      {pledge.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{pledge.description}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {pledges.length === 0 && (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">📦</div>
              <p className="text-sm text-muted-foreground">No pledges yet</p>
            </div>
          )}

          {/* Credit Ledger - always visible */}
          <PlayerLedger
            playerId={profilePlayer.id}
            tournamentId={tournament.id}
            showDecimals={showDecimals}
            startingCredits={tournament.starting_credits}
          />
        </div>
      </PageLayout>
      <BottomNav />
    </>
  );
}
