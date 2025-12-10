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
      approval_actions: {
        Row: {
          action: Database["public"]["Enums"]["approval_action"]
          approval_request_id: string
          approver_role: Database["public"]["Enums"]["approver_role"]
          approver_user_id: string | null
          comment: string | null
          created_at: string
          id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["approval_action"]
          approval_request_id: string
          approver_role: Database["public"]["Enums"]["approver_role"]
          approver_user_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["approval_action"]
          approval_request_id?: string
          approver_role?: Database["public"]["Enums"]["approver_role"]
          approver_user_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_actions_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          created_at: string
          current_approver_index: number
          id: string
          required_approvers: Database["public"]["Enums"]["approver_role"][]
          rule_triggered: string
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_approver_index?: number
          id?: string
          required_approvers: Database["public"]["Enums"]["approver_role"][]
          rule_triggered: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_approver_index?: number
          id?: string
          required_approvers?: Database["public"]["Enums"]["approver_role"][]
          rule_triggered?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_rules: {
        Row: {
          conditions: Json
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          name: string
          priority: number
          required_approvers: string[]
          updated_at: string
        }
        Insert: {
          conditions: Json
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          name: string
          priority?: number
          required_approvers: string[]
          updated_at?: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          priority?: number
          required_approvers?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      bl_container_photos: {
        Row: {
          bl_order_id: number
          container_id: number
          container_number: string
          content_type: string
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          file_name_original: string
          file_path: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          bl_order_id: number
          container_id: number
          container_number: string
          content_type: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          file_name_original: string
          file_path: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          bl_order_id?: number
          container_id?: number
          container_number?: string
          content_type?: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          file_name_original?: string
          file_path?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bl_container_photos_bl_order_id_fkey"
            columns: ["bl_order_id"]
            isOneToOne: false
            referencedRelation: "bl_order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bl_container_photos_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "bl_extraction_container"
            referencedColumns: ["id"]
          },
        ]
      }
      bl_extraction: {
        Row: {
          applicable_free_days: number | null
          bl_issue_date: string | null
          bl_number: string | null
          bl_order_id: number | null
          bl_order_name: string | null
          consignee_address: string | null
          consignee_contact_person_email: string | null
          consignee_contact_person_name: string | null
          consignee_name: string | null
          country_of_origin: string | null
          created_at: string
          description_of_goods: string | null
          final_destination: string | null
          hs_code: number | null
          id: number
          loading_date: string | null
          notify_address: string | null
          notify_contact_person_email: string | null
          notify_contact_person_name: string | null
          notify_name: string | null
          number_of_containers: number | null
          number_of_packages: number | null
          port_of_discharge: string | null
          port_of_loading: string | null
          product_description: string | null
          shipper: string | null
          shipping_line: string | null
          total_gross_weight: number | null
          total_net_weight: number | null
          vessel_name: string | null
        }
        Insert: {
          applicable_free_days?: number | null
          bl_issue_date?: string | null
          bl_number?: string | null
          bl_order_id?: number | null
          bl_order_name?: string | null
          consignee_address?: string | null
          consignee_contact_person_email?: string | null
          consignee_contact_person_name?: string | null
          consignee_name?: string | null
          country_of_origin?: string | null
          created_at?: string
          description_of_goods?: string | null
          final_destination?: string | null
          hs_code?: number | null
          id?: number
          loading_date?: string | null
          notify_address?: string | null
          notify_contact_person_email?: string | null
          notify_contact_person_name?: string | null
          notify_name?: string | null
          number_of_containers?: number | null
          number_of_packages?: number | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          product_description?: string | null
          shipper?: string | null
          shipping_line?: string | null
          total_gross_weight?: number | null
          total_net_weight?: number | null
          vessel_name?: string | null
        }
        Update: {
          applicable_free_days?: number | null
          bl_issue_date?: string | null
          bl_number?: string | null
          bl_order_id?: number | null
          bl_order_name?: string | null
          consignee_address?: string | null
          consignee_contact_person_email?: string | null
          consignee_contact_person_name?: string | null
          consignee_name?: string | null
          country_of_origin?: string | null
          created_at?: string
          description_of_goods?: string | null
          final_destination?: string | null
          hs_code?: number | null
          id?: number
          loading_date?: string | null
          notify_address?: string | null
          notify_contact_person_email?: string | null
          notify_contact_person_name?: string | null
          notify_name?: string | null
          number_of_containers?: number | null
          number_of_packages?: number | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          product_description?: string | null
          shipper?: string | null
          shipping_line?: string | null
          total_gross_weight?: number | null
          total_net_weight?: number | null
          vessel_name?: string | null
        }
        Relationships: []
      }
      bl_extraction_container: {
        Row: {
          bl_number: string | null
          bl_order_id: number | null
          container_number: string | null
          created_at: string
          gross_weight: number | null
          id: number
          net_weight: number | null
          seal_number: string | null
        }
        Insert: {
          bl_number?: string | null
          bl_order_id?: number | null
          container_number?: string | null
          created_at?: string
          gross_weight?: number | null
          id?: number
          net_weight?: number | null
          seal_number?: string | null
        }
        Update: {
          bl_number?: string | null
          bl_order_id?: number | null
          container_number?: string | null
          created_at?: string
          gross_weight?: number | null
          id?: number
          net_weight?: number | null
          seal_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bl_extraction_container_bl_order_id_fkey"
            columns: ["bl_order_id"]
            isOneToOne: false
            referencedRelation: "bl_order"
            referencedColumns: ["id"]
          },
        ]
      }
      bl_order: {
        Row: {
          ata: string | null
          atd: string | null
          bl_confirmed_date: string | null
          bl_issue_date: string | null
          bl_number: string | null
          bl_order_name: string | null
          bl_release_date: string | null
          bl_url: string | null
          booking_date: string | null
          buy_final_price: number | null
          cost: number | null
          created_at: string
          customs_clearance: string | null
          delete_reason: string | null
          deleted_at: string | null
          documents_sent_date: string | null
          eta: string | null
          etd: string | null
          final_destination: string | null
          final_invoice_id: string | null
          id: number
          initial_eta: string | null
          loaded_quantity_mt: number | null
          loading_date: string | null
          notes: string | null
          order_id: string | null
          port_of_discharge: string | null
          port_of_loading: string | null
          revenue: number | null
          sell_final_price: number | null
          status: string | null
          total_quantity_mt: number | null
          updated_at: string | null
        }
        Insert: {
          ata?: string | null
          atd?: string | null
          bl_confirmed_date?: string | null
          bl_issue_date?: string | null
          bl_number?: string | null
          bl_order_name?: string | null
          bl_release_date?: string | null
          bl_url?: string | null
          booking_date?: string | null
          buy_final_price?: number | null
          cost?: number | null
          created_at?: string
          customs_clearance?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          documents_sent_date?: string | null
          eta?: string | null
          etd?: string | null
          final_destination?: string | null
          final_invoice_id?: string | null
          id?: number
          initial_eta?: string | null
          loaded_quantity_mt?: number | null
          loading_date?: string | null
          notes?: string | null
          order_id?: string | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          revenue?: number | null
          sell_final_price?: number | null
          status?: string | null
          total_quantity_mt?: number | null
          updated_at?: string | null
        }
        Update: {
          ata?: string | null
          atd?: string | null
          bl_confirmed_date?: string | null
          bl_issue_date?: string | null
          bl_number?: string | null
          bl_order_name?: string | null
          bl_release_date?: string | null
          bl_url?: string | null
          booking_date?: string | null
          buy_final_price?: number | null
          cost?: number | null
          created_at?: string
          customs_clearance?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          documents_sent_date?: string | null
          eta?: string | null
          etd?: string | null
          final_destination?: string | null
          final_invoice_id?: string | null
          id?: number
          initial_eta?: string | null
          loaded_quantity_mt?: number | null
          loading_date?: string | null
          notes?: string | null
          order_id?: string | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          revenue?: number | null
          sell_final_price?: number | null
          status?: string | null
          total_quantity_mt?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bl_order_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_bank_balance: {
        Row: {
          account_name: string | null
          amount: number
          as_of_date: string
          created_at: string
          currency: string | null
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          amount?: number
          as_of_date: string
          created_at?: string
          currency?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          amount?: number
          as_of_date?: string
          created_at?: string
          currency?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      claims: {
        Row: {
          assigned_trader_id: number | null
          ata: string | null
          bl_order_id: number | null
          bl_order_name: string | null
          buyer_evidence_files: string[] | null
          buyer_id: number | null
          claim_debit_note_url: string | null
          claim_description: string | null
          claim_due_date: string | null
          claim_evidence_files: string[] | null
          claim_photo_urls: string[] | null
          claim_reference: string | null
          claim_type: Database["public"]["Enums"]["claim_type_enum"]
          claimed_file_date: string | null
          claimed_value_amount: number | null
          claimed_value_currency: string | null
          commodity_type:
            | Database["public"]["Enums"]["commodity_type_enum"]
            | null
          created_at: string
          days_to_resolve_since_ata: number | null
          days_to_resolve_since_claim: number | null
          delete_reason: string | null
          deleted_at: string | null
          external_inspection_provided: boolean | null
          external_inspection_report_url: string | null
          final_settlement_amount: number | null
          final_settlement_currency: string | null
          first_day_communicated_to_supplier: string | null
          id: string
          inspection_company_id: number | null
          inspection_report_url: string | null
          lab_results_url: string | null
          order_id: string | null
          photos_urls: string[] | null
          raised_to_supplier: boolean | null
          settlement_agreed_date: string | null
          settlement_document_url: string | null
          settlement_option: string | null
          settlement_status: string | null
          status: Database["public"]["Enums"]["claim_status_enum"]
          supplier_counter_offer_amount: number | null
          supplier_id: number | null
          supplier_notes: string | null
          supplier_response_status:
            | Database["public"]["Enums"]["supplier_response_enum"]
            | null
          supplier_shared_docs_urls: string[] | null
          third_party_inspection_costs: number | null
          trader_notes: string | null
          updated_at: string
          way_of_settling: string | null
        }
        Insert: {
          assigned_trader_id?: number | null
          ata?: string | null
          bl_order_id?: number | null
          bl_order_name?: string | null
          buyer_evidence_files?: string[] | null
          buyer_id?: number | null
          claim_debit_note_url?: string | null
          claim_description?: string | null
          claim_due_date?: string | null
          claim_evidence_files?: string[] | null
          claim_photo_urls?: string[] | null
          claim_reference?: string | null
          claim_type?: Database["public"]["Enums"]["claim_type_enum"]
          claimed_file_date?: string | null
          claimed_value_amount?: number | null
          claimed_value_currency?: string | null
          commodity_type?:
            | Database["public"]["Enums"]["commodity_type_enum"]
            | null
          created_at?: string
          days_to_resolve_since_ata?: number | null
          days_to_resolve_since_claim?: number | null
          delete_reason?: string | null
          deleted_at?: string | null
          external_inspection_provided?: boolean | null
          external_inspection_report_url?: string | null
          final_settlement_amount?: number | null
          final_settlement_currency?: string | null
          first_day_communicated_to_supplier?: string | null
          id?: string
          inspection_company_id?: number | null
          inspection_report_url?: string | null
          lab_results_url?: string | null
          order_id?: string | null
          photos_urls?: string[] | null
          raised_to_supplier?: boolean | null
          settlement_agreed_date?: string | null
          settlement_document_url?: string | null
          settlement_option?: string | null
          settlement_status?: string | null
          status?: Database["public"]["Enums"]["claim_status_enum"]
          supplier_counter_offer_amount?: number | null
          supplier_id?: number | null
          supplier_notes?: string | null
          supplier_response_status?:
            | Database["public"]["Enums"]["supplier_response_enum"]
            | null
          supplier_shared_docs_urls?: string[] | null
          third_party_inspection_costs?: number | null
          trader_notes?: string | null
          updated_at?: string
          way_of_settling?: string | null
        }
        Update: {
          assigned_trader_id?: number | null
          ata?: string | null
          bl_order_id?: number | null
          bl_order_name?: string | null
          buyer_evidence_files?: string[] | null
          buyer_id?: number | null
          claim_debit_note_url?: string | null
          claim_description?: string | null
          claim_due_date?: string | null
          claim_evidence_files?: string[] | null
          claim_photo_urls?: string[] | null
          claim_reference?: string | null
          claim_type?: Database["public"]["Enums"]["claim_type_enum"]
          claimed_file_date?: string | null
          claimed_value_amount?: number | null
          claimed_value_currency?: string | null
          commodity_type?:
            | Database["public"]["Enums"]["commodity_type_enum"]
            | null
          created_at?: string
          days_to_resolve_since_ata?: number | null
          days_to_resolve_since_claim?: number | null
          delete_reason?: string | null
          deleted_at?: string | null
          external_inspection_provided?: boolean | null
          external_inspection_report_url?: string | null
          final_settlement_amount?: number | null
          final_settlement_currency?: string | null
          first_day_communicated_to_supplier?: string | null
          id?: string
          inspection_company_id?: number | null
          inspection_report_url?: string | null
          lab_results_url?: string | null
          order_id?: string | null
          photos_urls?: string[] | null
          raised_to_supplier?: boolean | null
          settlement_agreed_date?: string | null
          settlement_document_url?: string | null
          settlement_option?: string | null
          settlement_status?: string | null
          status?: Database["public"]["Enums"]["claim_status_enum"]
          supplier_counter_offer_amount?: number | null
          supplier_id?: number | null
          supplier_notes?: string | null
          supplier_response_status?:
            | Database["public"]["Enums"]["supplier_response_enum"]
            | null
          supplier_shared_docs_urls?: string[] | null
          third_party_inspection_costs?: number | null
          trader_notes?: string | null
          updated_at?: string
          way_of_settling?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_assigned_trader_id_fkey"
            columns: ["assigned_trader_id"]
            isOneToOne: false
            referencedRelation: "traders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_bl_order_id_fkey"
            columns: ["bl_order_id"]
            isOneToOne: false
            referencedRelation: "bl_order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_inspection_company_id_fkey"
            columns: ["inspection_company_id"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
        ]
      }
      Company: {
        Row: {
          address_id: number | null
          aggregated_late_payment_days: number | null
          amount_overdue: number | null
          created_at: string | null
          credit_limit: number | null
          current_exposure: number | null
          detected_last_checked: string | null
          detected_profile_id: string | null
          detected_review_status: string | null
          detected_risk_category: string | null
          detected_risk_label: string | null
          id: number
          kyb_effective_date: string | null
          kyb_status: Database["public"]["Enums"]["kyb_status"] | null
          name: string
          payment_terms: string | null
          risk_rating: string | null
          total_MT_loaded: number | null
          total_MT_signed: number | null
          total_traded_volume: number | null
          trade_credit_limit: number | null
          trader_relationship_owner:
            | Database["public"]["Enums"]["trader_relationship_owner"]
            | null
        }
        Insert: {
          address_id?: number | null
          aggregated_late_payment_days?: number | null
          amount_overdue?: number | null
          created_at?: string | null
          credit_limit?: number | null
          current_exposure?: number | null
          detected_last_checked?: string | null
          detected_profile_id?: string | null
          detected_review_status?: string | null
          detected_risk_category?: string | null
          detected_risk_label?: string | null
          id?: number
          kyb_effective_date?: string | null
          kyb_status?: Database["public"]["Enums"]["kyb_status"] | null
          name: string
          payment_terms?: string | null
          risk_rating?: string | null
          total_MT_loaded?: number | null
          total_MT_signed?: number | null
          total_traded_volume?: number | null
          trade_credit_limit?: number | null
          trader_relationship_owner?:
            | Database["public"]["Enums"]["trader_relationship_owner"]
            | null
        }
        Update: {
          address_id?: number | null
          aggregated_late_payment_days?: number | null
          amount_overdue?: number | null
          created_at?: string | null
          credit_limit?: number | null
          current_exposure?: number | null
          detected_last_checked?: string | null
          detected_profile_id?: string | null
          detected_review_status?: string | null
          detected_risk_category?: string | null
          detected_risk_label?: string | null
          id?: number
          kyb_effective_date?: string | null
          kyb_status?: Database["public"]["Enums"]["kyb_status"] | null
          name?: string
          payment_terms?: string | null
          risk_rating?: string | null
          total_MT_loaded?: number | null
          total_MT_signed?: number | null
          total_traded_volume?: number | null
          trade_credit_limit?: number | null
          trader_relationship_owner?:
            | Database["public"]["Enums"]["trader_relationship_owner"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "Company_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "Company_address"
            referencedColumns: ["id"]
          },
        ]
      }
      Company_address: {
        Row: {
          city: string | null
          company_id: number
          contact_name_1: string | null
          contact_name_2: string | null
          country: string | null
          email_1: string | null
          email_2: string | null
          id: number
          iec_code: string | null
          is_primary: boolean | null
          job_position_1: string | null
          job_position_2: string | null
          line1: string | null
          pan_number: string | null
          phone_1: string | null
          phone_2: string | null
          post_code: string | null
          region: string | null
          VAT_id: string | null
        }
        Insert: {
          city?: string | null
          company_id: number
          contact_name_1?: string | null
          contact_name_2?: string | null
          country?: string | null
          email_1?: string | null
          email_2?: string | null
          id?: number
          iec_code?: string | null
          is_primary?: boolean | null
          job_position_1?: string | null
          job_position_2?: string | null
          line1?: string | null
          pan_number?: string | null
          phone_1?: string | null
          phone_2?: string | null
          post_code?: string | null
          region?: string | null
          VAT_id?: string | null
        }
        Update: {
          city?: string | null
          company_id?: number
          contact_name_1?: string | null
          contact_name_2?: string | null
          country?: string | null
          email_1?: string | null
          email_2?: string | null
          id?: number
          iec_code?: string | null
          is_primary?: boolean | null
          job_position_1?: string | null
          job_position_2?: string | null
          line1?: string | null
          pan_number?: string | null
          phone_1?: string | null
          phone_2?: string | null
          post_code?: string | null
          region?: string | null
          VAT_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Company_address_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
        ]
      }
      company_documents: {
        Row: {
          company_id: number
          delete_reason: string | null
          deleted_at: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          company_id: number
          delete_reason?: string | null
          deleted_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          company_id?: number
          delete_reason?: string | null
          deleted_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
        ]
      }
      company_notes: {
        Row: {
          company_id: number
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          id: string
          note_text: string
          updated_at: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          company_id: number
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          id?: string
          note_text: string
          updated_at?: string
          user_id?: string | null
          user_name: string
        }
        Update: {
          company_id?: number
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          id?: string
          note_text?: string
          updated_at?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
        ]
      }
      control_payments: {
        Row: {
          actual_due_date: string | null
          bl_order_name: string | null
          company_name: string | null
          created_at: string
          currency: string | null
          id: number
          invoice_direction: string | null
          invoice_id: number | null
          order_id: string | null
          original_due_date: string | null
          overdue_days: number | null
          paid_date: string | null
          reference_note: string | null
          total_amount: number | null
          total_amount_paid: number | null
        }
        Insert: {
          actual_due_date?: string | null
          bl_order_name?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          id?: number
          invoice_direction?: string | null
          invoice_id?: number | null
          order_id?: string | null
          original_due_date?: string | null
          overdue_days?: number | null
          paid_date?: string | null
          reference_note?: string | null
          total_amount?: number | null
          total_amount_paid?: number | null
        }
        Update: {
          actual_due_date?: string | null
          bl_order_name?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          id?: number
          invoice_direction?: string | null
          invoice_id?: number | null
          order_id?: string | null
          original_due_date?: string | null
          overdue_days?: number | null
          paid_date?: string | null
          reference_note?: string | null
          total_amount?: number | null
          total_amount_paid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "control_payments_bl_order_name_fkey"
            columns: ["bl_order_name"]
            isOneToOne: false
            referencedRelation: "bl_order"
            referencedColumns: ["bl_order_name"]
          },
          {
            foreignKeyName: "control_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
        ]
      }
      document_signatures: {
        Row: {
          completed_at: string | null
          created_at: string | null
          document_name: string
          document_type: string
          document_url: string | null
          error_message: string | null
          id: string
          pandadoc_document_id: string | null
          recipients: Json | null
          reference_id: string
          reference_table: string
          sent_at: string | null
          signed_document_url: string | null
          signing_link: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          document_name: string
          document_type: string
          document_url?: string | null
          error_message?: string | null
          id?: string
          pandadoc_document_id?: string | null
          recipients?: Json | null
          reference_id: string
          reference_table: string
          sent_at?: string | null
          signed_document_url?: string | null
          signing_link?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          document_name?: string
          document_type?: string
          document_url?: string | null
          error_message?: string | null
          id?: string
          pandadoc_document_id?: string | null
          recipients?: Json | null
          reference_id?: string
          reference_table?: string
          sent_at?: string | null
          signed_document_url?: string | null
          signing_link?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          category: string
          content: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      generated_documents: {
        Row: {
          bl_order_id: number | null
          document_name: string
          document_url: string | null
          generated_at: string | null
          id: string
          template_id: string | null
        }
        Insert: {
          bl_order_id?: number | null
          document_name: string
          document_url?: string | null
          generated_at?: string | null
          id?: string
          template_id?: string | null
        }
        Update: {
          bl_order_id?: number | null
          document_name?: string
          document_url?: string | null
          generated_at?: string | null
          id?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_bl_order_id_fkey"
            columns: ["bl_order_id"]
            isOneToOne: false
            referencedRelation: "bl_order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      hedge_execution: {
        Row: {
          broker_name: string | null
          closed_at: string | null
          closed_price: number | null
          contract_reference: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          direction: Database["public"]["Enums"]["hedge_direction"]
          exchange: string | null
          executed_price: number
          executed_price_currency: string | null
          execution_date: string
          expiry_date: string | null
          hedge_request_id: string | null
          id: string
          instrument: Database["public"]["Enums"]["hedge_instrument"]
          metal: Database["public"]["Enums"]["commodity_type_enum"]
          notes: string | null
          open_quantity_mt: number | null
          pnl_realized: number | null
          pnl_unrealized: number | null
          quantity_mt: number
          reference_type: Database["public"]["Enums"]["reference_type"] | null
          status: string | null
          updated_at: string
        }
        Insert: {
          broker_name?: string | null
          closed_at?: string | null
          closed_price?: number | null
          contract_reference?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          direction: Database["public"]["Enums"]["hedge_direction"]
          exchange?: string | null
          executed_price: number
          executed_price_currency?: string | null
          execution_date: string
          expiry_date?: string | null
          hedge_request_id?: string | null
          id?: string
          instrument?: Database["public"]["Enums"]["hedge_instrument"]
          metal: Database["public"]["Enums"]["commodity_type_enum"]
          notes?: string | null
          open_quantity_mt?: number | null
          pnl_realized?: number | null
          pnl_unrealized?: number | null
          quantity_mt: number
          reference_type?: Database["public"]["Enums"]["reference_type"] | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          broker_name?: string | null
          closed_at?: string | null
          closed_price?: number | null
          contract_reference?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          direction?: Database["public"]["Enums"]["hedge_direction"]
          exchange?: string | null
          executed_price?: number
          executed_price_currency?: string | null
          execution_date?: string
          expiry_date?: string | null
          hedge_request_id?: string | null
          id?: string
          instrument?: Database["public"]["Enums"]["hedge_instrument"]
          metal?: Database["public"]["Enums"]["commodity_type_enum"]
          notes?: string | null
          open_quantity_mt?: number | null
          pnl_realized?: number | null
          pnl_unrealized?: number | null
          quantity_mt?: number
          reference_type?: Database["public"]["Enums"]["reference_type"] | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hedge_execution_hedge_request_id_fkey"
            columns: ["hedge_request_id"]
            isOneToOne: false
            referencedRelation: "hedge_request"
            referencedColumns: ["id"]
          },
        ]
      }
      hedge_link: {
        Row: {
          allocated_quantity_mt: number
          allocation_proportion: number | null
          created_at: string
          direction: string | null
          exec_price: number | null
          fixing_id: string | null
          fixing_price: number | null
          hedge_execution_id: string
          id: string
          link_id: string
          link_level: Database["public"]["Enums"]["hedge_link_level"]
          metal: string | null
          notes: string | null
          side: string | null
        }
        Insert: {
          allocated_quantity_mt: number
          allocation_proportion?: number | null
          created_at?: string
          direction?: string | null
          exec_price?: number | null
          fixing_id?: string | null
          fixing_price?: number | null
          hedge_execution_id: string
          id?: string
          link_id: string
          link_level: Database["public"]["Enums"]["hedge_link_level"]
          metal?: string | null
          notes?: string | null
          side?: string | null
        }
        Update: {
          allocated_quantity_mt?: number
          allocation_proportion?: number | null
          created_at?: string
          direction?: string | null
          exec_price?: number | null
          fixing_id?: string | null
          fixing_price?: number | null
          hedge_execution_id?: string
          id?: string
          link_id?: string
          link_level?: Database["public"]["Enums"]["hedge_link_level"]
          metal?: string | null
          notes?: string | null
          side?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hedge_link_fixing_id_fkey"
            columns: ["fixing_id"]
            isOneToOne: false
            referencedRelation: "pricing_fixing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hedge_link_hedge_execution_id_fkey"
            columns: ["hedge_execution_id"]
            isOneToOne: false
            referencedRelation: "hedge_execution"
            referencedColumns: ["id"]
          },
        ]
      }
      hedge_request: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bl_order_id: number | null
          broker_preference: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          direction: Database["public"]["Enums"]["hedge_direction"]
          estimated_qp_month: string | null
          formula_percent: number | null
          hedge_metal: Database["public"]["Enums"]["hedge_metal_type"] | null
          id: string
          instrument_type:
            | Database["public"]["Enums"]["hedge_instrument_type"]
            | null
          linked_execution_id: string | null
          metal: Database["public"]["Enums"]["commodity_type_enum"]
          notes: string | null
          order_id: string | null
          pricing_type: string | null
          quantity_mt: number
          reason: Database["public"]["Enums"]["hedge_request_reason"] | null
          reference: Database["public"]["Enums"]["reference_type"]
          requested_by: string | null
          source: Database["public"]["Enums"]["hedge_request_source"]
          status: Database["public"]["Enums"]["hedge_request_status"]
          target_price: number | null
          target_price_currency: string | null
          ticket_id: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bl_order_id?: number | null
          broker_preference?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          direction: Database["public"]["Enums"]["hedge_direction"]
          estimated_qp_month?: string | null
          formula_percent?: number | null
          hedge_metal?: Database["public"]["Enums"]["hedge_metal_type"] | null
          id?: string
          instrument_type?:
            | Database["public"]["Enums"]["hedge_instrument_type"]
            | null
          linked_execution_id?: string | null
          metal: Database["public"]["Enums"]["commodity_type_enum"]
          notes?: string | null
          order_id?: string | null
          pricing_type?: string | null
          quantity_mt: number
          reason?: Database["public"]["Enums"]["hedge_request_reason"] | null
          reference?: Database["public"]["Enums"]["reference_type"]
          requested_by?: string | null
          source?: Database["public"]["Enums"]["hedge_request_source"]
          status?: Database["public"]["Enums"]["hedge_request_status"]
          target_price?: number | null
          target_price_currency?: string | null
          ticket_id?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bl_order_id?: number | null
          broker_preference?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          direction?: Database["public"]["Enums"]["hedge_direction"]
          estimated_qp_month?: string | null
          formula_percent?: number | null
          hedge_metal?: Database["public"]["Enums"]["hedge_metal_type"] | null
          id?: string
          instrument_type?:
            | Database["public"]["Enums"]["hedge_instrument_type"]
            | null
          linked_execution_id?: string | null
          metal?: Database["public"]["Enums"]["commodity_type_enum"]
          notes?: string | null
          order_id?: string | null
          pricing_type?: string | null
          quantity_mt?: number
          reason?: Database["public"]["Enums"]["hedge_request_reason"] | null
          reference?: Database["public"]["Enums"]["reference_type"]
          requested_by?: string | null
          source?: Database["public"]["Enums"]["hedge_request_source"]
          status?: Database["public"]["Enums"]["hedge_request_status"]
          target_price?: number | null
          target_price_currency?: string | null
          ticket_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hedge_request_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hedge_request_bl_order_id_fkey"
            columns: ["bl_order_id"]
            isOneToOne: false
            referencedRelation: "bl_order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hedge_request_linked_execution_id_fkey"
            columns: ["linked_execution_id"]
            isOneToOne: false
            referencedRelation: "hedge_execution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hedge_request_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hedge_request_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket"
            referencedColumns: ["id"]
          },
        ]
      }
      hedge_roll: {
        Row: {
          close_execution_id: string
          created_at: string
          id: string
          notes: string | null
          open_execution_id: string
          reason: string | null
          roll_cost: number | null
          roll_cost_currency: string | null
          roll_date: string
          rolled_qty_mt: number | null
        }
        Insert: {
          close_execution_id: string
          created_at?: string
          id?: string
          notes?: string | null
          open_execution_id: string
          reason?: string | null
          roll_cost?: number | null
          roll_cost_currency?: string | null
          roll_date: string
          rolled_qty_mt?: number | null
        }
        Update: {
          close_execution_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          open_execution_id?: string
          reason?: string | null
          roll_cost?: number | null
          roll_cost_currency?: string | null
          roll_date?: string
          rolled_qty_mt?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hedge_roll_close_execution_id_fkey"
            columns: ["close_execution_id"]
            isOneToOne: false
            referencedRelation: "hedge_execution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hedge_roll_open_execution_id_fkey"
            columns: ["open_execution_id"]
            isOneToOne: false
            referencedRelation: "hedge_execution"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_match: {
        Row: {
          allocated_quantity_mt: number | null
          buy_ticket_id: number | null
          id: number
          match_date: string | null
          order_id: string | null
          sell_ticket_id: number | null
          unallocated_quantity_mt: number | null
        }
        Insert: {
          allocated_quantity_mt?: number | null
          buy_ticket_id?: number | null
          id?: number
          match_date?: string | null
          order_id?: string | null
          sell_ticket_id?: number | null
          unallocated_quantity_mt?: number | null
        }
        Update: {
          allocated_quantity_mt?: number | null
          buy_ticket_id?: number | null
          id?: number
          match_date?: string | null
          order_id?: string | null
          sell_ticket_id?: number | null
          unallocated_quantity_mt?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_match_buy_ticket_id_fkey"
            columns: ["buy_ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_match_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_match_sell_ticket_id_fkey"
            columns: ["sell_ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice: {
        Row: {
          actual_due_date: string | null
          adjusts_invoice_id: number | null
          "amount_%": number | null
          amount_qt_mt: number | null
          applied_downpayment_amount: number | null
          bl_order_name: string | null
          company_name: string | null
          created_at: string
          currency: string | null
          delete_reason: string | null
          deleted_at: string | null
          file_url: string | null
          id: number
          invoice_direction: string | null
          invoice_number: string | null
          invoice_type: string | null
          issue_date: string | null
          note_reason: string | null
          order_id: string | null
          original_due_date: string | null
          status: string | null
          total_amount: number | null
        }
        Insert: {
          actual_due_date?: string | null
          adjusts_invoice_id?: number | null
          "amount_%"?: number | null
          amount_qt_mt?: number | null
          applied_downpayment_amount?: number | null
          bl_order_name?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          file_url?: string | null
          id?: number
          invoice_direction?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          issue_date?: string | null
          note_reason?: string | null
          order_id?: string | null
          original_due_date?: string | null
          status?: string | null
          total_amount?: number | null
        }
        Update: {
          actual_due_date?: string | null
          adjusts_invoice_id?: number | null
          "amount_%"?: number | null
          amount_qt_mt?: number | null
          applied_downpayment_amount?: number | null
          bl_order_name?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          file_url?: string | null
          id?: number
          invoice_direction?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          issue_date?: string | null
          note_reason?: string | null
          order_id?: string | null
          original_due_date?: string | null
          status?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_adjusts_invoice_id_fkey"
            columns: ["adjusts_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_comments: {
        Row: {
          comment_text: string
          created_at: string
          created_by: string
          id: string
          invoice_id: number
        }
        Insert: {
          comment_text: string
          created_at?: string
          created_by: string
          id?: string
          invoice_id: number
        }
        Update: {
          comment_text?: string
          created_at?: string
          created_by?: string
          id?: string
          invoice_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_comments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice"
            referencedColumns: ["id"]
          },
        ]
      }
      order: {
        Row: {
          allocated_quantity_mt: number | null
          buy_downpayment_amount: number | null
          buy_downpayment_due_date: string | null
          buy_downpayment_invoice: Json | null
          buy_downpayment_paid_date: string | null
          buy_price: number | null
          buyer: string | null
          commodity_type:
            | Database["public"]["Enums"]["commodity_type_enum"]
            | null
          created_at: string | null
          delete_reason: string | null
          deleted_at: string | null
          id: string
          isri_grade: Database["public"]["Enums"]["isri_grade_enum"] | null
          loading_date: string | null
          margin: number | null
          metal_form: Database["public"]["Enums"]["metal_form_enum"] | null
          partial_shipment_allowed: boolean | null
          product_details: string | null
          purchase_order_url: string | null
          sales_order_sign_date: string | null
          sales_order_url: string | null
          sell_downmapayment_invoice: Json | null
          sell_downpayment_amount: number | null
          sell_downpayment_due_date: string | null
          sell_downpayment_paid_date: string | null
          sell_price: number | null
          seller: string | null
          ship_from: string | null
          ship_to: string | null
          signed_purchase_order_url: string | null
          signed_sales_order_url: string | null
          status: string | null
          transaction_type: string | null
        }
        Insert: {
          allocated_quantity_mt?: number | null
          buy_downpayment_amount?: number | null
          buy_downpayment_due_date?: string | null
          buy_downpayment_invoice?: Json | null
          buy_downpayment_paid_date?: string | null
          buy_price?: number | null
          buyer?: string | null
          commodity_type?:
            | Database["public"]["Enums"]["commodity_type_enum"]
            | null
          created_at?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          id: string
          isri_grade?: Database["public"]["Enums"]["isri_grade_enum"] | null
          loading_date?: string | null
          margin?: number | null
          metal_form?: Database["public"]["Enums"]["metal_form_enum"] | null
          partial_shipment_allowed?: boolean | null
          product_details?: string | null
          purchase_order_url?: string | null
          sales_order_sign_date?: string | null
          sales_order_url?: string | null
          sell_downmapayment_invoice?: Json | null
          sell_downpayment_amount?: number | null
          sell_downpayment_due_date?: string | null
          sell_downpayment_paid_date?: string | null
          sell_price?: number | null
          seller?: string | null
          ship_from?: string | null
          ship_to?: string | null
          signed_purchase_order_url?: string | null
          signed_sales_order_url?: string | null
          status?: string | null
          transaction_type?: string | null
        }
        Update: {
          allocated_quantity_mt?: number | null
          buy_downpayment_amount?: number | null
          buy_downpayment_due_date?: string | null
          buy_downpayment_invoice?: Json | null
          buy_downpayment_paid_date?: string | null
          buy_price?: number | null
          buyer?: string | null
          commodity_type?:
            | Database["public"]["Enums"]["commodity_type_enum"]
            | null
          created_at?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          id?: string
          isri_grade?: Database["public"]["Enums"]["isri_grade_enum"] | null
          loading_date?: string | null
          margin?: number | null
          metal_form?: Database["public"]["Enums"]["metal_form_enum"] | null
          partial_shipment_allowed?: boolean | null
          product_details?: string | null
          purchase_order_url?: string | null
          sales_order_sign_date?: string | null
          sales_order_url?: string | null
          sell_downmapayment_invoice?: Json | null
          sell_downpayment_amount?: number | null
          sell_downpayment_due_date?: string | null
          sell_downpayment_paid_date?: string | null
          sell_price?: number | null
          seller?: string | null
          ship_from?: string | null
          ship_to?: string | null
          signed_purchase_order_url?: string | null
          signed_sales_order_url?: string | null
          status?: string | null
          transaction_type?: string | null
        }
        Relationships: []
      }
      payment: {
        Row: {
          bank_reference: string | null
          company_name: string | null
          created_at: string
          currency: string | null
          delete_reason: string | null
          deleted_at: string | null
          id: number
          invoice_id: number | null
          paid_date: string | null
          payment_direction: string | null
          payment_type: Database["public"]["Enums"]["payment_type_enum"] | null
          reference_note: string | null
          total_amount_paid: number | null
        }
        Insert: {
          bank_reference?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          id?: number
          invoice_id?: number | null
          paid_date?: string | null
          payment_direction?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type_enum"] | null
          reference_note?: string | null
          total_amount_paid?: number | null
        }
        Update: {
          bank_reference?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          id?: number
          invoice_id?: number | null
          paid_date?: string | null
          payment_direction?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type_enum"] | null
          reference_note?: string | null
          total_amount_paid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_shipment: {
        Row: {
          created_at: string
          id: number
          order_id: number | null
          quantity_at_shipment_level: number | null
          shipment_number: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          order_id?: number | null
          quantity_at_shipment_level?: number | null
          shipment_number?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          order_id?: number | null
          quantity_at_shipment_level?: number | null
          shipment_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "planned_shipment_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ticket"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_fixing: {
        Row: {
          bl_order_id: number | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          final_price: number | null
          final_price_currency: string | null
          fixed_at: string | null
          id: string
          level: string | null
          metal: Database["public"]["Enums"]["commodity_type_enum"]
          notes: string | null
          order_id: string | null
          premium_discount: number | null
          premium_discount_currency: string | null
          qp_end: string | null
          qp_start: string | null
          quantity_mt: number | null
          reference: Database["public"]["Enums"]["reference_type"]
          ticket_id: number | null
          updated_at: string
        }
        Insert: {
          bl_order_id?: number | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          final_price?: number | null
          final_price_currency?: string | null
          fixed_at?: string | null
          id?: string
          level?: string | null
          metal: Database["public"]["Enums"]["commodity_type_enum"]
          notes?: string | null
          order_id?: string | null
          premium_discount?: number | null
          premium_discount_currency?: string | null
          qp_end?: string | null
          qp_start?: string | null
          quantity_mt?: number | null
          reference?: Database["public"]["Enums"]["reference_type"]
          ticket_id?: number | null
          updated_at?: string
        }
        Update: {
          bl_order_id?: number | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          final_price?: number | null
          final_price_currency?: string | null
          fixed_at?: string | null
          id?: string
          level?: string | null
          metal?: Database["public"]["Enums"]["commodity_type_enum"]
          notes?: string | null
          order_id?: string | null
          premium_discount?: number | null
          premium_discount_currency?: string | null
          qp_end?: string | null
          qp_start?: string | null
          quantity_mt?: number | null
          reference?: Database["public"]["Enums"]["reference_type"]
          ticket_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_fixing_bl_order_id_fkey"
            columns: ["bl_order_id"]
            isOneToOne: false
            referencedRelation: "bl_order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_fixing_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_fixing_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      revenue: {
        Row: {
          allocated_downpayment_amount: number
          bl_order_id: number | null
          bl_order_name: string | null
          created_at: string
          final_invoice_amount: number
          id: string
          recognition_date: string
          total_revenue: number
          updated_at: string
        }
        Insert: {
          allocated_downpayment_amount?: number
          bl_order_id?: number | null
          bl_order_name?: string | null
          created_at?: string
          final_invoice_amount?: number
          id?: string
          recognition_date: string
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          allocated_downpayment_amount?: number
          bl_order_id?: number | null
          bl_order_name?: string | null
          created_at?: string
          final_invoice_amount?: number
          id?: string
          recognition_date?: string
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_bl_order_id_fkey"
            columns: ["bl_order_id"]
            isOneToOne: false
            referencedRelation: "bl_order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_bl_order_name_fkey"
            columns: ["bl_order_name"]
            isOneToOne: false
            referencedRelation: "bl_order"
            referencedColumns: ["bl_order_name"]
          },
        ]
      }
      shipping_location: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      ticket: {
        Row: {
          basis: string | null
          client_name: string | null
          commodity_type:
            | Database["public"]["Enums"]["commodity_type_enum"]
            | null
          company_id: number | null
          country_of_origin:
            | Database["public"]["Enums"]["country_of_origin_enum"]
            | null
          created_at: string | null
          currency: Database["public"]["Enums"]["currency_enum"] | null
          delete_reason: string | null
          deleted_at: string | null
          down_payment_amount_percent: number | null
          downpayment_trigger: string | null
          fixation_custom: string | null
          fixation_method:
            | Database["public"]["Enums"]["fixation_method_enum"]
            | null
          freight_actual_total: number | null
          freight_estimate_total: number | null
          has_multimodal_freight: boolean | null
          id: number
          incoterms: Database["public"]["Enums"]["incoterms_enum"] | null
          isri_grade: Database["public"]["Enums"]["isri_grade_enum"] | null
          lme_action_needed: boolean | null
          lme_price: number | null
          loading_date: string | null
          manual_override: boolean | null
          metal_form: Database["public"]["Enums"]["metal_form_enum"] | null
          notes: string | null
          payable_percent: number | null
          payment_offset_days: number | null
          payment_terms: string | null
          payment_trigger_event:
            | Database["public"]["Enums"]["payment_trigger_event_enum"]
            | null
          payment_trigger_timing:
            | Database["public"]["Enums"]["payment_trigger_timing_enum"]
            | null
          planned_shipments: number | null
          premium_discount: number | null
          price: number | null
          price_fixation_date: string | null
          pricing_option: string | null
          pricing_type: Database["public"]["Enums"]["pricing_type_enum"] | null
          product_details: string | null
          product_id: number | null
          qp_end: string | null
          qp_end_anchor: string | null
          qp_end_offset_days: number | null
          qp_start: string | null
          qp_start_anchor: string | null
          qp_start_offset_days: number | null
          quantity: number | null
          reference_price_source: string | null
          ship_from: string | null
          ship_to: string | null
          shipment_window: string | null
          signed_price: number | null
          signed_volume: number | null
          status: Database["public"]["Enums"]["ticket_status"]
          trader_id: number | null
          transaction_type: string | null
          transport_method:
            | Database["public"]["Enums"]["transport_method_enum"]
            | null
          type: Database["public"]["Enums"]["trade_type"]
        }
        Insert: {
          basis?: string | null
          client_name?: string | null
          commodity_type?:
            | Database["public"]["Enums"]["commodity_type_enum"]
            | null
          company_id?: number | null
          country_of_origin?:
            | Database["public"]["Enums"]["country_of_origin_enum"]
            | null
          created_at?: string | null
          currency?: Database["public"]["Enums"]["currency_enum"] | null
          delete_reason?: string | null
          deleted_at?: string | null
          down_payment_amount_percent?: number | null
          downpayment_trigger?: string | null
          fixation_custom?: string | null
          fixation_method?:
            | Database["public"]["Enums"]["fixation_method_enum"]
            | null
          freight_actual_total?: number | null
          freight_estimate_total?: number | null
          has_multimodal_freight?: boolean | null
          id?: number
          incoterms?: Database["public"]["Enums"]["incoterms_enum"] | null
          isri_grade?: Database["public"]["Enums"]["isri_grade_enum"] | null
          lme_action_needed?: boolean | null
          lme_price?: number | null
          loading_date?: string | null
          manual_override?: boolean | null
          metal_form?: Database["public"]["Enums"]["metal_form_enum"] | null
          notes?: string | null
          payable_percent?: number | null
          payment_offset_days?: number | null
          payment_terms?: string | null
          payment_trigger_event?:
            | Database["public"]["Enums"]["payment_trigger_event_enum"]
            | null
          payment_trigger_timing?:
            | Database["public"]["Enums"]["payment_trigger_timing_enum"]
            | null
          planned_shipments?: number | null
          premium_discount?: number | null
          price?: number | null
          price_fixation_date?: string | null
          pricing_option?: string | null
          pricing_type?: Database["public"]["Enums"]["pricing_type_enum"] | null
          product_details?: string | null
          product_id?: number | null
          qp_end?: string | null
          qp_end_anchor?: string | null
          qp_end_offset_days?: number | null
          qp_start?: string | null
          qp_start_anchor?: string | null
          qp_start_offset_days?: number | null
          quantity?: number | null
          reference_price_source?: string | null
          ship_from?: string | null
          ship_to?: string | null
          shipment_window?: string | null
          signed_price?: number | null
          signed_volume?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          trader_id?: number | null
          transaction_type?: string | null
          transport_method?:
            | Database["public"]["Enums"]["transport_method_enum"]
            | null
          type: Database["public"]["Enums"]["trade_type"]
        }
        Update: {
          basis?: string | null
          client_name?: string | null
          commodity_type?:
            | Database["public"]["Enums"]["commodity_type_enum"]
            | null
          company_id?: number | null
          country_of_origin?:
            | Database["public"]["Enums"]["country_of_origin_enum"]
            | null
          created_at?: string | null
          currency?: Database["public"]["Enums"]["currency_enum"] | null
          delete_reason?: string | null
          deleted_at?: string | null
          down_payment_amount_percent?: number | null
          downpayment_trigger?: string | null
          fixation_custom?: string | null
          fixation_method?:
            | Database["public"]["Enums"]["fixation_method_enum"]
            | null
          freight_actual_total?: number | null
          freight_estimate_total?: number | null
          has_multimodal_freight?: boolean | null
          id?: number
          incoterms?: Database["public"]["Enums"]["incoterms_enum"] | null
          isri_grade?: Database["public"]["Enums"]["isri_grade_enum"] | null
          lme_action_needed?: boolean | null
          lme_price?: number | null
          loading_date?: string | null
          manual_override?: boolean | null
          metal_form?: Database["public"]["Enums"]["metal_form_enum"] | null
          notes?: string | null
          payable_percent?: number | null
          payment_offset_days?: number | null
          payment_terms?: string | null
          payment_trigger_event?:
            | Database["public"]["Enums"]["payment_trigger_event_enum"]
            | null
          payment_trigger_timing?:
            | Database["public"]["Enums"]["payment_trigger_timing_enum"]
            | null
          planned_shipments?: number | null
          premium_discount?: number | null
          price?: number | null
          price_fixation_date?: string | null
          pricing_option?: string | null
          pricing_type?: Database["public"]["Enums"]["pricing_type_enum"] | null
          product_details?: string | null
          product_id?: number | null
          qp_end?: string | null
          qp_end_anchor?: string | null
          qp_end_offset_days?: number | null
          qp_start?: string | null
          qp_start_anchor?: string | null
          qp_start_offset_days?: number | null
          quantity?: number | null
          reference_price_source?: string | null
          ship_from?: string | null
          ship_to?: string | null
          shipment_window?: string | null
          signed_price?: number | null
          signed_volume?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          trader_id?: number | null
          transaction_type?: string | null
          transport_method?:
            | Database["public"]["Enums"]["transport_method_enum"]
            | null
          type?: Database["public"]["Enums"]["trade_type"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_ticket_ship_from"
            columns: ["ship_from"]
            isOneToOne: false
            referencedRelation: "shipping_location"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "fk_ticket_ship_to"
            columns: ["ship_to"]
            isOneToOne: false
            referencedRelation: "shipping_location"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "fk_ticket_trader_id"
            columns: ["trader_id"]
            isOneToOne: false
            referencedRelation: "traders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_freight_costs: {
        Row: {
          cost_amount: number
          cost_currency: string
          cost_per_mt: number | null
          created_at: string
          created_by: string | null
          effective_date: string
          freight_leg_id: number
          id: number
          is_current: boolean
          notes: string | null
          reference_doc_id: string | null
          source: Database["public"]["Enums"]["freight_cost_source_enum"]
          stage: Database["public"]["Enums"]["freight_cost_stage_enum"]
        }
        Insert: {
          cost_amount: number
          cost_currency: string
          cost_per_mt?: number | null
          created_at?: string
          created_by?: string | null
          effective_date?: string
          freight_leg_id: number
          id?: number
          is_current?: boolean
          notes?: string | null
          reference_doc_id?: string | null
          source?: Database["public"]["Enums"]["freight_cost_source_enum"]
          stage?: Database["public"]["Enums"]["freight_cost_stage_enum"]
        }
        Update: {
          cost_amount?: number
          cost_currency?: string
          cost_per_mt?: number | null
          created_at?: string
          created_by?: string | null
          effective_date?: string
          freight_leg_id?: number
          id?: number
          is_current?: boolean
          notes?: string | null
          reference_doc_id?: string | null
          source?: Database["public"]["Enums"]["freight_cost_source_enum"]
          stage?: Database["public"]["Enums"]["freight_cost_stage_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "ticket_freight_costs_freight_leg_id_fkey"
            columns: ["freight_leg_id"]
            isOneToOne: false
            referencedRelation: "ticket_freight_legs"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_freight_legs: {
        Row: {
          carrier_name: string | null
          created_at: string
          created_by: string | null
          freight_type: Database["public"]["Enums"]["freight_type_enum"]
          from_location: string | null
          id: number
          incoterm_leg: string | null
          leg_index: number
          ticket_id: number
          to_location: string | null
        }
        Insert: {
          carrier_name?: string | null
          created_at?: string
          created_by?: string | null
          freight_type: Database["public"]["Enums"]["freight_type_enum"]
          from_location?: string | null
          id?: number
          incoterm_leg?: string | null
          leg_index: number
          ticket_id: number
          to_location?: string | null
        }
        Update: {
          carrier_name?: string | null
          created_at?: string
          created_by?: string | null
          freight_type?: Database["public"]["Enums"]["freight_type_enum"]
          from_location?: string | null
          id?: number
          incoterm_leg?: string | null
          leg_index?: number
          ticket_id?: number
          to_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_freight_legs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_photos: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          ticket_id: number | null
          uploaded_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          ticket_id?: number | null
          uploaded_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          ticket_id?: number | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_photos_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket"
            referencedColumns: ["id"]
          },
        ]
      }
      traders: {
        Row: {
          created_at: string | null
          email: string | null
          id: number
          name: string
          rank: number
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: number
          name: string
          rank?: number
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: number
          name?: string
          rank?: number
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
      evaluate_ticket_approval_rules: {
        Args: {
          p_company_id: number
          p_lme_action_needed: string
          p_payment_trigger_event: string
          p_payment_trigger_timing: string
          p_pricing_type: string
          p_ticket_id: number
          p_transaction_type: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "trader" | "hedging" | "cfo" | "management"
      approval_action: "Approve" | "Reject" | "Request Changes"
      approver_role: "Hedging" | "CFO" | "Management" | "Operations"
      claim_status_enum:
        | "draft"
        | "preliminary_submitted"
        | "formal_submitted"
        | "under_supplier_review"
        | "accepted"
        | "rejected"
        | "counter_offer"
        | "settled"
        | "closed"
        | "submitted"
      claim_type_enum:
        | "quality"
        | "contamination"
        | "moisture"
        | "weight_loss"
        | "other"
        | "loss_of_metal"
        | "dust"
      commodity_type_enum:
        | "Aluminium"
        | "Mixed metals"
        | "Zinc"
        | "Magnesium"
        | "Lead"
        | "Nickel/stainless/hi-temp"
        | "Copper"
        | "Brass"
        | "Steel"
        | "Iron"
      country_of_origin_enum:
        | "Afghanistan"
        | "Albania"
        | "Algeria"
        | "Andorra"
        | "Angola"
        | "Antigua and Barbuda"
        | "Argentina"
        | "Armenia"
        | "Australia"
        | "Austria"
        | "Azerbaijan"
        | "Bahamas"
        | "Bahrain"
        | "Bangladesh"
        | "Barbados"
        | "Belarus"
        | "Belgium"
        | "Belize"
        | "Benin"
        | "Bhutan"
        | "Bolivia"
        | "Bosnia and Herzegovina"
        | "Botswana"
        | "Brazil"
        | "Brunei"
        | "Bulgaria"
        | "Burkina Faso"
        | "Burundi"
        | "Cabo Verde"
        | "Cambodia"
        | "Cameroon"
        | "Canada"
        | "Central African Republic"
        | "Chad"
        | "Chile"
        | "China"
        | "Colombia"
        | "Comoros"
        | "Congo, Democratic Republic of the"
        | "Congo, Republic of the"
        | "Costa Rica"
        | "Cote d'Ivoire"
        | "Croatia"
        | "Cuba"
        | "Cyprus"
        | "Czech Republic"
        | "Denmark"
        | "Djibouti"
        | "Dominica"
        | "Dominican Republic"
        | "Ecuador"
        | "Egypt"
        | "El Salvador"
        | "Equatorial Guinea"
        | "Eritrea"
        | "Estonia"
        | "Eswatini"
        | "Ethiopia"
        | "Fiji"
        | "Finland"
        | "France"
        | "Gabon"
        | "Gambia"
        | "Georgia"
        | "Germany"
        | "Ghana"
        | "Greece"
        | "Grenada"
        | "Guatemala"
        | "Guinea"
        | "Guinea-Bissau"
        | "Guyana"
        | "Haiti"
        | "Honduras"
        | "Hungary"
        | "Iceland"
        | "India"
        | "Indonesia"
        | "Iran"
        | "Iraq"
        | "Ireland"
        | "Israel"
        | "Italy"
        | "Jamaica"
        | "Japan"
        | "Jordan"
        | "Kazakhstan"
        | "Kenya"
        | "Kiribati"
        | "Korea, North"
        | "Korea, South"
        | "Kosovo"
        | "Kuwait"
        | "Kyrgyzstan"
        | "Laos"
        | "Latvia"
        | "Lebanon"
        | "Lesotho"
        | "Liberia"
        | "Libya"
        | "Liechtenstein"
        | "Lithuania"
        | "Luxembourg"
        | "Madagascar"
        | "Malawi"
        | "Malaysia"
        | "Maldives"
        | "Mali"
        | "Malta"
        | "Marshall Islands"
        | "Mauritania"
        | "Mauritius"
        | "Mexico"
        | "Micronesia"
        | "Moldova"
        | "Monaco"
        | "Mongolia"
        | "Montenegro"
        | "Morocco"
        | "Mozambique"
        | "Myanmar"
        | "Namibia"
        | "Nauru"
        | "Nepal"
        | "Netherlands"
        | "New Zealand"
        | "Nicaragua"
        | "Niger"
        | "Nigeria"
        | "North Macedonia"
        | "Norway"
        | "Oman"
        | "Pakistan"
        | "Palau"
        | "Panama"
        | "Papua New Guinea"
        | "Paraguay"
        | "Peru"
        | "Philippines"
        | "Poland"
        | "Portugal"
        | "Qatar"
        | "Romania"
        | "Russia"
        | "Rwanda"
        | "Saint Kitts and Nevis"
        | "Saint Lucia"
        | "Saint Vincent and the Grenadines"
        | "Samoa"
        | "San Marino"
        | "Sao Tome and Principe"
        | "Saudi Arabia"
        | "Senegal"
        | "Serbia"
        | "Seychelles"
        | "Sierra Leone"
        | "Singapore"
        | "Slovakia"
        | "Slovenia"
        | "Solomon Islands"
        | "Somalia"
        | "South Africa"
        | "South Sudan"
        | "Spain"
        | "Sri Lanka"
        | "Sudan"
        | "Suriname"
        | "Sweden"
        | "Switzerland"
        | "Syria"
        | "Taiwan"
        | "Tajikistan"
        | "Tanzania"
        | "Thailand"
        | "Timor-Leste"
        | "Togo"
        | "Tonga"
        | "Trinidad and Tobago"
        | "Tunisia"
        | "Turkey"
        | "Turkmenistan"
        | "Tuvalu"
        | "Uganda"
        | "Ukraine"
        | "United Arab Emirates"
        | "United Kingdom"
        | "United States"
        | "Uruguay"
        | "Uzbekistan"
        | "Vanuatu"
        | "Vatican City"
        | "Venezuela"
        | "Vietnam"
        | "Yemen"
        | "Zambia"
        | "Zimbabwe"
      currency_enum:
        | "USD"
        | "EUR"
        | "GBP"
        | "CNY"
        | "JPY"
        | "AUD"
        | "CAD"
        | "CHF"
      fixation_method_enum: "1-day" | "5-day avg" | "Month avg" | "Custom"
      freight_cost_source_enum:
        | "QUOTE"
        | "CARRIER_INVOICE"
        | "MANUAL_ADJUSTMENT"
      freight_cost_stage_enum: "ESTIMATE" | "PROVISIONAL" | "ACTUAL"
      freight_type_enum: "Ship" | "Barge" | "Truck"
      hedge_direction: "Buy" | "Sell"
      hedge_instrument: "Future"
      hedge_instrument_type: "FUTURE" | "OPTION" | "FX"
      hedge_link_level: "Order" | "Bl_order" | "Ticket"
      hedge_metal_type:
        | "COPPER"
        | "ALUMINIUM"
        | "ZINC"
        | "NICKEL"
        | "LEAD"
        | "TIN"
      hedge_request_reason:
        | "PHYSICAL_SALE_PRICING"
        | "UNPRICING"
        | "PRE_LENDING"
        | "PRE_BORROWING"
        | "ROLL"
        | "PRICE_FIX"
      hedge_request_source: "Manual" | "Auto_QP" | "Price_Fix" | "Roll"
      hedge_request_status:
        | "Draft"
        | "Pending Approval"
        | "Approved"
        | "Rejected"
        | "Cancelled"
        | "Executed"
      incoterms_enum:
        | "CFR"
        | "CIF"
        | "CIP"
        | "CPT"
        | "DAP"
        | "DDP"
        | "DPU"
        | "EWX"
        | "FAS"
        | "FCA"
        | "FOB"
      isri_grade_enum:
        | "Not applicable"
        | "Aroma"
        | "Barley"
        | "Berry"
        | "Berry candy"
        | "Birch"
        | "Birch cliff"
        | "Burly"
        | "Candy"
        | "Cliff"
        | "Clove"
        | "Cobra"
        | "Cocoa"
        | "Dandy"
        | "Darth"
        | "Daunt"
        | "Decoy"
        | "Delta"
        | "Depth"
        | "Dream"
        | "Drink"
        | "Droid"
        | "Drove"
        | "Druid"
        | "Ebony"
        | "Ebulent"
        | "Ecstatic"
        | "Eland"
        | "Elder"
        | "Elias"
        | "Elmo"
        | "Enerv"
        | "Engel"
        | "Erin"
        | "Fence"
        | "Ferry"
        | "Grape"
        | "Hitch"
        | "Honey"
        | "House"
        | "Ideal"
        | "Indian"
        | "Ingots"
        | "Ivory"
        | "Junto"
        | "Label"
        | "Lace"
        | "Lady"
        | "Lake"
        | "Lamb"
        | "Lark"
        | "Lemon"
        | "Lemur"
        | "Maize"
        | "Major"
        | "Malar"
        | "Malic"
        | "Melon"
        | "Naggy"
        | "Nascent"
        | "Niche"
        | "Niece"
        | "Night"
        | "Noble"
        | "Nomad"
        | "Ocean"
        | "Pales"
        | "Pallu"
        | "Palms"
        | "Parch"
        | "Pekoe"
        | "Racks"
        | "Radio"
        | "Rains"
        | "Rakes"
        | "Ranch"
        | "Ranks"
        | "Raves"
        | "Reels"
        | "Relay"
        | "Rents"
        | "Rink"
        | "Rono"
        | "Roper"
        | "Ropes"
        | "Roses"
        | "Sabot"
        | "Saint"
        | "Saves"
        | "Scabs"
        | "Scoot"
        | "Scope"
        | "Score"
        | "Screen"
        | "Scribe"
        | "Scroll"
        | "Scrub"
        | "Scull"
        | "Seal"
        | "Seam"
        | "Sheema"
        | "Shelf"
        | "Shelmo"
        | "Small_elmo"
        | "Tablet"
        | "Tabloid"
        | "Taboo"
        | "Taint tabor"
        | "Take"
        | "Talc"
        | "Talcred"
        | "Taldack"
        | "Taldon"
        | "Taldork"
        | "Tale"
        | "Talk"
        | "Tall"
        | "Tally"
        | "Talon"
        | "Tank"
        | "Tann"
        | "Tarry a"
        | "Tarry b"
        | "Tarry c"
        | "Tassel"
        | "Taste"
        | "Tata"
        | "Tease"
        | "Telic"
        | "Tense"
        | "Tepid"
        | "Terse"
        | "Tesla"
        | "Tetra"
        | "Thigh"
        | "Thirl"
        | "Throb"
        | "Thron"
        | "Tooth"
        | "Toto"
        | "Tough"
        | "Tread"
        | "Trill"
        | "Troma"
        | "Trump"
        | "Tutu"
        | "Twang"
        | "Tweak"
        | "Twire"
        | "Twirl"
        | "Twist"
        | "Twitch"
        | "Ultra"
        | "Vader"
        | "Vaunt"
        | "Wafer"
        | "Walnut"
        | "Wine"
        | "Wood"
        | "World"
        | "Zebra"
        | "Zeppelin"
        | "Zeyda"
        | "Zorba"
        | "Zurik"
      kyb_status: "Approved" | "Rejected" | "Needs Review"
      metal_form_enum:
        | "Baled"
        | "Loose"
        | "Not specified"
        | "Jumbo bag"
        | "Ingots"
        | "Cathodes"
        | "Sows"
        | "T bars"
      payment_trigger_event_enum:
        | "ATA"
        | "BL confirmed"
        | "BL issuance"
        | "BL release"
        | "Booking"
        | "Customs Clearance"
        | "DP"
        | "ETA"
        | "ETD"
        | "Fixation"
        | "Inspection"
        | "Invoice"
        | "Loading"
        | "Other - custom"
        | "Order Signed Date"
      payment_trigger_timing_enum: "Before" | "After"
      payment_type_enum:
        | "Downpayment"
        | "Provisional"
        | "Final"
        | "Credit Note"
        | "Debit Note"
      pricing_type_enum: "Fixed" | "Formula" | "Index"
      reference_type: "LME_CASH" | "LME_3M" | "COMEX" | "SHFE" | "OTHER"
      supplier_response_enum:
        | "pending"
        | "accepted"
        | "rejected"
        | "counter_offer"
      ticket_status: "Draft" | "Pending Approval" | "Approved" | "Rejected"
      trade_type: "Buy" | "Sell"
      trader_relationship_owner:
        | "Harry"
        | "Eric"
        | "Veli"
        | "Anton"
        | "Armin"
        | "Christian"
        | "Khsitiz"
      trader_relationship_owner_enum:
        | "Veli"
        | "Harry"
        | "Andy"
        | "Anton"
        | "Armin"
        | "Christian"
        | "Kshitiz"
        | "Eric"
      transport_method_enum:
        | "Ocean"
        | "Truck"
        | "Rail"
        | "Barge"
        | "Multi modal"
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
      app_role: ["admin", "trader", "hedging", "cfo", "management"],
      approval_action: ["Approve", "Reject", "Request Changes"],
      approver_role: ["Hedging", "CFO", "Management", "Operations"],
      claim_status_enum: [
        "draft",
        "preliminary_submitted",
        "formal_submitted",
        "under_supplier_review",
        "accepted",
        "rejected",
        "counter_offer",
        "settled",
        "closed",
        "submitted",
      ],
      claim_type_enum: [
        "quality",
        "contamination",
        "moisture",
        "weight_loss",
        "other",
        "loss_of_metal",
        "dust",
      ],
      commodity_type_enum: [
        "Aluminium",
        "Mixed metals",
        "Zinc",
        "Magnesium",
        "Lead",
        "Nickel/stainless/hi-temp",
        "Copper",
        "Brass",
        "Steel",
        "Iron",
      ],
      country_of_origin_enum: [
        "Afghanistan",
        "Albania",
        "Algeria",
        "Andorra",
        "Angola",
        "Antigua and Barbuda",
        "Argentina",
        "Armenia",
        "Australia",
        "Austria",
        "Azerbaijan",
        "Bahamas",
        "Bahrain",
        "Bangladesh",
        "Barbados",
        "Belarus",
        "Belgium",
        "Belize",
        "Benin",
        "Bhutan",
        "Bolivia",
        "Bosnia and Herzegovina",
        "Botswana",
        "Brazil",
        "Brunei",
        "Bulgaria",
        "Burkina Faso",
        "Burundi",
        "Cabo Verde",
        "Cambodia",
        "Cameroon",
        "Canada",
        "Central African Republic",
        "Chad",
        "Chile",
        "China",
        "Colombia",
        "Comoros",
        "Congo, Democratic Republic of the",
        "Congo, Republic of the",
        "Costa Rica",
        "Cote d'Ivoire",
        "Croatia",
        "Cuba",
        "Cyprus",
        "Czech Republic",
        "Denmark",
        "Djibouti",
        "Dominica",
        "Dominican Republic",
        "Ecuador",
        "Egypt",
        "El Salvador",
        "Equatorial Guinea",
        "Eritrea",
        "Estonia",
        "Eswatini",
        "Ethiopia",
        "Fiji",
        "Finland",
        "France",
        "Gabon",
        "Gambia",
        "Georgia",
        "Germany",
        "Ghana",
        "Greece",
        "Grenada",
        "Guatemala",
        "Guinea",
        "Guinea-Bissau",
        "Guyana",
        "Haiti",
        "Honduras",
        "Hungary",
        "Iceland",
        "India",
        "Indonesia",
        "Iran",
        "Iraq",
        "Ireland",
        "Israel",
        "Italy",
        "Jamaica",
        "Japan",
        "Jordan",
        "Kazakhstan",
        "Kenya",
        "Kiribati",
        "Korea, North",
        "Korea, South",
        "Kosovo",
        "Kuwait",
        "Kyrgyzstan",
        "Laos",
        "Latvia",
        "Lebanon",
        "Lesotho",
        "Liberia",
        "Libya",
        "Liechtenstein",
        "Lithuania",
        "Luxembourg",
        "Madagascar",
        "Malawi",
        "Malaysia",
        "Maldives",
        "Mali",
        "Malta",
        "Marshall Islands",
        "Mauritania",
        "Mauritius",
        "Mexico",
        "Micronesia",
        "Moldova",
        "Monaco",
        "Mongolia",
        "Montenegro",
        "Morocco",
        "Mozambique",
        "Myanmar",
        "Namibia",
        "Nauru",
        "Nepal",
        "Netherlands",
        "New Zealand",
        "Nicaragua",
        "Niger",
        "Nigeria",
        "North Macedonia",
        "Norway",
        "Oman",
        "Pakistan",
        "Palau",
        "Panama",
        "Papua New Guinea",
        "Paraguay",
        "Peru",
        "Philippines",
        "Poland",
        "Portugal",
        "Qatar",
        "Romania",
        "Russia",
        "Rwanda",
        "Saint Kitts and Nevis",
        "Saint Lucia",
        "Saint Vincent and the Grenadines",
        "Samoa",
        "San Marino",
        "Sao Tome and Principe",
        "Saudi Arabia",
        "Senegal",
        "Serbia",
        "Seychelles",
        "Sierra Leone",
        "Singapore",
        "Slovakia",
        "Slovenia",
        "Solomon Islands",
        "Somalia",
        "South Africa",
        "South Sudan",
        "Spain",
        "Sri Lanka",
        "Sudan",
        "Suriname",
        "Sweden",
        "Switzerland",
        "Syria",
        "Taiwan",
        "Tajikistan",
        "Tanzania",
        "Thailand",
        "Timor-Leste",
        "Togo",
        "Tonga",
        "Trinidad and Tobago",
        "Tunisia",
        "Turkey",
        "Turkmenistan",
        "Tuvalu",
        "Uganda",
        "Ukraine",
        "United Arab Emirates",
        "United Kingdom",
        "United States",
        "Uruguay",
        "Uzbekistan",
        "Vanuatu",
        "Vatican City",
        "Venezuela",
        "Vietnam",
        "Yemen",
        "Zambia",
        "Zimbabwe",
      ],
      currency_enum: ["USD", "EUR", "GBP", "CNY", "JPY", "AUD", "CAD", "CHF"],
      fixation_method_enum: ["1-day", "5-day avg", "Month avg", "Custom"],
      freight_cost_source_enum: [
        "QUOTE",
        "CARRIER_INVOICE",
        "MANUAL_ADJUSTMENT",
      ],
      freight_cost_stage_enum: ["ESTIMATE", "PROVISIONAL", "ACTUAL"],
      freight_type_enum: ["Ship", "Barge", "Truck"],
      hedge_direction: ["Buy", "Sell"],
      hedge_instrument: ["Future"],
      hedge_instrument_type: ["FUTURE", "OPTION", "FX"],
      hedge_link_level: ["Order", "Bl_order", "Ticket"],
      hedge_metal_type: [
        "COPPER",
        "ALUMINIUM",
        "ZINC",
        "NICKEL",
        "LEAD",
        "TIN",
      ],
      hedge_request_reason: [
        "PHYSICAL_SALE_PRICING",
        "UNPRICING",
        "PRE_LENDING",
        "PRE_BORROWING",
        "ROLL",
        "PRICE_FIX",
      ],
      hedge_request_source: ["Manual", "Auto_QP", "Price_Fix", "Roll"],
      hedge_request_status: [
        "Draft",
        "Pending Approval",
        "Approved",
        "Rejected",
        "Cancelled",
        "Executed",
      ],
      incoterms_enum: [
        "CFR",
        "CIF",
        "CIP",
        "CPT",
        "DAP",
        "DDP",
        "DPU",
        "EWX",
        "FAS",
        "FCA",
        "FOB",
      ],
      isri_grade_enum: [
        "Not applicable",
        "Aroma",
        "Barley",
        "Berry",
        "Berry candy",
        "Birch",
        "Birch cliff",
        "Burly",
        "Candy",
        "Cliff",
        "Clove",
        "Cobra",
        "Cocoa",
        "Dandy",
        "Darth",
        "Daunt",
        "Decoy",
        "Delta",
        "Depth",
        "Dream",
        "Drink",
        "Droid",
        "Drove",
        "Druid",
        "Ebony",
        "Ebulent",
        "Ecstatic",
        "Eland",
        "Elder",
        "Elias",
        "Elmo",
        "Enerv",
        "Engel",
        "Erin",
        "Fence",
        "Ferry",
        "Grape",
        "Hitch",
        "Honey",
        "House",
        "Ideal",
        "Indian",
        "Ingots",
        "Ivory",
        "Junto",
        "Label",
        "Lace",
        "Lady",
        "Lake",
        "Lamb",
        "Lark",
        "Lemon",
        "Lemur",
        "Maize",
        "Major",
        "Malar",
        "Malic",
        "Melon",
        "Naggy",
        "Nascent",
        "Niche",
        "Niece",
        "Night",
        "Noble",
        "Nomad",
        "Ocean",
        "Pales",
        "Pallu",
        "Palms",
        "Parch",
        "Pekoe",
        "Racks",
        "Radio",
        "Rains",
        "Rakes",
        "Ranch",
        "Ranks",
        "Raves",
        "Reels",
        "Relay",
        "Rents",
        "Rink",
        "Rono",
        "Roper",
        "Ropes",
        "Roses",
        "Sabot",
        "Saint",
        "Saves",
        "Scabs",
        "Scoot",
        "Scope",
        "Score",
        "Screen",
        "Scribe",
        "Scroll",
        "Scrub",
        "Scull",
        "Seal",
        "Seam",
        "Sheema",
        "Shelf",
        "Shelmo",
        "Small_elmo",
        "Tablet",
        "Tabloid",
        "Taboo",
        "Taint tabor",
        "Take",
        "Talc",
        "Talcred",
        "Taldack",
        "Taldon",
        "Taldork",
        "Tale",
        "Talk",
        "Tall",
        "Tally",
        "Talon",
        "Tank",
        "Tann",
        "Tarry a",
        "Tarry b",
        "Tarry c",
        "Tassel",
        "Taste",
        "Tata",
        "Tease",
        "Telic",
        "Tense",
        "Tepid",
        "Terse",
        "Tesla",
        "Tetra",
        "Thigh",
        "Thirl",
        "Throb",
        "Thron",
        "Tooth",
        "Toto",
        "Tough",
        "Tread",
        "Trill",
        "Troma",
        "Trump",
        "Tutu",
        "Twang",
        "Tweak",
        "Twire",
        "Twirl",
        "Twist",
        "Twitch",
        "Ultra",
        "Vader",
        "Vaunt",
        "Wafer",
        "Walnut",
        "Wine",
        "Wood",
        "World",
        "Zebra",
        "Zeppelin",
        "Zeyda",
        "Zorba",
        "Zurik",
      ],
      kyb_status: ["Approved", "Rejected", "Needs Review"],
      metal_form_enum: [
        "Baled",
        "Loose",
        "Not specified",
        "Jumbo bag",
        "Ingots",
        "Cathodes",
        "Sows",
        "T bars",
      ],
      payment_trigger_event_enum: [
        "ATA",
        "BL confirmed",
        "BL issuance",
        "BL release",
        "Booking",
        "Customs Clearance",
        "DP",
        "ETA",
        "ETD",
        "Fixation",
        "Inspection",
        "Invoice",
        "Loading",
        "Other - custom",
        "Order Signed Date",
      ],
      payment_trigger_timing_enum: ["Before", "After"],
      payment_type_enum: [
        "Downpayment",
        "Provisional",
        "Final",
        "Credit Note",
        "Debit Note",
      ],
      pricing_type_enum: ["Fixed", "Formula", "Index"],
      reference_type: ["LME_CASH", "LME_3M", "COMEX", "SHFE", "OTHER"],
      supplier_response_enum: [
        "pending",
        "accepted",
        "rejected",
        "counter_offer",
      ],
      ticket_status: ["Draft", "Pending Approval", "Approved", "Rejected"],
      trade_type: ["Buy", "Sell"],
      trader_relationship_owner: [
        "Harry",
        "Eric",
        "Veli",
        "Anton",
        "Armin",
        "Christian",
        "Khsitiz",
      ],
      trader_relationship_owner_enum: [
        "Veli",
        "Harry",
        "Andy",
        "Anton",
        "Armin",
        "Christian",
        "Kshitiz",
        "Eric",
      ],
      transport_method_enum: ["Ocean", "Truck", "Rail", "Barge", "Multi modal"],
    },
  },
} as const
