// Database types for the cairn schema (supabase/migrations/).
// Written to match `supabase gen types typescript` output; once a local
// stack or linked project exists, regenerate with:
//   supabase gen types typescript --local > src/lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          assessment_id: string | null;
          created_at: string | null;
          doctor_id: string | null;
          id: string;
          patient_note: string | null;
          slot_id: string | null;
          status: Database["public"]["Enums"]["appointment_status"] | null;
          user_id: string | null;
        };
        Insert: {
          assessment_id?: string | null;
          created_at?: string | null;
          doctor_id?: string | null;
          id?: string;
          patient_note?: string | null;
          slot_id?: string | null;
          status?: Database["public"]["Enums"]["appointment_status"] | null;
          user_id?: string | null;
        };
        Update: {
          assessment_id?: string | null;
          created_at?: string | null;
          doctor_id?: string | null;
          id?: string;
          patient_note?: string | null;
          slot_id?: string | null;
          status?: Database["public"]["Enums"]["appointment_status"] | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_slot_id_fkey";
            columns: ["slot_id"];
            isOneToOne: false;
            referencedRelation: "availability_slots";
            referencedColumns: ["id"];
          },
        ];
      };
      assessments: {
        Row: {
          ai_suggestion: string | null;
          ai_summary: string | null;
          conversation_id: string | null;
          created_at: string | null;
          id: string;
          model_used: string | null;
          needs_urgent_review: boolean | null;
          primary_concern: string | null;
          recommended_specialties: string[] | null;
          risk: Database["public"]["Enums"]["risk_level"];
          risk_rationale: string | null;
          secondary_concerns: string[] | null;
          user_id: string | null;
          wellbeing_score: number | null;
        };
        Insert: {
          ai_suggestion?: string | null;
          ai_summary?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          model_used?: string | null;
          needs_urgent_review?: boolean | null;
          primary_concern?: string | null;
          recommended_specialties?: string[] | null;
          risk: Database["public"]["Enums"]["risk_level"];
          risk_rationale?: string | null;
          secondary_concerns?: string[] | null;
          user_id?: string | null;
          wellbeing_score?: number | null;
        };
        Update: {
          ai_suggestion?: string | null;
          ai_summary?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          model_used?: string | null;
          needs_urgent_review?: boolean | null;
          primary_concern?: string | null;
          recommended_specialties?: string[] | null;
          risk?: Database["public"]["Enums"]["risk_level"];
          risk_rationale?: string | null;
          secondary_concerns?: string[] | null;
          user_id?: string | null;
          wellbeing_score?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      availability_slots: {
        Row: {
          doctor_id: string | null;
          ends_at: string;
          id: string;
          is_booked: boolean | null;
          starts_at: string;
        };
        Insert: {
          doctor_id?: string | null;
          ends_at: string;
          id?: string;
          is_booked?: boolean | null;
          starts_at: string;
        };
        Update: {
          doctor_id?: string | null;
          ends_at?: string;
          id?: string;
          is_booked?: boolean | null;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "availability_slots_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          ended_at: string | null;
          id: string;
          started_at: string | null;
          status: string | null;
          user_id: string | null;
        };
        Insert: {
          ended_at?: string | null;
          id?: string;
          started_at?: string | null;
          status?: string | null;
          user_id?: string | null;
        };
        Update: {
          ended_at?: string | null;
          id?: string;
          started_at?: string | null;
          status?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      crisis_events: {
        Row: {
          acknowledged_at: string | null;
          conversation_id: string | null;
          created_at: string | null;
          id: string;
          matched_rule: string | null;
          message_id: string | null;
          trigger_source: string;
          urgent_callback_requested_at: string | null;
          user_id: string | null;
        };
        Insert: {
          acknowledged_at?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          matched_rule?: string | null;
          message_id?: string | null;
          trigger_source: string;
          urgent_callback_requested_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          acknowledged_at?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          matched_rule?: string | null;
          message_id?: string | null;
          trigger_source?: string;
          urgent_callback_requested_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      doctors: {
        Row: {
          bio: string | null;
          consultation_fee: number | null;
          created_at: string | null;
          full_name: string;
          id: string;
          is_active: boolean | null;
          languages: string[] | null;
          photo_url: string | null;
          specialties: string[];
          title: string | null;
        };
        Insert: {
          bio?: string | null;
          consultation_fee?: number | null;
          created_at?: string | null;
          full_name: string;
          id?: string;
          is_active?: boolean | null;
          languages?: string[] | null;
          photo_url?: string | null;
          specialties: string[];
          title?: string | null;
        };
        Update: {
          bio?: string | null;
          consultation_fee?: number | null;
          created_at?: string | null;
          full_name?: string;
          id?: string;
          is_active?: boolean | null;
          languages?: string[] | null;
          photo_url?: string | null;
          specialties?: string[];
          title?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          content: string;
          conversation_id: string | null;
          created_at: string | null;
          id: string;
          role: Database["public"]["Enums"]["message_role"];
        };
        Insert: {
          content: string;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          role: Database["public"]["Enums"]["message_role"];
        };
        Update: {
          content?: string;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["message_role"];
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string | null;
          date_of_birth: string | null;
          full_name: string | null;
          id: string;
          locale: string | null;
          phone: string | null;
        };
        Insert: {
          created_at?: string | null;
          date_of_birth?: string | null;
          full_name?: string | null;
          id: string;
          locale?: string | null;
          phone?: string | null;
        };
        Update: {
          created_at?: string | null;
          date_of_birth?: string | null;
          full_name?: string | null;
          id?: string;
          locale?: string | null;
          phone?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      appointment_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show";
      message_role: "user" | "assistant" | "system";
      risk_level: "low" | "moderate" | "elevated" | "high";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database["public"];

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"];

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"];

export type Enums<T extends keyof DefaultSchema["Enums"]> =
  DefaultSchema["Enums"][T];

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      message_role: ["user", "assistant", "system"],
      risk_level: ["low", "moderate", "elevated", "high"],
    },
  },
} as const;
