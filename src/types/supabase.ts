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
      political_categories: {
        Row: {
          category_name: string
          confidence_score: number | null
          created_at: string
          created_by: string | null
          evidence_tweet_ids: string[] | null
          id: string
          is_user_modified: boolean | null
          position_description: string
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          category_name: string
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          evidence_tweet_ids?: string[] | null
          id?: string
          is_user_modified?: boolean | null
          position_description: string
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          category_name?: string
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          evidence_tweet_ids?: string[] | null
          id?: string
          is_user_modified?: boolean | null
          position_description?: string
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "political_categories_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          created_at_twitter: string | null
          display_name: string | null
          followers_count: number | null
          following_count: number | null
          id: string
          last_synced: string | null
          profile_image_url: string | null
          tweet_count: number | null
          twitter_user_id: string
          twitter_username: string
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          created_at_twitter?: string | null
          display_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          last_synced?: string | null
          profile_image_url?: string | null
          tweet_count?: number | null
          twitter_user_id: string
          twitter_username: string
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          created_at_twitter?: string | null
          display_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          last_synced?: string | null
          profile_image_url?: string | null
          tweet_count?: number | null
          twitter_user_id?: string
          twitter_username?: string
          updated_at?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      tweet_analysis: {
        Row: {
          analyzed_at: string
          created_at: string
          engagement_rate: number | null
          id: string
          like_rate: number | null
          likes_count: number | null
          negative_comments: number | null
          negative_reasons: Json | null
          neutral_comments: number | null
          positive_comments: number | null
          replies_count: number | null
          reply_rate: number | null
          retweet_rate: number | null
          retweets_count: number | null
          total_comments: number | null
          tweet_id: string | null
          views_count: number | null
        }
        Insert: {
          analyzed_at?: string
          created_at?: string
          engagement_rate?: number | null
          id?: string
          like_rate?: number | null
          likes_count?: number | null
          negative_comments?: number | null
          negative_reasons?: Json | null
          neutral_comments?: number | null
          positive_comments?: number | null
          replies_count?: number | null
          reply_rate?: number | null
          retweet_rate?: number | null
          retweets_count?: number | null
          total_comments?: number | null
          tweet_id?: string | null
          views_count?: number | null
        }
        Update: {
          analyzed_at?: string
          created_at?: string
          engagement_rate?: number | null
          id?: string
          like_rate?: number | null
          likes_count?: number | null
          negative_comments?: number | null
          negative_reasons?: Json | null
          neutral_comments?: number | null
          positive_comments?: number | null
          replies_count?: number | null
          reply_rate?: number | null
          retweet_rate?: number | null
          retweets_count?: number | null
          total_comments?: number | null
          tweet_id?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tweet_analysis_tweet_id_fkey"
            columns: ["tweet_id"]
            isOneToOne: true
            referencedRelation: "tweets"
            referencedColumns: ["id"]
          },
        ]
      }
      tweets: {
        Row: {
          created_at: string
          created_at_twitter: string
          embedding: string | null
          id: string
          is_reply: boolean | null
          is_retweet: boolean | null
          language: string | null
          likes_count: number | null
          profile_id: string | null
          quotes_count: number | null
          replies_count: number | null
          retweets_count: number | null
          text: string
          tweet_id: string
          updated_at: string
          url: string | null
          views_count: number | null
        }
        Insert: {
          created_at?: string
          created_at_twitter: string
          embedding?: string | null
          id?: string
          is_reply?: boolean | null
          is_retweet?: boolean | null
          language?: string | null
          likes_count?: number | null
          profile_id?: string | null
          quotes_count?: number | null
          replies_count?: number | null
          retweets_count?: number | null
          text: string
          tweet_id: string
          updated_at?: string
          url?: string | null
          views_count?: number | null
        }
        Update: {
          created_at?: string
          created_at_twitter?: string
          embedding?: string | null
          id?: string
          is_reply?: boolean | null
          is_retweet?: boolean | null
          language?: string | null
          likes_count?: number | null
          profile_id?: string | null
          quotes_count?: number | null
          replies_count?: number | null
          retweets_count?: number | null
          text?: string
          tweet_id?: string
          updated_at?: string
          url?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tweets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      virality_scores: {
        Row: {
          calculated_at: string
          comment_rate: number | null
          id: string
          is_outlier_negative: boolean | null
          is_outlier_positive: boolean | null
          like_rate: number | null
          likes_count: number | null
          normalized_score: number | null
          profile_id: string | null
          raw_score: number | null
          replies_count: number | null
          retweet_rate: number | null
          retweets_count: number | null
          tweet_id: string | null
          views_count: number | null
        }
        Insert: {
          calculated_at?: string
          comment_rate?: number | null
          id?: string
          is_outlier_negative?: boolean | null
          is_outlier_positive?: boolean | null
          like_rate?: number | null
          likes_count?: number | null
          normalized_score?: number | null
          profile_id?: string | null
          raw_score?: number | null
          replies_count?: number | null
          retweet_rate?: number | null
          retweets_count?: number | null
          tweet_id?: string | null
          views_count?: number | null
        }
        Update: {
          calculated_at?: string
          comment_rate?: number | null
          id?: string
          is_outlier_negative?: boolean | null
          is_outlier_positive?: boolean | null
          like_rate?: number | null
          likes_count?: number | null
          normalized_score?: number | null
          profile_id?: string | null
          raw_score?: number | null
          replies_count?: number | null
          retweet_rate?: number | null
          retweets_count?: number | null
          tweet_id?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "virality_scores_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virality_scores_tweet_id_fkey"
            columns: ["tweet_id"]
            isOneToOne: true
            referencedRelation: "tweets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

