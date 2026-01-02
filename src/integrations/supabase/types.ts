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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_management_applications: {
        Row: {
          account_size: string
          broker_server: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          platform_type: string | null
          preferred_broker: string
          status: string | null
          trading_login: string | null
          trading_password: string | null
          updated_at: string | null
          whatsapp: string
        }
        Insert: {
          account_size: string
          broker_server?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          platform_type?: string | null
          preferred_broker: string
          status?: string | null
          trading_login?: string | null
          trading_password?: string | null
          updated_at?: string | null
          whatsapp: string
        }
        Update: {
          account_size?: string
          broker_server?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          platform_type?: string | null
          preferred_broker?: string
          status?: string | null
          trading_login?: string | null
          trading_password?: string | null
          updated_at?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      account_performance: {
        Row: {
          created_at: string | null
          date: string
          id: string
          is_published: boolean | null
          notes: string | null
          period: string
          profit_percentage: number | null
          total_trades: number | null
          updated_at: string | null
          winning_trades: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          is_published?: boolean | null
          notes?: string | null
          period: string
          profit_percentage?: number | null
          total_trades?: number | null
          updated_at?: string | null
          winning_trades?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          is_published?: boolean | null
          notes?: string | null
          period?: string
          profit_percentage?: number | null
          total_trades?: number | null
          updated_at?: string | null
          winning_trades?: number | null
        }
        Relationships: []
      }
      admin_activity_log: {
        Row: {
          action_type: string
          admin_email: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_email: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_email?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      chart_analysis: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          published: boolean | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          published?: boolean | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          published?: boolean | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chart_reactions: {
        Row: {
          chart_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          chart_id: string
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          chart_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_reactions_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "chart_analysis"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage: {
        Row: {
          coupon_id: string | null
          discount_applied: number
          id: string
          subscription_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          coupon_id?: string | null
          discount_applied: number
          id?: string
          subscription_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string | null
          discount_applied?: number
          id?: string
          subscription_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_plans: string[] | null
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          expiry_date: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
        }
        Insert: {
          applicable_plans?: string[] | null
          code: string
          created_at?: string | null
          discount_type: string
          discount_value: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Update: {
          applicable_plans?: string[] | null
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          pay_address: string | null
          pay_amount: string | null
          pay_currency: string
          payment_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          id?: string
          pay_address?: string | null
          pay_amount?: string | null
          pay_currency: string
          payment_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          pay_address?: string | null
          pay_amount?: string | null
          pay_currency?: string
          payment_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      forex_news_alerts: {
        Row: {
          actual: string | null
          created_at: string
          currency: string
          event_time: string
          forecast: string | null
          id: string
          impact: string
          is_notified: boolean | null
          previous: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual?: string | null
          created_at?: string
          currency: string
          event_time: string
          forecast?: string | null
          id?: string
          impact: string
          is_notified?: boolean | null
          previous?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual?: string | null
          created_at?: string
          currency?: string
          event_time?: string
          forecast?: string | null
          id?: string
          impact?: string
          is_notified?: boolean | null
          previous?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      headlines: {
        Row: {
          created_at: string
          headline_type: string
          id: string
          is_active: boolean
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          headline_type?: string
          id?: string
          is_active?: boolean
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          headline_type?: string
          id?: string
          is_active?: boolean
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_idea_reactions: {
        Row: {
          created_at: string
          id: string
          market_idea_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          market_idea_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          market_idea_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_idea_reactions_market_idea_id_fkey"
            columns: ["market_idea_id"]
            isOneToOne: false
            referencedRelation: "market_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      market_ideas: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          published: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          published?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          published?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mt5_demo_trades: {
        Row: {
          close_price: number | null
          close_time: string | null
          created_at: string
          entry_price: number | null
          error_message: string | null
          id: string
          lot_size: number | null
          mt5_ticket: string | null
          open_time: string | null
          profit_loss: number | null
          result: string | null
          signal_id: string | null
          sl_price: number | null
          status: string | null
          symbol: string
          tp_price: number | null
          trade_type: string
          updated_at: string
        }
        Insert: {
          close_price?: number | null
          close_time?: string | null
          created_at?: string
          entry_price?: number | null
          error_message?: string | null
          id?: string
          lot_size?: number | null
          mt5_ticket?: string | null
          open_time?: string | null
          profit_loss?: number | null
          result?: string | null
          signal_id?: string | null
          sl_price?: number | null
          status?: string | null
          symbol: string
          tp_price?: number | null
          trade_type: string
          updated_at?: string
        }
        Update: {
          close_price?: number | null
          close_time?: string | null
          created_at?: string
          entry_price?: number | null
          error_message?: string | null
          id?: string
          lot_size?: number | null
          mt5_ticket?: string | null
          open_time?: string | null
          profit_loss?: number | null
          result?: string | null
          signal_id?: string | null
          sl_price?: number | null
          status?: string | null
          symbol?: string
          tp_price?: number | null
          trade_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mt5_demo_trades_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number
          country_code: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone_number: string | null
          selected_categories: string[] | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          terms_accepted: boolean | null
          trial_end_date: string | null
          updated_at: string | null
        }
        Insert: {
          balance?: number
          country_code?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          phone_number?: string | null
          selected_categories?: string[] | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          terms_accepted?: boolean | null
          trial_end_date?: string | null
          updated_at?: string | null
        }
        Update: {
          balance?: number
          country_code?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone_number?: string | null
          selected_categories?: string[] | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          terms_accepted?: boolean | null
          trial_end_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          action_type: string
          browser: string | null
          country: string | null
          created_at: string
          details: Json | null
          device_type: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          browser?: string | null
          country?: string | null
          created_at?: string
          details?: Json | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          browser?: string | null
          country?: string | null
          created_at?: string
          details?: Json | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      signal_stats: {
        Row: {
          created_at: string
          id: string
          stat_date: string
          top_symbols: Json | null
          total_breakeven: number | null
          total_losses: number | null
          total_pips: number | null
          total_signals: number | null
          total_wins: number | null
          updated_at: string
          win_rate: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          stat_date: string
          top_symbols?: Json | null
          total_breakeven?: number | null
          total_losses?: number | null
          total_pips?: number | null
          total_signals?: number | null
          total_wins?: number | null
          updated_at?: string
          win_rate?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          stat_date?: string
          top_symbols?: Json | null
          total_breakeven?: number | null
          total_losses?: number | null
          total_pips?: number | null
          total_signals?: number | null
          total_wins?: number | null
          updated_at?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      signals: {
        Row: {
          activated_at: string | null
          analysis_reason: string | null
          auto_closed: boolean | null
          category: string
          chart_image_url: string | null
          created_at: string
          current_price: string | null
          entry: string
          entry_mode: string | null
          expiry_time: string | null
          id: string
          is_activated: boolean | null
          is_favorite: boolean | null
          is_premium: boolean | null
          limit_entry_price: number | null
          main_category: string | null
          note: string | null
          pair: string
          pips_result: string | null
          profit_note: string | null
          published: boolean | null
          risk_level: string | null
          signal_status: string | null
          signal_type: string | null
          sl: string
          sl_hit: boolean | null
          status: string | null
          sub_category: string | null
          tp1: string
          tp1_hit: boolean | null
          tp2: string | null
          tp2_hit: boolean | null
          tp3: string | null
          tp3_hit: boolean | null
          tp4: string | null
          tp4_hit: boolean | null
          type: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          analysis_reason?: string | null
          auto_closed?: boolean | null
          category: string
          chart_image_url?: string | null
          created_at?: string
          current_price?: string | null
          entry: string
          entry_mode?: string | null
          expiry_time?: string | null
          id?: string
          is_activated?: boolean | null
          is_favorite?: boolean | null
          is_premium?: boolean | null
          limit_entry_price?: number | null
          main_category?: string | null
          note?: string | null
          pair: string
          pips_result?: string | null
          profit_note?: string | null
          published?: boolean | null
          risk_level?: string | null
          signal_status?: string | null
          signal_type?: string | null
          sl: string
          sl_hit?: boolean | null
          status?: string | null
          sub_category?: string | null
          tp1: string
          tp1_hit?: boolean | null
          tp2?: string | null
          tp2_hit?: boolean | null
          tp3?: string | null
          tp3_hit?: boolean | null
          tp4?: string | null
          tp4_hit?: boolean | null
          type: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          analysis_reason?: string | null
          auto_closed?: boolean | null
          category?: string
          chart_image_url?: string | null
          created_at?: string
          current_price?: string | null
          entry?: string
          entry_mode?: string | null
          expiry_time?: string | null
          id?: string
          is_activated?: boolean | null
          is_favorite?: boolean | null
          is_premium?: boolean | null
          limit_entry_price?: number | null
          main_category?: string | null
          note?: string | null
          pair?: string
          pips_result?: string | null
          profit_note?: string | null
          published?: boolean | null
          risk_level?: string | null
          signal_status?: string | null
          signal_type?: string | null
          sl?: string
          sl_hit?: boolean | null
          status?: string | null
          sub_category?: string | null
          tp1?: string
          tp1_hit?: boolean | null
          tp2?: string | null
          tp2_hit?: boolean | null
          tp3?: string | null
          tp3_hit?: boolean | null
          tp4?: string | null
          tp4_hit?: boolean | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      special_offers: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          end_date: string
          id: string
          plan_type: string
          start_date: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          end_date: string
          id?: string
          plan_type: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          end_date?: string
          id?: string
          plan_type?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trade_history: {
        Row: {
          category: string | null
          close_price: string | null
          closed_at: string
          created_at: string
          entry: string
          id: string
          is_premium: boolean | null
          notes: string | null
          pair: string
          pips_gained: number | null
          result: string
          risk_level: string | null
          signal_id: string | null
          signal_type: string | null
          sl: string
          sl_hit: boolean | null
          tp_hit_level: number | null
          tp1: string | null
          tp2: string | null
          tp3: string | null
          tp4: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          close_price?: string | null
          closed_at?: string
          created_at?: string
          entry: string
          id?: string
          is_premium?: boolean | null
          notes?: string | null
          pair: string
          pips_gained?: number | null
          result: string
          risk_level?: string | null
          signal_id?: string | null
          signal_type?: string | null
          sl: string
          sl_hit?: boolean | null
          tp_hit_level?: number | null
          tp1?: string | null
          tp2?: string | null
          tp3?: string | null
          tp4?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          close_price?: string | null
          closed_at?: string
          created_at?: string
          entry?: string
          id?: string
          is_premium?: boolean | null
          notes?: string | null
          pair?: string
          pips_gained?: number | null
          result?: string
          risk_level?: string | null
          signal_id?: string | null
          signal_type?: string | null
          sl?: string
          sl_hit?: boolean | null
          tp_hit_level?: number | null
          tp1?: string | null
          tp2?: string | null
          tp3?: string | null
          tp4?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_history_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorite_pairs: {
        Row: {
          created_at: string
          id: string
          pair_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pair_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pair_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          signal_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          signal_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          signal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_login_history: {
        Row: {
          browser: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          login_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_signal_views: {
        Row: {
          id: string
          signal_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          signal_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          signal_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_signal_views_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_signal_stats: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          top_symbols: Json
          total_breakeven: number
          total_losses: number
          total_pips: number
          total_signals: number
          total_wins: number
          win_rate: number
        }[]
      }
      get_accuracy_stats: {
        Args: never
        Returns: {
          free_accuracy: number
          free_total: number
          free_wins: number
          premium_accuracy: number
          premium_total: number
          premium_wins: number
        }[]
      }
      get_detailed_accuracy_stats: {
        Args: never
        Returns: {
          today_accuracy: number
          today_free_accuracy: number
          today_free_total: number
          today_free_wins: number
          today_losses: number
          today_premium_accuracy: number
          today_premium_total: number
          today_premium_wins: number
          today_total: number
          today_wins: number
          week_accuracy: number
          week_free_accuracy: number
          week_free_total: number
          week_free_wins: number
          week_losses: number
          week_premium_accuracy: number
          week_premium_total: number
          week_premium_wins: number
          week_total: number
          week_wins: number
          weekend_accuracy: number
          weekend_free_accuracy: number
          weekend_free_total: number
          weekend_free_wins: number
          weekend_losses: number
          weekend_premium_accuracy: number
          weekend_premium_total: number
          weekend_premium_wins: number
          weekend_total: number
          weekend_wins: number
          yesterday_accuracy: number
          yesterday_free_accuracy: number
          yesterday_free_total: number
          yesterday_free_wins: number
          yesterday_losses: number
          yesterday_premium_accuracy: number
          yesterday_premium_total: number
          yesterday_premium_wins: number
          yesterday_total: number
          yesterday_wins: number
        }[]
      }
      get_mt5_demo_stats: {
        Args: { p_days?: number }
        Returns: {
          accuracy_percent: number
          total_breakeven: number
          total_losses: number
          total_profit: number
          total_trades: number
          total_wins: number
          win_rate: number
        }[]
      }
      get_signals_filtered:
        | {
            Args: never
            Returns: {
              analysis_reason: string
              category: string
              chart_image_url: string
              created_at: string
              entry: string
              id: string
              is_favorite: boolean
              is_premium: boolean
              main_category: string
              note: string
              pair: string
              pips_result: string
              profit_note: string
              published: boolean
              risk_level: string
              signal_status: string
              signal_type: string
              sl: string
              sl_hit: boolean
              status: string
              sub_category: string
              tp1: string
              tp1_hit: boolean
              tp2: string
              tp2_hit: boolean
              tp3: string
              tp3_hit: boolean
              tp4: string
              tp4_hit: boolean
              type: string
              updated_at: string
            }[]
          }
        | {
            Args: {
              p_category?: string
              p_limit?: number
              p_main_category?: string
              p_offset?: number
              p_signal_id?: string
              p_status?: string
              p_sub_category?: string
            }
            Returns: {
              analysis_reason: string
              category: string
              chart_image_url: string
              created_at: string
              entry: string
              id: string
              is_favorite: boolean
              is_premium: boolean
              main_category: string
              note: string
              pair: string
              pips_result: string
              profit_note: string
              published: boolean
              risk_level: string
              signal_status: string
              signal_type: string
              sl: string
              sl_hit: boolean
              status: string
              sub_category: string
              tp1: string
              tp1_hit: boolean
              tp2: string
              tp2_hit: boolean
              tp3: string
              tp3_hit: boolean
              tp4: string
              tp4_hit: boolean
              type: string
              updated_at: string
            }[]
          }
      get_xauusd_accuracy_stats: {
        Args: never
        Returns: {
          avg_loss_pips: number
          avg_win_pips: number
          last_7_days: Json
          today_accuracy: number
          today_losses: number
          today_total: number
          today_wins: number
          total_losses: number
          total_pips: number
          total_signals: number
          total_wins: number
          week_accuracy: number
          week_losses: number
          week_total: number
          week_wins: number
          weekend_accuracy: number
          weekend_losses: number
          weekend_total: number
          weekend_wins: number
          win_rate: number
          yesterday_accuracy: number
          yesterday_losses: number
          yesterday_total: number
          yesterday_wins: number
        }[]
      }
      has_premium_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "signal_manager" | "finance_manager"
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
      app_role: ["admin", "user", "signal_manager", "finance_manager"],
    },
  },
} as const
