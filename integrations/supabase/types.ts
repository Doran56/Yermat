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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bar_follows: {
        Row: {
          bar_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          bar_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          bar_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_follows_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_rewards: {
        Row: {
          bar_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          rank: number
          title: string
        }
        Insert: {
          bar_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          rank: number
          title: string
        }
        Update: {
          bar_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          rank?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_rewards_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      bars: {
        Row: {
          address: string
          city: string
          created_at: string
          google_place_id: string | null
          id: string
          is_active: boolean
          lat: number
          lng: number
          name: string
          price_demi: number | null
          price_little_john: number | null
          price_pinte: number | null
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          google_place_id?: string | null
          id?: string
          is_active?: boolean
          lat: number
          lng: number
          name: string
          price_demi?: number | null
          price_little_john?: number | null
          price_pinte?: number | null
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          google_place_id?: string | null
          id?: string
          is_active?: boolean
          lat?: number
          lng?: number
          name?: string
          price_demi?: number | null
          price_little_john?: number | null
          price_pinte?: number | null
        }
        Relationships: []
      }
      challenge_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tutorial_illustration_url: string | null
          volume_ml: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tutorial_illustration_url?: string | null
          volume_ml?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tutorial_illustration_url?: string | null
          volume_ml?: number | null
        }
        Relationships: []
      }
      monthly_medals: {
        Row: {
          bar_id: string | null
          category: string
          challenge_type_id: string | null
          created_at: string
          id: string
          month: string
          rank: number
          time_ms: number
          user_id: string
        }
        Insert: {
          bar_id?: string | null
          category: string
          challenge_type_id?: string | null
          created_at?: string
          id?: string
          month: string
          rank: number
          time_ms: number
          user_id: string
        }
        Update: {
          bar_id?: string | null
          category?: string
          challenge_type_id?: string | null
          created_at?: string
          id?: string
          month?: string
          rank?: number
          time_ms?: number
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          opened_at: string | null
          performance_id: string | null
          pushed_at: string | null
          read: boolean
          source_bar_id: string | null
          source_user_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opened_at?: string | null
          performance_id?: string | null
          pushed_at?: string | null
          read?: boolean
          source_bar_id?: string | null
          source_user_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opened_at?: string | null
          performance_id?: string | null
          pushed_at?: string | null
          read?: boolean
          source_bar_id?: string | null
          source_user_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      performance_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          performance_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          performance_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          performance_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_comments_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "performances"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_yermats: {
        Row: {
          created_at: string
          id: string
          performance_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          performance_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          performance_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_yermats_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "performances"
            referencedColumns: ["id"]
          },
        ]
      }
      performances: {
        Row: {
          bar_id: string | null
          challenge_type_id: string
          chug_end_ms: number | null
          chug_start_ms: number | null
          created_at: string
          id: string
          status: string
          thumbnail_url: string | null
          time_ms: number
          user_id: string
          user_lat: number | null
          user_lng: number | null
          video_end_ms: number | null
          video_start_ms: number
          video_status: string
          video_url: string | null
          visibility: Database["public"]["Enums"]["performance_visibility"]
          volume_ml: number | null
        }
        Insert: {
          bar_id?: string | null
          challenge_type_id: string
          chug_end_ms?: number | null
          chug_start_ms?: number | null
          created_at?: string
          id?: string
          status?: string
          thumbnail_url?: string | null
          time_ms: number
          user_id: string
          user_lat?: number | null
          user_lng?: number | null
          video_end_ms?: number | null
          video_start_ms?: number
          video_status?: string
          video_url?: string | null
          visibility?: Database["public"]["Enums"]["performance_visibility"]
          volume_ml?: number | null
        }
        Update: {
          bar_id?: string | null
          challenge_type_id?: string
          chug_end_ms?: number | null
          chug_start_ms?: number | null
          created_at?: string
          id?: string
          status?: string
          thumbnail_url?: string | null
          time_ms?: number
          user_id?: string
          user_lat?: number | null
          user_lng?: number | null
          video_end_ms?: number | null
          video_start_ms?: number
          video_status?: string
          video_url?: string | null
          visibility?: Database["public"]["Enums"]["performance_visibility"]
          volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performances_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performances_challenge_type_id_fkey"
            columns: ["challenge_type_id"]
            isOneToOne: false
            referencedRelation: "challenge_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performances_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_verified: boolean
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          gender: string | null
          id: string
          last_active_at: string
          updated_at: string
          user_id: string
          username: string
          xp: number
        }
        Insert: {
          age_verified?: boolean
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          last_active_at?: string
          updated_at?: string
          user_id: string
          username: string
          xp?: number
        }
        Update: {
          age_verified?: boolean
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          last_active_at?: string
          updated_at?: string
          user_id?: string
          username?: string
          xp?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          expo_push_token: string
          id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expo_push_token: string
          id?: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expo_push_token?: string
          id?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tiktok_consents: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          performance_id: string | null
          posted: boolean | null
          posted_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          performance_id?: string | null
          posted?: boolean | null
          posted_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          performance_id?: string | null
          posted?: boolean | null
          posted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_consents_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "performances"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      trigger_engagement_campaign: {
        Args: { _campaign: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      performance_visibility: "public" | "followers" | "private"
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
