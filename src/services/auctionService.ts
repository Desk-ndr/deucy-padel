import { supabase } from '@/integrations/supabase/client';
import type { Auction, AuctionLot, AuctionLotWithDetails, Bid, PledgeItem } from '@/lib/types';

export async function getAuction(tournamentId: string): Promise<Auction | null> {
  const { data, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('tournament_id', tournamentId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch auction: ${error.message}`);
  return data as Auction | null;
}

export async function getAuctionLots(auctionId: string): Promise<AuctionLotWithDetails[]> {
  const { data, error } = await supabase
    .from('auction_lots')
    .select(
      `
      *,
      pledge_item:pledge_items(*),
      current_winner:players!current_winner_player_id(*)
      `
    )
    .eq('auction_id', auctionId)
    .eq('status', 'Live')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch auction lots: ${error.message}`);

  // Count bids for each lot
  const lotsWithCounts = await Promise.all(
    data.map(async (lot) => {
      const { count, error: countError } = await supabase
        .from('bids')
        .select('*', { count: 'exact', head: true })
        .eq('lot_id', lot.id);

      if (countError) {
        console.error(`Failed to count bids for lot ${lot.id}:`, countError);
      }

      return {
        ...lot,
        bids_count: count || 0,
      };
    })
  );

  return lotsWithCounts as AuctionLotWithDetails[];
}

export async function getLotDetail(lotId: string): Promise<{
  lot: AuctionLot;
  pledge: PledgeItem;
  bids: (Bid & { bidder_name: string })[];
}> {
  // Fetch the lot with its pledge
  const { data: lotData, error: lotError } = await supabase
    .from('auction_lots')
    .select(
      `
      *,
      pledge_item:pledge_items(*)
      `
    )
    .eq('id', lotId)
    .single();

  if (lotError) throw new Error(`Failed to fetch lot detail: ${lotError.message}`);

  // Fetch bids with bidder names
  const { data: bidsData, error: bidsError } = await supabase
    .from('bids')
    .select(
      `
      *,
      bidder:players!bidder_player_id(full_name)
      `
    )
    .eq('lot_id', lotId)
    .order('created_at', { ascending: false });

  if (bidsError) throw new Error(`Failed to fetch bids: ${bidsError.message}`);

  const bidsWithNames = (bidsData || []).map((bid) => ({
    ...bid,
    bidder_name: (bid.bidder as { full_name: string } | null)?.full_name || 'Unknown',
  }));

  return {
    lot: lotData as AuctionLot,
    pledge: (lotData as any).pledge_item as PledgeItem,
    bids: bidsWithNames as (Bid & { bidder_name: string })[],
  };
}

export async function getBidsForLot(lotId: string): Promise<(Bid & { bidder_name: string })[]> {
  const { data, error } = await supabase
    .from('bids')
    .select(
      `
      *,
      bidder:players!bidder_player_id(full_name)
      `
    )
    .eq('lot_id', lotId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch bids for lot: ${error.message}`);

  return (data || []).map((bid) => ({
    ...bid,
    bidder_name: (bid.bidder as { full_name: string } | null)?.full_name || 'Unknown',
  })) as (Bid & { bidder_name: string })[];
}

export async function getPlayerPledge(
  tournamentId: string,
  playerId: string
): Promise<PledgeItem | null> {
  const { data, error } = await supabase
    .from('pledge_items')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('pledged_by_player_id', playerId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch player pledge: ${error.message}`);
  return data as PledgeItem | null;
}

export async function submitPledge(pledgeData: Partial<PledgeItem>): Promise<PledgeItem> {
  const { data, error } = await supabase
    .from('pledge_items')
    .insert({
      tournament_id: pledgeData.tournament_id!,
      pledged_by_player_id: pledgeData.pledged_by_player_id!,
      title: pledgeData.title!,
      description: pledgeData.description || null,
      category: pledgeData.category!,
      quantity_text: pledgeData.quantity_text || null,
      image_url: pledgeData.image_url || null,
      approved: false,
      estimate_low: pledgeData.estimate_low || null,
      estimate_high: pledgeData.estimate_high || null,
      price_euro: pledgeData.price_euro || null,
      status: 'Draft',
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to submit pledge: ${error.message}`);
  return data as PledgeItem;
}

export async function updatePledge(pledgeId: string, data: Partial<PledgeItem>): Promise<void> {
  const { error } = await supabase
    .from('pledge_items')
    .update(data)
    .eq('id', pledgeId);

  if (error) throw new Error(`Failed to update pledge: ${error.message}`);
}
