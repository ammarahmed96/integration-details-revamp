export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cm_details: {
        Row: {
          facility_id: string
          id: string
          letter_automation: boolean
          updated_at: string | null
        }
        Insert: {
          facility_id: string
          id?: string
          letter_automation?: boolean
          updated_at?: string | null
        }
        Update: {
          facility_id?: string
          id?: string
          letter_automation?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cm_details_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      ehr_details: {
        Row: {
          ehr_facility_id: string | null
          ehr_interface_id: string | null
          ehr_site_id: string | null
          facility_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          ehr_facility_id?: string | null
          ehr_interface_id?: string | null
          ehr_site_id?: string | null
          facility_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          ehr_facility_id?: string | null
          ehr_interface_id?: string | null
          ehr_site_id?: string | null
          facility_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ehr_details_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      epic_integrations: {
        Row: {
          facility_id: string
          fhir: boolean
          id: string
          outgoing_mdm: boolean
          parsing_middleware: string | null
          updated_at: string | null
        }
        Insert: {
          facility_id: string
          fhir?: boolean
          id?: string
          outgoing_mdm?: boolean
          parsing_middleware?: string | null
          updated_at?: string | null
        }
        Update: {
          facility_id?: string
          fhir?: boolean
          id?: string
          outgoing_mdm?: boolean
          parsing_middleware?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epic_integrations_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      exports: {
        Row: {
          created_at: string | null
          file_url: string | null
          filter_json: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_url?: string | null
          filter_json?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_url?: string | null
          filter_json?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          campus_id: string | null
          created_at: string | null
          ehr_index_pattern: string | null
          has_sso: boolean | null
          id: string
          implementation_package_url: string | null
          is_active: boolean
          name: string
          site_id: string
          updated_at: string | null
        }
        Insert: {
          campus_id?: string | null
          created_at?: string | null
          ehr_index_pattern?: string | null
          has_sso?: boolean | null
          id?: string
          implementation_package_url?: string | null
          is_active?: boolean
          name: string
          site_id: string
          updated_at?: string | null
        }
        Update: {
          campus_id?: string | null
          created_at?: string | null
          ehr_index_pattern?: string | null
          has_sso?: boolean | null
          id?: string
          implementation_package_url?: string | null
          is_active?: boolean
          name?: string
          site_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facilities_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_cm_cohorts: {
        Row: {
          cm_type: string
          cohort: string
          facility_id: string
        }
        Insert: {
          cm_type: string
          cohort: string
          facility_id: string
        }
        Update: {
          cm_type?: string
          cohort?: string
          facility_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_cm_cohorts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_cohorts: {
        Row: {
          cohort: string
          facility_id: string
          is_live: boolean
        }
        Insert: {
          cohort: string
          facility_id: string
          is_live?: boolean
        }
        Update: {
          cohort?: string
          facility_id?: string
          is_live?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "facility_cohorts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_icp_golive: {
        Row: {
          cohort: string
          facility_id: string
          is_live: boolean
        }
        Insert: {
          cohort: string
          facility_id: string
          is_live?: boolean
        }
        Update: {
          cohort?: string
          facility_id?: string
          is_live?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "facility_icp_golive_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_ports: {
        Row: {
          created_at: string | null
          facility_id: string
          id: string
          port_name: string | null
          port_number: number
        }
        Insert: {
          created_at?: string | null
          facility_id: string
          id?: string
          port_name?: string | null
          port_number: number
        }
        Update: {
          created_at?: string | null
          facility_id?: string
          id?: string
          port_name?: string | null
          port_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "facility_ports_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      letters_config: {
        Row: {
          facility_id: string
          id: string
          letters_to_epic: boolean
          matching_algorithm: string | null
          quadient_service: boolean
          updated_at: string | null
        }
        Insert: {
          facility_id: string
          id?: string
          letters_to_epic?: boolean
          matching_algorithm?: string | null
          quadient_service?: boolean
          updated_at?: string | null
        }
        Update: {
          facility_id?: string
          id?: string
          letters_to_epic?: boolean
          matching_algorithm?: string | null
          quadient_service?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "letters_config_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      parsing_feeds: {
        Row: {
          adt: boolean
          bar: boolean
          clarity: boolean
          eon_connect: boolean
          exam_clarity: boolean
          facility_id: string
          flat_file_scheduling: boolean
          id: string
          mdm: boolean
          mfn: boolean
          orm: boolean
          oru: boolean
          parsing_files: boolean
          physician_clarity: boolean
          siu: boolean
          updated_at: string | null
        }
        Insert: {
          adt?: boolean
          bar?: boolean
          clarity?: boolean
          eon_connect?: boolean
          exam_clarity?: boolean
          facility_id: string
          flat_file_scheduling?: boolean
          id?: string
          mdm?: boolean
          mfn?: boolean
          orm?: boolean
          oru?: boolean
          parsing_files?: boolean
          physician_clarity?: boolean
          siu?: boolean
          updated_at?: string | null
        }
        Update: {
          adt?: boolean
          bar?: boolean
          clarity?: boolean
          eon_connect?: boolean
          exam_clarity?: boolean
          facility_id?: string
          flat_file_scheduling?: boolean
          id?: string
          mdm?: boolean
          mfn?: boolean
          orm?: boolean
          oru?: boolean
          parsing_files?: boolean
          physician_clarity?: boolean
          siu?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parsing_feeds_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_feeds: {
        Row: {
          adt: Database["public"]["Enums"]["feed_status"]
          bar: boolean
          clarity: boolean
          facility_id: string
          id: string
          mdm: boolean
          mfn: boolean
          orm: boolean
          oru: Database["public"]["Enums"]["feed_status"]
          siu: boolean
          updated_at: string | null
        }
        Insert: {
          adt?: Database["public"]["Enums"]["feed_status"]
          bar?: boolean
          clarity?: boolean
          facility_id: string
          id?: string
          mdm?: boolean
          mfn?: boolean
          orm?: boolean
          oru?: Database["public"]["Enums"]["feed_status"]
          siu?: boolean
          updated_at?: string | null
        }
        Update: {
          adt?: Database["public"]["Enums"]["feed_status"]
          bar?: boolean
          clarity?: boolean
          facility_id?: string
          id?: string
          mdm?: boolean
          mfn?: boolean
          orm?: boolean
          oru?: Database["public"]["Enums"]["feed_status"]
          siu?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receiving_feeds_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_db: {
        Row: {
          db_name: string | null
          facility_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          db_name?: string | null
          facility_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          db_name?: string | null
          facility_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reporting_db_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      server_configs: {
        Row: {
          facility_id: string
          id: string
          s3_folder: string | null
          server_id: string | null
          server_ip: string | null
          sftp_folder_link: string | null
          updated_at: string | null
        }
        Insert: {
          facility_id: string
          id?: string
          s3_folder?: string | null
          server_id?: string | null
          server_ip?: string | null
          sftp_folder_link?: string | null
          updated_at?: string | null
        }
        Update: {
          facility_id?: string
          id?: string
          s3_folder?: string | null
          server_id?: string | null
          server_ip?: string | null
          sftp_folder_link?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "server_configs_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_configs_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          hl7_url: string | null
          id: string
          ip: string | null
          name: string
        }
        Insert: {
          hl7_url?: string | null
          id?: string
          ip?: string | null
          name: string
        }
        Update: {
          hl7_url?: string | null
          id?: string
          ip?: string | null
          name?: string
        }
        Relationships: []
      }
      sites: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization_id: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization_id?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role_id: string
          scope_id: string | null
          scope_type: string
          user_id: string
        }
        Insert: {
          id?: string
          role_id: string
          scope_id?: string | null
          scope_type: string
          user_id: string
        }
        Update: {
          id?: string
          role_id?: string
          scope_id?: string | null
          scope_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_definitions: {
        Row: { id: string; name: string; display_name: string; sort_order: number; is_active: boolean; created_at: string | null }
        Insert: { id?: string; name: string; display_name: string; sort_order?: number; is_active?: boolean; created_at?: string | null }
        Update: { id?: string; name?: string; display_name?: string; sort_order?: number; is_active?: boolean; created_at?: string | null }
        Relationships: []
      }
      config_list_items: {
        Row: { id: string; category: string; value: string; display_name: string; sort_order: number; is_active: boolean; created_at: string | null }
        Insert: { id?: string; category: string; value: string; display_name: string; sort_order?: number; is_active?: boolean; created_at?: string | null }
        Update: { id?: string; category?: string; value?: string; display_name?: string; sort_order?: number; is_active?: boolean; created_at?: string | null }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_site: { Args: { p_site_id: string }; Returns: boolean }
      can_read_site: { Args: { p_site_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_auditor: { Args: never; Returns: boolean }
      is_authenticated_reader: { Args: never; Returns: boolean }
      is_global_editor: { Args: never; Returns: boolean }
    }
    Enums: {
      feed_status: "active" | "inactive" | "flat_file"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      feed_status: ["active", "inactive", "flat_file"],
    },
  },
} as const

