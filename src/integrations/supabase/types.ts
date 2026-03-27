export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      auction_lots: {
        Row: {
          auction_id: string
          created_at: string
          current_bid: number | null
          current_winner_player_id: string | null
          ends_at: string | null
          extensions_count: number
          id: string
          min_increment: number
          pledge_item_id: string
          status: Database["public"]["Enums"]["lot_status"]
        }
        Insert: {
          auction_id: string
          created_at?: string
          current_bid?: number | null
          current_winner_player_id?: string | null
          ends_at?: string | null
          extensions_count?: number
          id?: string
          min_increment?: number
          pledge_item_id: string
          status?: Database["public"]["Enums"]["lot_status"]
        }
        Update: {
          auction_id?: string
          created_at?: string
          current_bid?: number | null
          current_winner_player_id?: string | null
          ends_at?: string | null
          extensions_count?: number
          id?: string
          min_increment?: number
          pledge_item_id?: string
          status?: Database["public"]["Enums"]["lot_status"]
        }
        Relationships: [
          {
            foreignKeyName: "auction_lots_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_lots_current_winner_player_id_fkey"
            columns: ["current_winner_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_lots_pledge_item_id_fkey"
            columns: ["pledge_item_id"]
            isOneToOne: true
            referencedRelation: "pledge_items"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          anti_sniping_enabled: boolean
          created_at: string
          delivery_deadline: string | null
          delivery_location: string | null
          delivery_maps_url: string | null
          duration_hours: number
          ends_at: string | null
          id: string
          starts_at: string | null
          status: Database["public"]["Enums"]["auction_status"]
          tournament_id: string
        }
        Insert: {
          anti_sniping_enabled?: boolean
          created_at?: string
          delivery_deadline?: string | null
          delivery_location?: string | null
          delivery_maps_url?: string | null
          duration_hours?: number
          ends_at?: string | null
          id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["auction_status"]
          tournament_id: string
        }
        Update: {
          anti_sniping_enabled?: boolean
          created_at?: string
          delivery_deadline?: string | null
          delivery_location?: string | null
          delivery_maps_url?: string | null
          duration_hours?: number
          ends_at?: string | null
          id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["auction_status"]
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auctions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: true
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          bidder_player_id: string
          created_at: string
          id: string
          lot_id: string
        }
        Insert: {
          amount: number
          bidder_player_id: string
          created_at?: string
          id?: string
          lot_id: string
        }
        Update: {
          amount?: number
          bidder_player_id?: string
          created_at?: string
          id?: string
          lot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_bidder_player_id_fkey"
            columns: ["bidder_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "auction_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      blitz_bets: {
        Row: {
          bettor_index: number
          created_at: string
          id: string
          predicted_winner: string
          round_index: number
          stake: number
          status: string
          tournament_id: string
        }
        Insert: {
          bettor_index: number
          created_at?: string
          id?: string
          predicted_winner: string
          round_index: number
          stake?: number
          status?: string
          tournament_id: string
        }
        Update: {
          bettor_index?: number
          created_at?: string
          id?: string
          predicted_winner?: string
          round_index?: number
          stake?: number
          status?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blitz_bets_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "blitz_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      blitz_pledges: {
        Row: {
          created_at: string
          id: string
          item_text: string
          player_index: number
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_text: string
          player_index: number
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_text?: string
          player_index?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blitz_pledges_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "blitz_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      blitz_rounds: {
        Row: {
          created_at: string
          id: string
          round_index: number
          status: string
          team_a_score: number | null
          team_b_score: number | null
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          round_index: number
          status?: string
          team_a_score?: number | null
          team_b_score?: number | null
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          round_index?: number
          status?: string
          team_a_score?: number | null
          team_b_score?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blitz_rounds_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "blitz_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      blitz_tournaments: {
        Row: {
          created_at: string
          current_round: number
          id: string
          name: string
          players: Json
          status: string
        }
        Insert: {
          created_at?: string
          current_round?: number
          id?: string
          name?: string
          players?: Json
          status?: string
        }
        Update: {
          created_at?: string
          current_round?: number
          id?: string
          name?: string
          players?: Json
          status?: string
        }
        Relationships: []
      }
      credit_ledger_entries: {
        Row: {
          amount: number
          created_at: string
          id: string
          match_id: string | null
          note: string | null
          player_id: string
          round_id: string | null
          tournament_id: string
          type: Database["public"]["Enums"]["credit_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          match_id?: string | null
          note?: string | null
          player_id: string
          round_id?: string | null
          tournament_id: string
          type: Database["public"]["Enums"]["credit_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          match_id?: string | null
          note?: string | null
          player_id?: string
          round_id?: string | null
          tournament_id?: string
          type?: Database["public"]["Enums"]["credit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_entries_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_entries_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_entries_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_holds: {
        Row: {
          bidder_player_id: string
          created_at: string
          id: string
          lot_id: string
          released_at: string | null
          reserved_amount: number
          status: Database["public"]["Enums"]["escrow_status"]
        }
        Insert: {
          bidder_player_id: string
          created_at?: string
          id?: string
          lot_id: string
          released_at?: string | null
          reserved_amount: number
          status?: Database["public"]["Enums"]["escrow_status"]
        }
        Update: {
          bidder_player_id?: string
          created_at?: string
          id?: string
          lot_id?: string
          released_at?: string | null
          reserved_amount?: number
          status?: Database["public"]["Enums"]["escrow_status"]
        }
        Relationships: [
          {
            foreignKeyName: "escrow_holds_bidder_player_id_fkey"
            columns: ["bidder_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_holds_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "auction_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      match_bets: {
        Row: {
          created_at: string
          id: string
          match_id: string
          payout: number | null
          player_id: string
          predicted_winner: string
          round_id: string
          settled_at: string | null
          stake: number
          status: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          payout?: number | null
          player_id: string
          predicted_winner: string
          round_id: string
          settled_at?: string | null
          stake: number
          status?: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          payout?: number | null
          player_id?: string
          predicted_winner?: string
          round_id?: string
          settled_at?: string | null
          stake?: number
          status?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_bets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_bets_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_bets_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_bets_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          booking_claimed_at: string | null
          booking_claimed_by_player_id: string | null
          bye_player_id: string | null
          created_at: string
          deadline_at: string | null
          id: string
          is_bye: boolean
          is_unfinished: boolean
          played_at: string | null
          pot_total_credits: number
          round_id: string
          sets_a: number
          sets_b: number
          status: Database["public"]["Enums"]["match_status"]
          team_a_player1_id: string | null
          team_a_player2_id: string | null
          team_b_player1_id: string | null
          team_b_player2_id: string | null
          tournament_id: string
        }
        Insert: {
          booking_claimed_at?: string | null
          booking_claimed_by_player_id?: string | null
          bye_player_id?: string | null
          created_at?: string
          deadline_at?: string | null
          id?: string
          is_bye?: boolean
          is_unfinished?: boolean
          played_at?: string | null
          pot_total_credits?: number
          round_id: string
          sets_a?: number
          sets_b?: number
          status?: Database["public"]["Enums"]["match_status"]
          team_a_player1_id?: string | null
          team_a_player2_id?: string | null
          team_b_player1_id?: string | null
          team_b_player2_id?: string | null
          tournament_id: string
        }
        Update: {
          booking_claimed_at?: string | null
          booking_claimed_by_player_id?: string | null
          bye_player_id?: string | null
          created_at?: string
          deadline_at?: string | null
          id?: string
          is_bye?: boolean
          is_unfinished?: boolean
          played_at?: string | null
          pot_total_credits?: number
          round_id?: string
          sets_a?: number
          sets_b?: number
          status?: Database["public"]["Enums"]["match_status"]
          team_a_player1_id?: string | null
          team_a_player2_id?: string | null
          team_b_player1_id?: string | null
          team_b_player2_id?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_booking_claimed_by_player_id_fkey"
            columns: ["booking_claimed_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_bye_player_id_fkey"
            columns: ["bye_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_player1_id_fkey"
            columns: ["team_a_player1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_player2_id_fkey"
            columns: ["team_a_player2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_player1_id_fkey"
            columns: ["team_b_player1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_player2_id_fkey"
            columns: ["team_b_player2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          player_id: string
          read: boolean
          title: string
          tournament_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          player_id: string
          read?: boolean
          title: string
          tournament_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          player_id?: string
          read?: boolean
          title?: string
          tournament_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar_url: string | null
          confirmed: boolean
          created_at: string
          credits_balance: number
          full_name: string
          gender: Database["public"]["Enums"]["player_gender"] | null
          has_seen_auction_intro: boolean
          has_seen_onboarding: boolean
          id: string
          match_losses: number
          match_wins: number
          matches_played: number
          no_shows: number
          phone: string
          pin_hash: string
          session_token: string | null
          sets_lost: number
          sets_won: number
          status: Database["public"]["Enums"]["player_status"]
          tournament_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          confirmed?: boolean
          created_at?: string
          credits_balance?: number
          full_name: string
          gender?: Database["public"]["Enums"]["player_gender"] | null
          has_seen_auction_intro?: boolean
          has_seen_onboarding?: boolean
          id?: string
          match_losses?: number
          match_wins?: number
          matches_played?: number
          no_shows?: number
          phone: string
          pin_hash: string
          session_token?: string | null
          sets_lost?: number
          sets_won?: number
          status?: Database["public"]["Enums"]["player_status"]
          tournament_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          confirmed?: boolean
          created_at?: string
          credits_balance?: number
          full_name?: string
          gender?: Database["public"]["Enums"]["player_gender"] | null
          has_seen_auction_intro?: boolean
          has_seen_onboarding?: boolean
          id?: string
          match_losses?: number
          match_wins?: number
          matches_played?: number
          no_shows?: number
          phone?: string
          pin_hash?: string
          session_token?: string | null
          sets_lost?: number
          sets_won?: number
          status?: Database["public"]["Enums"]["player_status"]
          tournament_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      pledge_items: {
        Row: {
          admin_note: string | null
          approved: boolean
          category: Database["public"]["Enums"]["pledge_category"]
          created_at: string
          description: string | null
          estimate_high: number | null
          estimate_low: number | null
          id: string
          image_url: string | null
          pledged_by_player_id: string
          price_euro: number | null
          quantity_text: string | null
          round_id: string | null
          status: Database["public"]["Enums"]["pledge_status"]
          title: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          approved?: boolean
          category: Database["public"]["Enums"]["pledge_category"]
          created_at?: string
          description?: string | null
          estimate_high?: number | null
          estimate_low?: number | null
          id?: string
          image_url?: string | null
          pledged_by_player_id: string
          price_euro?: number | null
          quantity_text?: string | null
          round_id?: string | null
          status?: Database["public"]["Enums"]["pledge_status"]
          title: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          approved?: boolean
          category?: Database["public"]["Enums"]["pledge_category"]
          created_at?: string
          description?: string | null
          estimate_high?: number | null
          estimate_low?: number | null
          id?: string
          image_url?: string | null
          pledged_by_player_id?: string
          price_euro?: number | null
          quantity_text?: string | null
          round_id?: string | null
          status?: Database["public"]["Enums"]["pledge_status"]
          title?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pledge_items_pledged_by_player_id_fkey"
            columns: ["pledged_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pledge_items_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pledge_items_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          created_at: string
          end_at: string | null
          id: string
          index: number
          is_playoff: boolean
          playoff_type: string | null
          start_at: string | null
          status: Database["public"]["Enums"]["round_status"]
          tournament_id: string
        }
        Insert: {
          created_at?: string
          end_at?: string | null
          id?: string
          index: number
          is_playoff?: boolean
          playoff_type?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["round_status"]
          tournament_id: string
        }
        Update: {
          created_at?: string
          end_at?: string | null
          id?: string
          index?: number
          is_playoff?: boolean
          playoff_type?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["round_status"]
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          allow_negative_balance: boolean
          bank_balance: number
          betting_enabled: boolean
          booking_url: string | null
          club_name: string | null
          created_at: string
          created_by_admin_id: string | null
          display_decimals: boolean
          ended_at: string | null
          euros_per_set_loss: number
          euros_per_set_win: number
          id: string
          join_code: string | null
          max_players: number
          min_players: number
          min_protected_balance: number
          name: string
          participation_bonus: number
          payout_multiplier: number
          penalty_amount: number
          per_bet_max: number
          per_round_bet_cap: number
          playoffs_enabled: boolean
          pledge_deadline_hours: number
          pledge_gate_enabled: boolean
          round_duration_days: number
          rounds_count: number | null
          series_id: string | null
          series_order: number | null
          signup_close_at: string | null
          signup_open_at: string | null
          stake_per_player: number
          started_at: string | null
          starting_credits: number
          status: Database["public"]["Enums"]["tournament_status"]
          tier: Database["public"]["Enums"]["tournament_tier"]
          updated_at: string
        }
        Insert: {
          allow_negative_balance?: boolean
          bank_balance?: number
          betting_enabled?: boolean
          booking_url?: string | null
          club_name?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          display_decimals?: boolean
          ended_at?: string | null
          euros_per_set_loss?: number
          euros_per_set_win?: number
          id?: string
          join_code?: string | null
          max_players?: number
          min_players?: number
          min_protected_balance?: number
          name: string
          participation_bonus?: number
          payout_multiplier?: number
          penalty_amount?: number
          per_bet_max?: number
          per_round_bet_cap?: number
          playoffs_enabled?: boolean
          pledge_deadline_hours?: number
          pledge_gate_enabled?: boolean
          round_duration_days?: number
          rounds_count?: number | null
          series_id?: string | null
          series_order?: number | null
          signup_close_at?: string | null
          signup_open_at?: string | null
          stake_per_player?: number
          started_at?: string | null
          starting_credits?: number
          status?: Database["public"]["Enums"]["tournament_status"]
          tier?: Database["public"]["Enums"]["tournament_tier"]
          updated_at?: string
        }
        Update: {
          allow_negative_balance?: boolean
          bank_balance?: number
          betting_enabled?: boolean
          booking_url?: string | null
          club_name?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          display_decimals?: boolean
          ended_at?: string | null
          euros_per_set_loss?: number
          euros_per_set_win?: number
          id?: string
          join_code?: string | null
          max_players?: number
          min_players?: number
          min_protected_balance?: number
          name?: string
          participation_bonus?: number
          payout_multiplier?: number
          penalty_amount?: number
          per_bet_max?: number
          per_round_bet_cap?: number
          playoffs_enabled?: boolean
          pledge_deadline_hours?: number
          pledge_gate_enabled?: boolean
          round_duration_days?: number
          rounds_count?: number | null
          series_id?: string | null
          series_order?: number | null
          signup_close_at?: string | null
          signup_open_at?: string | null
          stake_per_player?: number
          started_at?: string | null
          starting_credits?: number
          status?: Database["public"]["Enums"]["tournament_status"]
          tier?: Database["public"]["Enums"]["tournament_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist_entries: {
        Row: {
          assigned_at: string | null
          assigned_tournament_id: string | null
          created_at: string
          full_name: string
          id: string
          invite_expires_at: string | null
          note: string | null
          phone: string
          priority: boolean
          status: Database["public"]["Enums"]["waitlist_status"]
          tournament_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_tournament_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          invite_expires_at?: string | null
          note?: string | null
          phone: string
          priority?: boolean
          status?: Database["public"]["Enums"]["waitlist_status"]
          tournament_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_tournament_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          invite_expires_at?: string | null
          note?: string | null
          phone?: string
          priority?: boolean
          status?: Database["public"]["Enums"]["waitlist_status"]
          tournament_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_assigned_tournament_id_fkey"
            columns: ["assigned_tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "player"
      auction_status: "Draft" | "Live" | "Ended"
      credit_type:
        | "StartingGrant"
        | "ParticipationBonus"
        | "MatchStake"
        | "MatchPayout"
        | "Penalty"
        | "AdminAdjustment"
        | "AuctionHold"
        | "AuctionRelease"
        | "AuctionSettlement"
        | "BetStake"
        | "BetPayout"
      escrow_status: "Active" | "Released" | "Settled"
      lot_status: "Live" | "Ended"
      match_status:
        | "Scheduled"
        | "BookingClaimed"
        | "Played"
        | "Overdue"
        | "AutoResolved"
      player_gender: "male" | "female" | "other" | "prefer_not"
      player_status: "Active" | "InactiveWarning" | "Removed"
      pledge_category: "food" | "drink" | "object" | "service" | "chaos"
      pledge_status: "Draft" | "Approved" | "Hidden"
      round_status: "Upcoming" | "Live" | "Locked" | "Completed"
      tournament_status:
        | "Draft"
        | "SignupOpen"
        | "Live"
        | "Finished"
        | "AuctionLive"
        | "Closed"
      tournament_tier: "Major" | "League" | "Mini"
      waitlist_status:
        | "waiting"
        | "invited"
        | "assigned"
        | "confirmed"
        | "removed"
        | "no_response"
        | "dropped"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "player"],
      auction_status: ["Draft", "Live", "Ended"],
      credit_type: [
        "StartingGrant",
        "ParticipationBonus",
        "MatchStake",
        "MatchPayout",
        "Penalty",
        "AdminAdjustment",
        "AuctionHold",
        "AuctionRelease",
        "AuctionSettlement",
        "BetStake",
        "BetPayout",
      ],
      escrow_status: ["Active", "Released", "Settled"],
      lot_status: ["Live", "Ended"],
      match_status: [
        "Scheduled",
        "BookingClaimed",
        "Played",
        "Overdue",
        "AutoResolved",
      ],
      player_gender: ["male", "female", "other", "prefer_not"],
      player_status: ["Active", "InactiveWarning", "Removed"],
      pledge_category: ["food", "drink", "object", "service", "chaos"],
      pledge_status: ["Draft", "Approved", "Hidden"],
      round_status: ["Upcoming", "Live", "Locked", "Completed"],
      tournament_status: [
        "Draft",
        "SignupOpen",
        "Live",
        "Finished",
        "AuctionLive",
        "Closed",
      ],
      tournament_tier: ["Major", "League", "Mini"],
      waitlist_status: [
        "waiting",
        "invited",
        "assigned",
        "confirmed",
        "removed",
        "no_response",
        "dropped",
      ],
    },
  },
} as const
