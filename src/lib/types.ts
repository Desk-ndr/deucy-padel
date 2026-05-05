// Enum types matching database
export type TournamentStatus = 'Draft' | 'SignupOpen' | 'Live' | 'Finished' | 'AuctionLive' | 'Closed';
export type PlayerStatus = 'Active' | 'InactiveWarning' | 'Removed';
export type PlayerGender = 'male' | 'female' | 'other' | 'prefer_not';
export type RoundStatus = 'Upcoming' | 'Live' | 'Locked' | 'Completed';
export type MatchStatus = 'Scheduled' | 'BookingClaimed' | 'Played' | 'Overdue' | 'AutoResolved' | 'PendingConfirmation' | 'Disputed';
export type CreditType = 'StartingGrant' | 'ParticipationBonus' | 'MatchStake' | 'MatchPayout' | 'Penalty' | 'AdminAdjustment' | 'AuctionHold' | 'AuctionRelease' | 'AuctionSettlement' | 'BetStake' | 'BetPayout';
export type PledgeCategory = 'food' | 'drink' | 'object' | 'service' | 'chaos';
export type PledgeStatus = 'Draft' | 'Approved' | 'Hidden';
export type AuctionStatus = 'Draft' | 'Live' | 'Ended';
export type LotStatus = 'Live' | 'Ended';
export type EscrowStatus = 'Active' | 'Released' | 'Settled';
export type BetStatus = 'Pending' | 'Won' | 'Lost' | 'Cancelled';

// Database row types
export type TournamentTier = 'Major' | 'League' | 'Mini';

export interface Tournament {
  id: string;
  name: string;
  club_name: string | null;
  booking_url: string | null;
  status: TournamentStatus;
  created_by_admin_id: string | null;
  max_players: number;
  min_players: number;
  round_duration_days: number;
  rounds_count: number | null;
  playoffs_enabled: boolean;
  stake_per_player: number;
  participation_bonus: number;
  penalty_amount: number;
  starting_credits: number; // stored as cents (e.g. 2000 = €20.00)
  join_code: string | null;
  pledge_gate_enabled: boolean;
  pledge_deadline_hours: number;
  euros_per_set_win: number; // cents gained per set won
  euros_per_set_loss: number; // cents lost per set lost
  allow_negative_balance: boolean;
  display_decimals: boolean;
  tier: TournamentTier;
  // Betting settings
  betting_enabled: boolean;
  bank_balance: number; // cents
  per_round_bet_cap: number; // cents
  per_bet_max: number; // cents
  min_protected_balance: number; // cents
  payout_multiplier: number;
  signup_open_at: string | null;
  signup_close_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  tournament_id: string | null;
  full_name: string;
  phone: string;
  pin_hash: string;
  avatar_url: string | null;
  gender: PlayerGender | null;
  confirmed: boolean;
  status: PlayerStatus;
  credits_balance: number; // stored as cents
  matches_played: number;
  sets_won: number;
  sets_lost: number;
  match_wins: number;
  match_losses: number;
  no_shows: number;
  session_token: string | null;
  has_seen_onboarding: boolean;
  has_seen_auction_intro: boolean;
  created_at: string;
  updated_at: string;
}

export interface Round {
  id: string;
  tournament_id: string;
  index: number;
  start_at: string | null;
  end_at: string | null;
  status: RoundStatus;
  is_playoff: boolean;
  playoff_type: string | null;
  created_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  round_id: string;
  team_a_player1_id: string | null;
  team_a_player2_id: string | null;
  team_b_player1_id: string | null;
  team_b_player2_id: string | null;
  status: MatchStatus;
  booking_claimed_by_player_id: string | null;
  booking_claimed_at: string | null;
  played_at: string | null;
  sets_a: number;
  sets_b: number;
  is_unfinished: boolean;
  deadline_at: string | null;
  pot_total_credits: number;
  is_bye: boolean;
  bye_player_id: string | null;
  reported_by_player_id: string | null;
  reported_at: string | null;
  confirmed_by_player_id: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface CreditLedgerEntry {
  id: string;
  tournament_id: string;
  player_id: string;
  match_id: string | null;
  round_id: string | null;
  type: CreditType;
  amount: number; // stored as cents
  note: string | null;
  created_at: string;
}

export interface PledgeItem {
  id: string;
  tournament_id: string;
  pledged_by_player_id: string;
  round_id: string | null;
  title: string;
  description: string | null;
  category: PledgeCategory;
  quantity_text: string | null;
  image_url: string | null;
  approved: boolean;
  estimate_low: number | null; // cents (€)
  estimate_high: number | null; // cents (€)
  price_euro: number | null; // cents – admin-set starting price
  status: PledgeStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Auction {
  id: string;
  tournament_id: string;
  starts_at: string | null;
  ends_at: string | null;
  status: AuctionStatus;
  anti_sniping_enabled: boolean;
  duration_hours: number;
  delivery_location: string | null;
  delivery_maps_url: string | null;
  delivery_deadline: string | null;
  created_at: string;
}

export interface AuctionLot {
  id: string;
  auction_id: string;
  pledge_item_id: string;
  current_bid: number | null; // cents
  current_winner_player_id: string | null;
  min_increment: number; // cents
  ends_at: string | null;
  extensions_count: number;
  status: LotStatus;
  created_at: string;
}

export interface Bid {
  id: string;
  lot_id: string;
  bidder_player_id: string;
  amount: number; // cents
  created_at: string;
}

export interface EscrowHold {
  id: string;
  lot_id: string;
  bidder_player_id: string;
  reserved_amount: number; // cents
  status: EscrowStatus;
  created_at: string;
  released_at: string | null;
}

export interface Notification {
  id: string;
  tournament_id: string;
  player_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

// Extended types with relations
export interface MatchWithPlayers extends Match {
  team_a_player1?: Player;
  team_a_player2?: Player;
  team_b_player1?: Player;
  team_b_player2?: Player;
  bye_player?: Player;
}

export interface AuctionLotWithDetails extends AuctionLot {
  pledge_item?: PledgeItem;
  current_winner?: Player;
  bids_count?: number;
}

// Session type for player auth
export interface PlayerSession {
  playerId: string;
  tournamentId: string | null;
  playerName: string;
  token: string;
}

// Match betting
export interface MatchBet {
  id: string;
  match_id: string;
  player_id: string;
  tournament_id: string;
  round_id: string;
  predicted_winner: 'team_a' | 'team_b';
  stake: number; // cents
  payout: number | null; // cents
  status: BetStatus;
  settled_at: string | null;
  created_at: string;
}

export interface MatchBetWithPlayer extends MatchBet {
  player?: Player;
}

// Waitlist
export type WaitlistStatus = 'waiting' | 'invited' | 'assigned' | 'confirmed' | 'removed' | 'no_response' | 'dropped';

export interface WaitlistEntry {
  id: string;
  full_name: string;
  phone: string;
  note: string | null;
  tournament_id: string | null;
  status: WaitlistStatus;
  priority: boolean;
  assigned_tournament_id: string | null;
  assigned_at: string | null;
  invite_expires_at: string | null;
  created_at: string;
  updated_at: string;
}
