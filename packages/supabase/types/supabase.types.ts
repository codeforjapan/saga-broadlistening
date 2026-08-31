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
      api_rate_limits: {
        Row: {
          key: string
          request_count: number
          window_start: string
        }
        Insert: {
          key: string
          request_count?: number
          window_start: string
        }
        Update: {
          key?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      bill_contents: {
        Row: {
          bill_id: string
          content: string
          created_at: string
          difficulty_level: Database["public"]["Enums"]["difficulty_level_enum"]
          id: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          bill_id: string
          content: string
          created_at?: string
          difficulty_level: Database["public"]["Enums"]["difficulty_level_enum"]
          id?: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          bill_id?: string
          content?: string
          created_at?: string
          difficulty_level?: Database["public"]["Enums"]["difficulty_level_enum"]
          id?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_contents_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          created_at: string
          id: string
          is_featured: boolean
          is_review_completed: boolean
          knowledge_source: string | null
          name: string
          originating_house: Database["public"]["Enums"]["house_enum"]
          publish_status: Database["public"]["Enums"]["bill_publish_status"]
          publish_status_order: number | null
          published_at: string | null
          share_thumbnail_url: string | null
          shugiin_url: string | null
          slug: string | null
          status: Database["public"]["Enums"]["bill_status_enum"]
          status_note: string | null
          status_order: number | null
          submitted_date: string | null
          thumbnail_url: string | null
          updated_at: string
          use_knowledge_source_in_chat: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          is_featured?: boolean
          is_review_completed?: boolean
          knowledge_source?: string | null
          name: string
          originating_house: Database["public"]["Enums"]["house_enum"]
          publish_status?: Database["public"]["Enums"]["bill_publish_status"]
          publish_status_order?: number | null
          published_at?: string | null
          share_thumbnail_url?: string | null
          shugiin_url?: string | null
          slug?: string | null
          status: Database["public"]["Enums"]["bill_status_enum"]
          status_note?: string | null
          status_order?: number | null
          submitted_date?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          use_knowledge_source_in_chat?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          is_featured?: boolean
          is_review_completed?: boolean
          knowledge_source?: string | null
          name?: string
          originating_house?: Database["public"]["Enums"]["house_enum"]
          publish_status?: Database["public"]["Enums"]["bill_publish_status"]
          publish_status_order?: number | null
          published_at?: string | null
          share_thumbnail_url?: string | null
          shugiin_url?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["bill_status_enum"]
          status_note?: string | null
          status_order?: number | null
          submitted_date?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          use_knowledge_source_in_chat?: boolean
        }
        Relationships: []
      }
      bills_tags: {
        Row: {
          bill_id: string
          created_at: string
          tag_id: string
        }
        Insert: {
          bill_id: string
          created_at?: string
          tag_id: string
        }
        Update: {
          bill_id?: string
          created_at?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_tags_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          role: Database["public"]["Enums"]["chat_role_enum"]
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          role: Database["public"]["Enums"]["chat_role_enum"]
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          role?: Database["public"]["Enums"]["chat_role_enum"]
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          policy_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          policy_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          policy_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_usage_events: {
        Row: {
          cost_usd: number
          created_at: string
          id: string
          input_tokens: number
          metadata: Json | null
          model: string
          occurred_at: string
          output_tokens: number
          prompt_name: string | null
          session_id: string | null
          total_tokens: number
          user_id: string
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model: string
          occurred_at?: string
          output_tokens?: number
          prompt_name?: string | null
          session_id?: string | null
          total_tokens?: number
          user_id: string
        }
        Update: {
          cost_usd?: number
          created_at?: string
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model?: string
          occurred_at?: string
          output_tokens?: number
          prompt_name?: string | null
          session_id?: string | null
          total_tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          bill_id: string
          created_at: string
          id: string
          message: string
          role: Database["public"]["Enums"]["chat_role_enum"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bill_id: string
          created_at?: string
          id?: string
          message: string
          role: Database["public"]["Enums"]["chat_role_enum"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bill_id?: string
          created_at?: string
          id?: string
          message?: string
          role?: Database["public"]["Enums"]["chat_role_enum"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      guard_events: {
        Row: {
          action: Database["public"]["Enums"]["guard_action"]
          chat_session_id: string | null
          created_at: string
          detail: Json | null
          detector: string
          id: string
          interview_session_id: string | null
          product: Database["public"]["Enums"]["guard_product"]
          stage: Database["public"]["Enums"]["guard_stage"]
        }
        Insert: {
          action: Database["public"]["Enums"]["guard_action"]
          chat_session_id?: string | null
          created_at?: string
          detail?: Json | null
          detector: string
          id?: string
          interview_session_id?: string | null
          product: Database["public"]["Enums"]["guard_product"]
          stage: Database["public"]["Enums"]["guard_stage"]
        }
        Update: {
          action?: Database["public"]["Enums"]["guard_action"]
          chat_session_id?: string | null
          created_at?: string
          detail?: Json | null
          detector?: string
          id?: string
          interview_session_id?: string | null
          product?: Database["public"]["Enums"]["guard_product"]
          stage?: Database["public"]["Enums"]["guard_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "guard_events_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_events_interview_session_id_fkey"
            columns: ["interview_session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_configs: {
        Row: {
          chat_model: string
          created_at: string
          deliberation_enabled: boolean
          description: string | null
          ends_at: string | null
          estimated_duration: number | null
          id: string
          name: string
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["interview_config_status_enum"]
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          chat_model: string
          created_at?: string
          deliberation_enabled?: boolean
          description?: string | null
          ends_at?: string | null
          estimated_duration?: number | null
          id?: string
          name: string
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["interview_config_status_enum"]
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          chat_model?: string
          created_at?: string
          deliberation_enabled?: boolean
          description?: string | null
          ends_at?: string | null
          estimated_duration?: number | null
          id?: string
          name?: string
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["interview_config_status_enum"]
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      interview_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          interview_session_id: string
          role: Database["public"]["Enums"]["interview_role_enum"]
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          interview_session_id: string
          role: Database["public"]["Enums"]["interview_role_enum"]
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          interview_session_id?: string
          role?: Database["public"]["Enums"]["interview_role_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_messages_interview_session_id_fkey"
            columns: ["interview_session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          created_at: string
          follow_up_guide: string | null
          id: string
          interview_config_id: string
          question: string
          question_order: number
          quick_replies: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          follow_up_guide?: string | null
          id?: string
          interview_config_id: string
          question: string
          question_order: number
          quick_replies?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          follow_up_guide?: string | null
          id?: string
          interview_config_id?: string
          question?: string
          question_order?: number
          quick_replies?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_questions_interview_config_id_fkey"
            columns: ["interview_config_id"]
            isOneToOne: false
            referencedRelation: "interview_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_rating_feedbacks: {
        Row: {
          created_at: string
          id: string
          interview_session_id: string
          tag: Database["public"]["Enums"]["interview_feedback_tag_enum"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          interview_session_id: string
          tag: Database["public"]["Enums"]["interview_feedback_tag_enum"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          interview_session_id?: string
          tag?: Database["public"]["Enums"]["interview_feedback_tag_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_rating_feedbacks_interview_session_id_fkey"
            columns: ["interview_session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          interview_config_id: string
          rating: number | null
          started_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          interview_config_id: string
          rating?: number | null
          started_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          interview_config_id?: string
          rating?: number | null
          started_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_interview_config_id_fkey"
            columns: ["interview_config_id"]
            isOneToOne: false
            referencedRelation: "interview_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      opinion_reactions: {
        Row: {
          created_at: string
          id: string
          opinion_id: string
          reaction_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          opinion_id: string
          reaction_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          opinion_id?: string
          reaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opinion_reactions_opinion_id_fkey"
            columns: ["opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions"
            referencedColumns: ["id"]
          },
        ]
      }
      opinion_segments: {
        Row: {
          concern: string | null
          content: string
          contextual_quote: string | null
          created_at: string
          id: string
          opinion_id: string
          opinion_index: number
          proposal: string | null
          reasoning_types: string[]
          richness: number | null
          source_message_id: string | null
          tags_extracted_at: string | null
          title: string
          topic_extracted_at: string | null
          updated_at: string
        }
        Insert: {
          concern?: string | null
          content: string
          contextual_quote?: string | null
          created_at?: string
          id?: string
          opinion_id: string
          opinion_index: number
          proposal?: string | null
          reasoning_types?: string[]
          richness?: number | null
          source_message_id?: string | null
          tags_extracted_at?: string | null
          title: string
          topic_extracted_at?: string | null
          updated_at?: string
        }
        Update: {
          concern?: string | null
          content?: string
          contextual_quote?: string | null
          created_at?: string
          id?: string
          opinion_id?: string
          opinion_index?: number
          proposal?: string | null
          reasoning_types?: string[]
          richness?: number | null
          source_message_id?: string | null
          tags_extracted_at?: string | null
          title?: string
          topic_extracted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opinion_segments_opinion_id_fkey"
            columns: ["opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opinion_segments_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "interview_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      opinions: {
        Row: {
          content_richness: Json | null
          created_at: string
          final_text: string
          id: string
          interview_session_id: string
          is_data_reuse_consented: boolean
          is_public_by_admin: boolean
          is_public_by_user: boolean
          moderation_reasoning: string | null
          moderation_score: number | null
          moderation_status:
            | Database["public"]["Enums"]["moderation_status_enum"]
            | null
          opinions_reextracted_at: string | null
          review_status: Database["public"]["Enums"]["opinion_review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          role_description: string | null
          role_title: string | null
          summary: string | null
          total_content_richness: number | null
          updated_at: string
        }
        Insert: {
          content_richness?: Json | null
          created_at?: string
          final_text: string
          id?: string
          interview_session_id: string
          is_data_reuse_consented?: boolean
          is_public_by_admin?: boolean
          is_public_by_user?: boolean
          moderation_reasoning?: string | null
          moderation_score?: number | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status_enum"]
            | null
          opinions_reextracted_at?: string | null
          review_status?: Database["public"]["Enums"]["opinion_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_description?: string | null
          role_title?: string | null
          summary?: string | null
          total_content_richness?: number | null
          updated_at?: string
        }
        Update: {
          content_richness?: Json | null
          created_at?: string
          final_text?: string
          id?: string
          interview_session_id?: string
          is_data_reuse_consented?: boolean
          is_public_by_admin?: boolean
          is_public_by_user?: boolean
          moderation_reasoning?: string | null
          moderation_score?: number | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status_enum"]
            | null
          opinions_reextracted_at?: string | null
          review_status?: Database["public"]["Enums"]["opinion_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_description?: string | null
          role_title?: string | null
          summary?: string | null
          total_content_richness?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opinions_interview_session_id_fkey"
            columns: ["interview_session_id"]
            isOneToOne: true
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          contact: string | null
          created_at: string
          department: string | null
          enable_ai_chat: boolean
          id: string
          is_featured: boolean
          knowledge_source: string | null
          name: string
          publish_status: Database["public"]["Enums"]["policy_publish_status"]
          published_at: string | null
          share_thumbnail_url: string | null
          slug: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          contact?: string | null
          created_at?: string
          department?: string | null
          enable_ai_chat?: boolean
          id?: string
          is_featured?: boolean
          knowledge_source?: string | null
          name: string
          publish_status?: Database["public"]["Enums"]["policy_publish_status"]
          published_at?: string | null
          share_thumbnail_url?: string | null
          slug: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          contact?: string | null
          created_at?: string
          department?: string | null
          enable_ai_chat?: boolean
          id?: string
          is_featured?: boolean
          knowledge_source?: string | null
          name?: string
          publish_status?: Database["public"]["Enums"]["policy_publish_status"]
          published_at?: string | null
          share_thumbnail_url?: string | null
          slug?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      policies_interview_configs: {
        Row: {
          created_at: string
          interview_config_id: string
          policy_id: string
        }
        Insert: {
          created_at?: string
          interview_config_id: string
          policy_id: string
        }
        Update: {
          created_at?: string
          interview_config_id?: string
          policy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_interview_configs_interview_config_id_fkey"
            columns: ["interview_config_id"]
            isOneToOne: false
            referencedRelation: "interview_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_interview_configs_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      policies_tags: {
        Row: {
          created_at: string
          policy_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          policy_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          policy_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_tags_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_contents: {
        Row: {
          content: string
          created_at: string
          difficulty_level: Database["public"]["Enums"]["difficulty_level_enum"]
          id: string
          policy_id: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          difficulty_level?: Database["public"]["Enums"]["difficulty_level_enum"]
          id?: string
          policy_id: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          difficulty_level?: Database["public"]["Enums"]["difficulty_level_enum"]
          id?: string
          policy_id?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_contents_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_controls: {
        Row: {
          created_at: string
          emergency_stop: boolean
          id: string
          interview_stop: boolean
          notice_message: string | null
          policy_chat_stop: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          emergency_stop?: boolean
          id?: string
          interview_stop?: boolean
          notice_message?: string | null
          policy_chat_stop?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          emergency_stop?: boolean
          id?: string
          interview_stop?: boolean
          notice_message?: string | null
          policy_chat_stop?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      preview_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          policy_id: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          policy_id: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          policy_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preview_tokens_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          description: string | null
          featured_priority: number | null
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          featured_priority?: number | null
          id?: string
          label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          featured_priority?: number | null
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      topic: {
        Row: {
          created_at: string
          description: string
          id: string
          parent_topic_id: string | null
          sort_order: number
          title: string
          version_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          parent_topic_id?: string | null
          sort_order?: number
          title: string
          version_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          parent_topic_id?: string | null
          sort_order?: number
          title?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_parent_same_version_fkey"
            columns: ["version_id", "parent_topic_id"]
            isOneToOne: false
            referencedRelation: "topic"
            referencedColumns: ["version_id", "id"]
          },
          {
            foreignKeyName: "topic_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "topic_analysis_version"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_analysis_classifications: {
        Row: {
          created_at: string
          id: string
          opinion_id: string
          opinion_index: number | null
          topic_id: string
          updated_at: string
          version_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opinion_id: string
          opinion_index?: number | null
          topic_id: string
          updated_at?: string
          version_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opinion_id?: string
          opinion_index?: number | null
          topic_id?: string
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_analysis_classifications_opinion_id_fkey"
            columns: ["opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_analysis_classifications_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topic_analysis_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_analysis_classifications_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "topic_analysis_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_analysis_topics: {
        Row: {
          created_at: string
          description_md: string | null
          id: string
          name: string
          representative_opinions: Json
          sort_order: number
          updated_at: string
          version_id: string
        }
        Insert: {
          created_at?: string
          description_md?: string | null
          id?: string
          name: string
          representative_opinions?: Json
          sort_order?: number
          updated_at?: string
          version_id: string
        }
        Update: {
          created_at?: string
          description_md?: string | null
          id?: string
          name?: string
          representative_opinions?: Json
          sort_order?: number
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_analysis_topics_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "topic_analysis_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_analysis_version: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: string | null
          error_message: string | null
          id: string
          interview_config_id: string
          is_published: boolean
          model: string | null
          progress: Json | null
          prompt_version: string | null
          source_opinion_count: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["topic_analysis_status"]
          trigger: string
          version: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          id?: string
          interview_config_id: string
          is_published?: boolean
          model?: string | null
          progress?: Json | null
          prompt_version?: string | null
          source_opinion_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["topic_analysis_status"]
          trigger: string
          version: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          id?: string
          interview_config_id?: string
          is_published?: boolean
          model?: string | null
          progress?: Json | null
          prompt_version?: string | null
          source_opinion_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["topic_analysis_status"]
          trigger?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "topic_analysis_version_interview_config_id_fkey"
            columns: ["interview_config_id"]
            isOneToOne: false
            referencedRelation: "interview_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_analysis_versions: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: string | null
          error_message: string | null
          id: string
          intermediate_results: Json | null
          interview_config_id: string
          phase_data: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["topic_analysis_status"]
          summary_md: string | null
          updated_at: string
          version: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          id?: string
          intermediate_results?: Json | null
          interview_config_id: string
          phase_data?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["topic_analysis_status"]
          summary_md?: string | null
          updated_at?: string
          version: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          id?: string
          intermediate_results?: Json | null
          interview_config_id?: string
          phase_data?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["topic_analysis_status"]
          summary_md?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "topic_analysis_versions_interview_config_id_fkey"
            columns: ["interview_config_id"]
            isOneToOne: false
            referencedRelation: "interview_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_opinion: {
        Row: {
          opinion_segment_id: string
          topic_id: string
          version_id: string
        }
        Insert: {
          opinion_segment_id: string
          topic_id: string
          version_id: string
        }
        Update: {
          opinion_segment_id?: string
          topic_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_opinion_opinion_segment_id_fkey"
            columns: ["opinion_segment_id"]
            isOneToOne: false
            referencedRelation: "opinion_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_opinion_topic_fk"
            columns: ["version_id", "topic_id"]
            isOneToOne: false
            referencedRelation: "topic"
            referencedColumns: ["version_id", "id"]
          },
          {
            foreignKeyName: "topic_opinion_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "topic_analysis_version"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_admin_role_if_eligible: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      bulk_publish_opinions: {
        Args: {
          p_config_id: string
          p_max_moderation_score: number
          p_min_content_richness: number
          p_reviewed_by?: string
        }
        Returns: number
      }
      count_bulk_publish_opinion_targets: {
        Args: {
          p_config_id: string
          p_max_moderation_score: number
          p_min_content_richness: number
        }
        Returns: number
      }
      count_reactions_by_opinion_ids: {
        Args: { opinion_ids: string[] }
        Returns: {
          cnt: number
          opinion_id: string
          reaction_type: string
        }[]
      }
      count_sessions_by_config_ids: {
        Args: { p_config_ids: string[] }
        Returns: {
          interview_config_id: string
          session_count: number
        }[]
      }
      extract_assistant_question_id: {
        Args: { content: string }
        Returns: string
      }
      find_open_data_opinions: {
        Args: {
          p_cursor_created_at?: string
          p_cursor_id?: string
          p_limit: number
          p_min_public_opinions: number
        }
        Returns: {
          created_at: string
          final_text: string
          interview_config_id: string
          interview_config_name: string
          interview_session_id: string
          opinion_id: string
          role_description: string
          role_title: string
          summary: string
        }[]
      }
      find_public_opinions_by_config_id_ordered_by_reactions: {
        Args: {
          p_interview_config_id: string
          p_limit?: number
          p_offset?: number
          p_sort_order?: string
        }
        Returns: {
          created_at: string
          final_text: string
          id: string
          role_title: string
          summary: string
          total_content_richness: number
        }[]
      }
      find_sessions_ordered_by_helpful_count: {
        Args: {
          p_ascending?: boolean
          p_config_id: string
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_visibility?: string
        }
        Returns: {
          session_id: string
        }[]
      }
      find_sessions_ordered_by_message_count: {
        Args: {
          p_ascending?: boolean
          p_config_id: string
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_visibility?: string
        }
        Returns: {
          session_id: string
        }[]
      }
      find_sessions_ordered_by_moderation_score: {
        Args: {
          p_ascending?: boolean
          p_config_id: string
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_visibility?: string
        }
        Returns: {
          session_id: string
        }[]
      }
      find_sessions_ordered_by_total_content_richness: {
        Args: {
          p_ascending?: boolean
          p_config_id: string
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_visibility?: string
        }
        Returns: {
          session_id: string
        }[]
      }
      get_admin_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
        }[]
      }
      get_interview_message_counts: {
        Args: { session_ids: string[] }
        Returns: {
          interview_session_id: string
          message_count: number
        }[]
      }
      get_interview_metrics_by_config: {
        Args: { p_interview_config_id?: string }
        Returns: {
          completed_count: number
          completion_rate: number
          conducted_count: number
          interview_config_id: string
          interview_config_name: string
          total_duration_seconds: number
        }[]
      }
      get_interview_statistics: {
        Args: { p_config_id: string }
        Returns: {
          avg_message_count: number
          avg_rating: number
          avg_total_content_richness: number
          completed_sessions: number
          feedback_irrelevant_questions: number
          feedback_misunderstood: number
          feedback_not_aligned: number
          feedback_other: number
          feedback_too_many_questions: number
          median_duration_seconds: number
          public_by_user_count: number
          published_count: number
          total_duration_seconds: number
          total_sessions: number
        }[]
      }
      get_question_answer_counts: {
        Args: { p_config_id: string }
        Returns: {
          answered_session_count: number
          asked_session_count: number
          question: string
          question_id: string
          question_order: number
        }[]
      }
      increment_api_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_start: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      mark_opinions_extracted: {
        Args: { p_extracted_at: string; p_ids: string[] }
        Returns: undefined
      }
      publish_topic_analysis_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      sum_chat_usage_cost: {
        Args: { from_iso: string; to_iso: string }
        Returns: number
      }
      unpublish_opinions_by_config_id: {
        Args: { p_config_id: string }
        Returns: undefined
      }
    }
    Enums: {
      bill_publish_status: "draft" | "published" | "coming_soon"
      bill_status_enum:
        | "introduced"
        | "in_originating_house"
        | "in_receiving_house"
        | "enacted"
        | "rejected"
        | "preparing"
      chat_role_enum: "user" | "system" | "assistant"
      difficulty_level_enum: "normal" | "hard"
      guard_action: "allow" | "rewrite" | "notice" | "block" | "hold_for_review"
      guard_product: "policy_chat" | "interview"
      guard_stage: "input" | "in_dialogue" | "output"
      house_enum: "HR" | "HC"
      interview_config_status_enum: "draft" | "open" | "closed"
      interview_feedback_tag_enum:
        | "irrelevant_questions"
        | "not_aligned"
        | "misunderstood"
        | "too_many_questions"
        | "other"
      interview_mode_enum: "loop" | "bulk" | "targeted"
      interview_report_role_enum:
        | "subject_expert"
        | "work_related"
        | "daily_life_affected"
        | "general_citizen"
      interview_role_enum: "assistant" | "user"
      moderation_status_enum: "ok" | "warning" | "ng"
      opinion_review_status: "published" | "pending_review" | "hidden"
      policy_publish_status: "draft" | "published"
      stance_type_enum:
        | "for"
        | "against"
        | "neutral"
        | "conditional_for"
        | "conditional_against"
        | "considering"
        | "continued_deliberation"
        | "free_vote"
      topic_analysis_status: "pending" | "running" | "completed" | "failed"
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
      bill_publish_status: ["draft", "published", "coming_soon"],
      bill_status_enum: [
        "introduced",
        "in_originating_house",
        "in_receiving_house",
        "enacted",
        "rejected",
        "preparing",
      ],
      chat_role_enum: ["user", "system", "assistant"],
      difficulty_level_enum: ["normal", "hard"],
      guard_action: ["allow", "rewrite", "notice", "block", "hold_for_review"],
      guard_product: ["policy_chat", "interview"],
      guard_stage: ["input", "in_dialogue", "output"],
      house_enum: ["HR", "HC"],
      interview_config_status_enum: ["draft", "open", "closed"],
      interview_feedback_tag_enum: [
        "irrelevant_questions",
        "not_aligned",
        "misunderstood",
        "too_many_questions",
        "other",
      ],
      interview_mode_enum: ["loop", "bulk", "targeted"],
      interview_report_role_enum: [
        "subject_expert",
        "work_related",
        "daily_life_affected",
        "general_citizen",
      ],
      interview_role_enum: ["assistant", "user"],
      moderation_status_enum: ["ok", "warning", "ng"],
      opinion_review_status: ["published", "pending_review", "hidden"],
      policy_publish_status: ["draft", "published"],
      stance_type_enum: [
        "for",
        "against",
        "neutral",
        "conditional_for",
        "conditional_against",
        "considering",
        "continued_deliberation",
        "free_vote",
      ],
      topic_analysis_status: ["pending", "running", "completed", "failed"],
    },
  },
} as const
