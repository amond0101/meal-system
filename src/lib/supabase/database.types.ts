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
      applications: {
        Row: {
          applied_at: string
          cancelled_at: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          dinner_id: string
          id: string
          qr_token: string
          status: Database["public"]["Enums"]["application_status"]
          student_id: string
        }
        Insert: {
          applied_at?: string
          cancelled_at?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          dinner_id: string
          id?: string
          qr_token?: string
          status?: Database["public"]["Enums"]["application_status"]
          student_id: string
        }
        Update: {
          applied_at?: string
          cancelled_at?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          dinner_id?: string
          id?: string
          qr_token?: string
          status?: Database["public"]["Enums"]["application_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_dinner_id_fkey"
            columns: ["dinner_id"]
            isOneToOne: false
            referencedRelation: "dinners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demerits: {
        Row: {
          created_at: string
          dinner_id: string | null
          id: string
          points: number
          reason: string
          student_id: string
        }
        Insert: {
          created_at?: string
          dinner_id?: string | null
          id?: string
          points?: number
          reason?: string
          student_id: string
        }
        Update: {
          created_at?: string
          dinner_id?: string | null
          id?: string
          points?: number
          reason?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demerits_dinner_id_fkey"
            columns: ["dinner_id"]
            isOneToOne: false
            referencedRelation: "dinners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demerits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dinners: {
        Row: {
          application_deadline: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          status: Database["public"]["Enums"]["dinner_status"]
        }
        Insert: {
          application_deadline: string
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          status?: Database["public"]["Enums"]["dinner_status"]
        }
        Update: {
          application_deadline?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          status?: Database["public"]["Enums"]["dinner_status"]
        }
        Relationships: [
          {
            foreignKeyName: "dinners_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          class: number | null
          created_at: string
          email: string
          grade: number | null
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          student_no: string | null
        }
        Insert: {
          class?: number | null
          created_at?: string
          email: string
          grade?: number | null
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          student_no?: string | null
        }
        Update: {
          class?: number | null
          created_at?: string
          email?: string
          grade?: number | null
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          student_no?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      check_in_application: {
        Args: { p_qr_token: string }
        Returns: {
          class: number
          grade: number
          student_name: string
        }[]
      }
      close_dinner: { Args: { p_dinner_id: string }; Returns: number }
      close_dinner_internal: { Args: { p_dinner_id: string }; Returns: number }
      schedule_open_dinner: { Args: never; Returns: string }
      sweep_expired_dinners: { Args: never; Returns: number }
    }
    Enums: {
      application_status: "applied" | "cancelled" | "checked_in" | "no_show"
      dinner_status: "open" | "closed"
      user_role: "student" | "staff" | "admin"
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
      application_status: ["applied", "cancelled", "checked_in", "no_show"],
      dinner_status: ["open", "closed"],
      user_role: ["student", "staff", "admin"],
    },
  },
} as const
