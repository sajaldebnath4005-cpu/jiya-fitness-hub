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
      achievements: {
        Row: {
          badge_type: string
          earned_at: string
          id: string
          label: string
          user_id: string
        }
        Insert: {
          badge_type: string
          earned_at?: string
          id?: string
          label?: string
          user_id: string
        }
        Update: {
          badge_type?: string
          earned_at?: string
          id?: string
          label?: string
          user_id?: string
        }
        Relationships: []
      }
      body_metrics_logs: {
        Row: {
          body_fat: number | null
          created_at: string
          date: string
          id: string
          muscle_mass: number | null
          photo_url: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          body_fat?: number | null
          created_at?: string
          date?: string
          id?: string
          muscle_mass?: number | null
          photo_url?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          body_fat?: number | null
          created_at?: string
          date?: string
          id?: string
          muscle_mass?: number | null
          photo_url?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender?: string
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          alternative_slugs: string[]
          common_mistakes: string
          contraindicated_conditions: string[]
          created_at: string
          difficulty: string
          equipment: string[]
          id: string
          instructions: string
          is_warmup: boolean
          media_url: string | null
          met: number
          muscle_group: string
          name: string
          secondary_muscles: string[]
          slug: string
        }
        Insert: {
          alternative_slugs?: string[]
          common_mistakes?: string
          contraindicated_conditions?: string[]
          created_at?: string
          difficulty?: string
          equipment?: string[]
          id?: string
          instructions?: string
          is_warmup?: boolean
          media_url?: string | null
          met?: number
          muscle_group: string
          name: string
          secondary_muscles?: string[]
          slug: string
        }
        Update: {
          alternative_slugs?: string[]
          common_mistakes?: string
          contraindicated_conditions?: string[]
          created_at?: string
          difficulty?: string
          equipment?: string[]
          id?: string
          instructions?: string
          is_warmup?: boolean
          media_url?: string | null
          met?: number
          muscle_group?: string
          name?: string
          secondary_muscles?: string[]
          slug?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          recipient_id: string
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_id: string
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          recipient_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_scans: {
        Row: {
          additives: Json
          allergens: string[]
          barcode: string | null
          brand: string | null
          calories: number | null
          food_name: string
          grade: string | null
          id: string
          image_url: string | null
          ingredients: string | null
          ingredients_structured: Json
          macros: Json
          nutrients_per_100g: Json
          nutrients_per_serving: Json
          raw_api_response: Json | null
          scanned_at: string
          serving_size: string | null
          source: string
          summary: string | null
          user_id: string
        }
        Insert: {
          additives?: Json
          allergens?: string[]
          barcode?: string | null
          brand?: string | null
          calories?: number | null
          food_name?: string
          grade?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string | null
          ingredients_structured?: Json
          macros?: Json
          nutrients_per_100g?: Json
          nutrients_per_serving?: Json
          raw_api_response?: Json | null
          scanned_at?: string
          serving_size?: string | null
          source?: string
          summary?: string | null
          user_id: string
        }
        Update: {
          additives?: Json
          allergens?: string[]
          barcode?: string | null
          brand?: string | null
          calories?: number | null
          food_name?: string
          grade?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string | null
          ingredients_structured?: Json
          macros?: Json
          nutrients_per_100g?: Json
          nutrients_per_serving?: Json
          raw_api_response?: Json | null
          scanned_at?: string
          serving_size?: string | null
          source?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_login_tour_seen: boolean
          id: string
          last_active_date: string | null
          name: string
          streak_days: number
          updated_at: string
          username: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_login_tour_seen?: boolean
          id: string
          last_active_date?: string | null
          name?: string
          streak_days?: number
          updated_at?: string
          username: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_login_tour_seen?: boolean
          id?: string
          last_active_date?: string | null
          name?: string
          streak_days?: number
          updated_at?: string
          username?: string
          xp?: number
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          created_at: string
          date: string
          hours: number
          id: string
          quality: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          hours?: number
          id?: string
          quality?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          hours?: number
          id?: string
          quality?: string | null
          user_id?: string
        }
        Relationships: []
      }
      step_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          steps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          steps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          steps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          age: number | null
          carbs_g: number | null
          daily_calories: number | null
          days_per_week: number | null
          desired_results: string[]
          equipment_gym: string[]
          equipment_home: string[]
          fat_g: number | null
          fitness_level: string | null
          focus_muscles: string[]
          gender: string | null
          goal: string | null
          height: number | null
          injuries: string[]
          intensity: string | null
          notification_prefs: Json
          onboarding_completed_at: string | null
          onboarding_step: number
          past_experience: string | null
          planning_style: string | null
          protein_g: number | null
          schedule_days: string[]
          schedule_time_block: string | null
          session_duration: number | null
          target_date: string | null
          target_weight: number | null
          unit_system: string
          updated_at: string
          user_id: string
          weight: number | null
          workout_location: string | null
        }
        Insert: {
          age?: number | null
          carbs_g?: number | null
          daily_calories?: number | null
          days_per_week?: number | null
          desired_results?: string[]
          equipment_gym?: string[]
          equipment_home?: string[]
          fat_g?: number | null
          fitness_level?: string | null
          focus_muscles?: string[]
          gender?: string | null
          goal?: string | null
          height?: number | null
          injuries?: string[]
          intensity?: string | null
          notification_prefs?: Json
          onboarding_completed_at?: string | null
          onboarding_step?: number
          past_experience?: string | null
          planning_style?: string | null
          protein_g?: number | null
          schedule_days?: string[]
          schedule_time_block?: string | null
          session_duration?: number | null
          target_date?: string | null
          target_weight?: number | null
          unit_system?: string
          updated_at?: string
          user_id: string
          weight?: number | null
          workout_location?: string | null
        }
        Update: {
          age?: number | null
          carbs_g?: number | null
          daily_calories?: number | null
          days_per_week?: number | null
          desired_results?: string[]
          equipment_gym?: string[]
          equipment_home?: string[]
          fat_g?: number | null
          fitness_level?: string | null
          focus_muscles?: string[]
          gender?: string | null
          goal?: string | null
          height?: number | null
          injuries?: string[]
          intensity?: string | null
          notification_prefs?: Json
          onboarding_completed_at?: string | null
          onboarding_step?: number
          past_experience?: string | null
          planning_style?: string | null
          protein_g?: number | null
          schedule_days?: string[]
          schedule_time_block?: string | null
          session_duration?: number | null
          target_date?: string | null
          target_weight?: number | null
          unit_system?: string
          updated_at?: string
          user_id?: string
          weight?: number | null
          workout_location?: string | null
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          ml: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          ml?: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          ml?: number
          user_id?: string
        }
        Relationships: []
      }
      workout_days: {
        Row: {
          day_of_week: string
          estimated_calories: number
          estimated_duration: number
          exercise_ids: string[]
          id: string
          is_rest: boolean
          name: string
          plan_id: string
          prescriptions: Json
          sort_order: number
          user_id: string
        }
        Insert: {
          day_of_week: string
          estimated_calories?: number
          estimated_duration?: number
          exercise_ids?: string[]
          id?: string
          is_rest?: boolean
          name: string
          plan_id: string
          prescriptions?: Json
          sort_order?: number
          user_id: string
        }
        Update: {
          day_of_week?: string
          estimated_calories?: number
          estimated_duration?: number
          exercise_ids?: string[]
          id?: string
          is_rest?: boolean
          name?: string
          plan_id?: string
          prescriptions?: Json
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          calories_burned: number
          created_at: string
          date: string
          duration: number
          exercise_ids_completed: string[]
          id: string
          sets_logged: Json
          user_id: string
          workout_day_id: string | null
          workout_name: string
        }
        Insert: {
          calories_burned?: number
          created_at?: string
          date?: string
          duration?: number
          exercise_ids_completed?: string[]
          id?: string
          sets_logged?: Json
          user_id: string
          workout_day_id?: string | null
          workout_name?: string
        }
        Update: {
          calories_burned?: number
          created_at?: string
          date?: string
          duration?: number
          exercise_ids_completed?: string[]
          id?: string
          sets_logged?: Json
          user_id?: string
          workout_day_id?: string | null
          workout_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_workout_day_id_fkey"
            columns: ["workout_day_id"]
            isOneToOne: false
            referencedRelation: "workout_days"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          active: boolean
          generated_on: string
          id: string
          notes: string | null
          split_structure: string
          user_id: string
          weeks_to_goal: number | null
        }
        Insert: {
          active?: boolean
          generated_on?: string
          id?: string
          notes?: string | null
          split_structure?: string
          user_id: string
          weeks_to_goal?: number | null
        }
        Update: {
          active?: boolean
          generated_on?: string
          id?: string
          notes?: string | null
          split_structure?: string
          user_id?: string
          weeks_to_goal?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_friend_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      add_xp: { Args: { _amount: number }; Returns: number }
      friends_leaderboard: {
        Args: never
        Returns: {
          avatar_url: string
          id: string
          name: string
          streak_days: number
          username: string
          xp: number
        }[]
      }
      global_leaderboard: {
        Args: never
        Returns: {
          avatar_url: string
          id: string
          name: string
          streak_days: number
          username: string
          xp: number
        }[]
      }
      is_username_available: { Args: { _username: string }; Returns: boolean }
      remove_friend: { Args: { _friend_id: string }; Returns: undefined }
      search_users: {
        Args: { _q: string }
        Returns: {
          avatar_url: string
          id: string
          name: string
          streak_days: number
          username: string
          xp: number
        }[]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
