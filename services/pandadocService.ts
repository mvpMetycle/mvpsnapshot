import { supabase } from "@/integrations/supabase/client";

export interface Recipient {
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  signingOrder?: number;
}

export interface CreateSigningRequestParams {
  signatureId?: string; // Optional: if provided, updates existing signature instead of creating new
  documentUrl: string;
  documentName: string;
  documentType: 'purchase_order' | 'sales_order' | 'bl_document' | 'company_document';
  referenceId: string;
  referenceTable: string;
  recipients: Recipient[];
}

export interface SigningRequest {
  id: string;
  pandadoc_document_id: string | null;
  document_type: string;
  reference_id: string;
  reference_table: string;
  document_name: string;
  document_url: string | null;
  status: string;
  recipients: any;
  signing_link: string | null;
  signed_document_url: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  sent_at: string | null;
  error_message: string | null;
}

export interface DocumentStatus {
  status: string;
  recipients?: any[];
  completed_at?: string;
  signed_document_url?: string;
}

export interface SendOptions {
  subject?: string;
  message?: string;
  silent?: boolean;
}

class PandaDocService {
  /**
   * Create a new signing request by uploading document to PandaDoc
   */
  async createSigningRequest(params: CreateSigningRequestParams): Promise<SigningRequest> {
    const { data, error } = await supabase.functions.invoke("pandadoc-signing", {
      body: { ...params, action: "create" },
    });

    if (error) {
      throw new Error(error.message || "Failed to create signing request");
    }

    return data as SigningRequest;
  }

  /**
   * Upload an existing generated document to PandaDoc
   * Creates a signature record and uploads the document
   */
  async uploadToPandaDoc(params: {
    documentUrl: string;
    documentName: string;
    documentType: 'sales_order' | 'purchase_order';
    referenceId: string;
    counterpartyName: string;
  }): Promise<SigningRequest> {
    const recipients = [
      {
        email: "operations@metycle.com",
        firstName: "Metycle",
        lastName: "Operations",
        signingOrder: 1,
      },
      {
        email: "counterparty@example.com",
        firstName: params.counterpartyName.split(" ")[0] || "Counterparty",
        lastName: params.counterpartyName.split(" ").slice(1).join(" ") || "Contact",
        signingOrder: 2,
      },
    ];

    const { data, error } = await supabase.functions.invoke("pandadoc-signing", {
      body: {
        action: "create",
        documentUrl: params.documentUrl,
        documentName: params.documentName,
        documentType: params.documentType,
        referenceId: params.referenceId,
        referenceTable: "order",
        recipients,
      },
    });

    if (error) {
      throw new Error(error.message || "Failed to upload to PandaDoc");
    }

    return data as SigningRequest;
  }

  /**
   * Send document for signature to recipients
   */
  async sendForSignature(signatureId: string, options?: SendOptions): Promise<void> {
    const { error } = await supabase.functions.invoke("pandadoc-signing", {
      body: {
        action: "send",
        signatureId,
        ...options,
      },
    });

    if (error) {
      throw new Error(error.message || "Failed to send document for signature");
    }
  }

  /**
   * Alias for sendForSignature - Send document for signature to recipients
   */
  async sendDocument(signatureId: string, options?: SendOptions): Promise<void> {
    return this.sendForSignature(signatureId, options);
  }

  /**
   * Get embedded signing link for a specific recipient
   */
  async getSigningLink(signatureId: string, recipientEmail: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke("pandadoc-signing", {
      body: {
        action: "signing-link",
        signatureId,
        recipientEmail,
      },
    });

    if (error) {
      throw new Error(error.message || "Failed to get signing link");
    }

    return data.signing_link;
  }

  /**
   * Get current status of a signing request
   */
  async getStatus(signatureId: string): Promise<DocumentStatus> {
    const { data, error } = await supabase.functions.invoke("pandadoc-signing", {
      body: {
        action: "status",
        signatureId,
      },
    });

    if (error) {
      throw new Error(error.message || "Failed to get document status");
    }

    return data as DocumentStatus;
  }

  /**
   * Get all signatures for a specific reference (order, bl_order, etc.)
   */
  async getSignaturesForReference(referenceTable: string, referenceId: string): Promise<SigningRequest[]> {
    const { data, error } = await supabase
      .from("document_signatures")
      .select("*")
      .eq("reference_table", referenceTable)
      .eq("reference_id", referenceId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message || "Failed to fetch signatures");
    }

    return data as SigningRequest[];
  }

  /**
   * Download signed document as blob
   */
  async downloadSignedDocument(signatureId: string): Promise<Blob> {
    const { data, error } = await supabase.functions.invoke("pandadoc-signing", {
      body: {
        action: "download",
        signatureId,
      },
    });

    if (error) {
      throw new Error(error.message || "Failed to download signed document");
    }

    // Fetch the blob from the returned URL
    const response = await fetch(data.url);
    return await response.blob();
  }
}

export const pandadocService = new PandaDocService();
