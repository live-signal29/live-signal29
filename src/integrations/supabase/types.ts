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
          image_url: string
          published: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          published?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          published?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      signals: {
        Row: {
          analysis_reason: string | null
          category: string
          chart_image_url: string | null
          created_at: string
          entry: string
          id: string
          is_favorite: boolean | null
          is_premium: boolean | null
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
          analysis_reason?: string | null
          category: string
          chart_image_url?: string | null
          created_at?: string
          entry: string
          id?: string
          is_favorite?: boolean | null
          is_premium?: boolean | null
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
          analysis_reason?: string | null
          category?: string
          chart_image_url?: string | null
          created_at?: string
          entry?: string
          id?: string
          is_favorite?: boolean | null
          is_premium?: boolean | null
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
