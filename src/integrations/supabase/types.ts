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
      client_ad_accounts: {
        Row: {
          client_user_id: string
          created_at: string
          customer_id: string
          id: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          customer_id: string
          id?: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          customer_id?: string
          id?: string
        }
        Relationships: []
      }
      client_ga4_properties: {
        Row: {
          client_user_id: string
          created_at: string
          id: string
          property_id: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          id?: string
          property_id: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          id?: string
          property_id?: string
        }
        Relationships: []
      }
      client_manager_links: {
        Row: {
          client_label: string
          client_user_id: string
          created_at: string
          id: string
          is_demo: boolean
          manager_id: string
        }
        Insert: {
          client_label?: string
          client_user_id: string
          created_at?: string
          id?: string
          is_demo?: boolean
          manager_id: string
        }
        Update: {
          client_label?: string
          client_user_id?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          manager_id?: string
        }
        Relationships: []
      }
      client_meta_ad_accounts: {
        Row: {
          ad_account_id: string
          client_user_id: string
          created_at: string
          id: string
        }
        Insert: {
          ad_account_id: string
          client_user_id: string
          created_at?: string
          id?: string
        }
        Update: {
          ad_account_id?: string
          client_user_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      client_metric_visibility: {
        Row: {
          client_user_id: string
          created_at: string
          is_visible: boolean
          metric_key: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          is_visible?: boolean
          metric_key: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          is_visible?: boolean
          metric_key?: string
        }
        Relationships: []
      }
      client_report_settings: {
        Row: {
          auto_send_enabled: boolean
          client_id: string
          created_at: string
          default_notes: string | null
          default_template_id: string
          frequency: string | null
          id: string
          send_day: number | null
          send_email: string | null
        }
        Insert: {
          auto_send_enabled?: boolean
          client_id: string
          created_at?: string
          default_notes?: string | null
          default_template_id: string
          frequency?: string | null
          id?: string
          send_day?: number | null
          send_email?: string | null
        }
        Update: {
          auto_send_enabled?: boolean
          client_id?: string
          created_at?: string
          default_notes?: string | null
          default_template_id?: string
          frequency?: string | null
          id?: string
          send_day?: number | null
          send_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_report_settings_default_template_id_fkey"
            columns: ["default_template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_campaigns: {
        Row: {
          account_id: string
          campaign_name: string
          campaign_status: string
          clicks: number | null
          client_id: string
          conversions: number | null
          cpa: number | null
          created_at: string | null
          date: string
          id: string
          leads: number | null
          messages: number | null
          platform: string
          revenue: number | null
          source: string
          spend: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          campaign_name: string
          campaign_status?: string
          clicks?: number | null
          client_id: string
          conversions?: number | null
          cpa?: number | null
          created_at?: string | null
          date: string
          id?: string
          leads?: number | null
          messages?: number | null
          platform: string
          revenue?: number | null
          source?: string
          spend?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          campaign_name?: string
          campaign_status?: string
          clicks?: number | null
          client_id?: string
          conversions?: number | null
          cpa?: number | null
          created_at?: string | null
          date?: string
          id?: string
          leads?: number | null
          messages?: number | null
          platform?: string
          revenue?: number | null
          source?: string
          spend?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_metrics: {
        Row: {
          account_id: string
          clicks: number | null
          client_id: string
          conversions: number | null
          cpa: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          date: string
          id: string
          impressions: number | null
          platform: string
          revenue: number | null
          roas: number | null
          spend: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          clicks?: number | null
          client_id: string
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date: string
          id?: string
          impressions?: number | null
          platform: string
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          clicks?: number | null
          client_id?: string
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date?: string
          id?: string
          impressions?: number | null
          platform?: string
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      funnel_configurations: {
        Row: {
          client_user_id: string | null
          created_at: string
          id: string
          manager_id: string
          name: string
          stages: Json
          updated_at: string
        }
        Insert: {
          client_user_id?: string | null
          created_at?: string
          id?: string
          manager_id: string
          name?: string
          stages?: Json
          updated_at?: string
        }
        Update: {
          client_user_id?: string | null
          created_at?: string
          id?: string
          manager_id?: string
          name?: string
          stages?: Json
          updated_at?: string
        }
        Relationships: []
      }
      landing_page_content: {
        Row: {
          content: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      manager_ad_accounts: {
        Row: {
          account_name: string
          created_at: string
          customer_id: string
          id: string
          is_active: boolean
          manager_id: string
          updated_at: string
        }
        Insert: {
          account_name?: string
          created_at?: string
          customer_id: string
          id?: string
          is_active?: boolean
          manager_id: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_active?: boolean
          manager_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      manager_meta_ad_accounts: {
        Row: {
          account_name: string
          ad_account_id: string
          created_at: string
          id: string
          is_active: boolean
          manager_id: string
          updated_at: string
        }
        Insert: {
          account_name?: string
          ad_account_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_id: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          ad_account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      oauth_connections: {
        Row: {
          access_token: string | null
          account_data: Json | null
          connected: boolean
          created_at: string
          id: string
          manager_id: string
          provider: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_data?: Json | null
          connected?: boolean
          created_at?: string
          id?: string
          manager_id: string
          provider: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_data?: Json | null
          connected?: boolean
          created_at?: string
          id?: string
          manager_id?: string
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      optimization_tasks: {
        Row: {
          auto_generated: boolean
          client_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          status: string
          title: string
        }
        Insert: {
          auto_generated?: boolean
          client_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title: string
        }
        Update: {
          auto_generated?: boolean
          client_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "optimization_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_manager_links"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_instances: {
        Row: {
          client_id: string
          generated_at: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          sections_snapshot: Json
          sent: boolean
          template_id: string
        }
        Insert: {
          client_id: string
          generated_at?: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          sections_snapshot: Json
          sent?: boolean
          template_id: string
        }
        Update: {
          client_id?: string
          generated_at?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          sections_snapshot?: Json
          sent?: boolean
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          created_at: string
          default_sections: Json
          description: string | null
          id: string
          layout_type: string
          name: string
        }
        Insert: {
          created_at?: string
          default_sections: Json
          description?: string | null
          id?: string
          layout_type: string
          name: string
        }
        Update: {
          created_at?: string
          default_sections?: Json
          description?: string | null
          id?: string
          layout_type?: string
          name?: string
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_connections: {
        Row: {
          access_token: string
          agency_id: string
          business_id: string
          connected_at: string
          id: string
          phone_number_id: string
          status: string
          updated_at: string
          waba_id: string
        }
        Insert: {
          access_token: string
          agency_id: string
          business_id: string
          connected_at?: string
          id?: string
          phone_number_id: string
          status?: string
          updated_at?: string
          waba_id: string
        }
        Update: {
          access_token?: string
          agency_id?: string
          business_id?: string
          connected_at?: string
          id?: string
          phone_number_id?: string
          status?: string
          updated_at?: string
          waba_id?: string
        }
        Relationships: []
      }
      whatsapp_pending_connections: {
        Row: {
          access_token: string
          accounts: Json
          agency_id: string
          created_at: string
          expires_at: string
          id: string
        }
        Insert: {
          access_token: string
          accounts?: Json
          agency_id: string
          created_at?: string
          expires_at?: string
          id?: string
        }
        Update: {
          access_token?: string
          accounts?: Json
          agency_id?: string
          created_at?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      safe_oauth_connections: {
        Row: {
          account_data: Json | null
          connected: boolean | null
          created_at: string | null
          id: string | null
          manager_id: string | null
          provider: string | null
          updated_at: string | null
        }
        Insert: {
          account_data?: Json | null
          connected?: boolean | null
          created_at?: string | null
          id?: string | null
          manager_id?: string | null
          provider?: string | null
          updated_at?: string | null
        }
        Update: {
          account_data?: Json | null
          connected?: boolean | null
          created_at?: string | null
          id?: string | null
          manager_id?: string | null
          provider?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
      app_role: "admin" | "manager" | "client"
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
      app_role: ["admin", "manager", "client"],
    },
  },
} as const
