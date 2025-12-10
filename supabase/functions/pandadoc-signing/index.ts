import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateDocumentRequest {
  signatureId?: string;
  documentUrl: string;
  documentName: string;
  documentType: string;
  referenceId: string;
  referenceTable: string;
  recipients: Array<{
    email: string;
    firstName: string;
    lastName: string;
    role?: string;
    signingOrder?: number;
  }>;
}

interface SendRequest {
  signatureId: string;
  subject?: string;
  message?: string;
  silent?: boolean;
}

interface SigningLinkRequest {
  signatureId: string;
  recipientEmail: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("PANDADOC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "PandaDoc API key not configured. Please add PANDADOC_API_KEY to Supabase secrets.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const body = await req.json();
    const action = body.action || url.searchParams.get("action");

    console.log("PandaDoc signing action:", action);

    // Handle webhook callbacks
    if (action === "webhook") {
      const webhookData = await req.json();
      console.log("PandaDoc webhook received:", webhookData);

      // Update document signature status based on webhook event
      if (webhookData.event && webhookData.data) {
        const { event, data } = webhookData;
        const pandadocId = data.id;

        let status = "draft";
        let completedAt = null;

        switch (event) {
          case "document_state_changed":
            if (data.status === "document.sent") status = "sent";
            if (data.status === "document.viewed") status = "viewed";
            if (data.status === "document.waiting_approval") status = "waiting_approval";
            if (data.status === "document.completed") {
              status = "completed";
              completedAt = new Date().toISOString();
            }
            if (data.status === "document.declined") status = "declined";
            if (data.status === "document.voided") status = "voided";
            break;
        }

        const { error: updateError } = await supabase
          .from("document_signatures")
          .update({
            status,
            completed_at: completedAt,
            updated_at: new Date().toISOString(),
          })
          .eq("pandadoc_document_id", pandadocId);

        if (updateError) {
          console.error("Error updating document signature:", updateError);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create document
    if (action === "create") {
      console.log("🟡 [PANDADOC] Creating document for:", body.documentName);
      console.log("🟡 [PANDADOC] Document URL:", body.documentUrl);

      // Parse Supabase storage URL to get bucket and path
      let bucketName: string;
      let filePath: string;
      
      try {
        const url = new URL(body.documentUrl);
        const pathParts = url.pathname.split("/");
        // URL format: /storage/v1/object/public/{bucket}/{path}
        const publicIndex = pathParts.indexOf("public");
        if (publicIndex === -1) {
          throw new Error("Invalid storage URL format");
        }
        bucketName = pathParts[publicIndex + 1];
        filePath = pathParts.slice(publicIndex + 2).join("/");
        
        console.log("Parsed bucket:", bucketName);
        console.log("Parsed path:", filePath);
      } catch (parseError) {
        console.error("URL parsing error:", parseError);
        throw new Error(`Invalid document URL format: ${body.documentUrl}`);
      }

      // Download document from Supabase storage
      console.log("🟡 [PANDADOC] Downloading from Supabase storage...");
      console.log("🟡 [PANDADOC] Bucket:", bucketName, "Path:", filePath);
      
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (downloadError) {
        console.error("❌ [PANDADOC] Storage download error:", downloadError);
        throw new Error(`Failed to download document: ${downloadError.message}`);
      }

      if (!fileData) {
        console.error("❌ [PANDADOC] Downloaded file is null/undefined");
        throw new Error("Downloaded file is empty");
      }

      console.log("✅ [PANDADOC] Downloaded file size:", fileData.size, "bytes");
      console.log("🟡 [PANDADOC] Downloaded file type:", fileData.type);
      
      if (fileData.size === 0) {
        throw new Error("Downloaded file has 0 bytes - file is empty in storage");
      }
      
      if (fileData.size < 5000) {
        console.warn("⚠️ [PANDADOC] File size is suspiciously small - may be blank PDF");
      }

      // Create form data for PandaDoc
      console.log("🟡 [PANDADOC] Creating FormData for PandaDoc upload...");
      const formData = new FormData();
      formData.append("file", fileData, body.documentName + ".pdf");
      console.log("🟡 [PANDADOC] File appended to FormData with name:", body.documentName + ".pdf");

      // Prepare recipients for PandaDoc - only add first recipient to avoid external email restriction
      // We'll add remaining recipients after the first signer completes
      const firstRecipient = body.recipients[0];
      const pandadocRecipients = [{
        email: firstRecipient.email,
        first_name: firstRecipient.firstName,
        last_name: firstRecipient.lastName,
        role: "Signer1",
        signing_order: 1,
      }];

      formData.append(
        "data",
        JSON.stringify({
          name: body.documentName,
          recipients: pandadocRecipients,
          parse_form_fields: true, // Enable text tag parsing for signature fields
          metadata: {
            reference_id: body.referenceId,
            reference_table: body.referenceTable,
            document_type: body.documentType,
          },
        })
      );

      // Create document in PandaDoc
      console.log("🟡 [PANDADOC] Uploading to PandaDoc API...");
      const createResponse = await fetch("https://api.pandadoc.com/public/v1/documents", {
        method: "POST",
        headers: {
          Authorization: `API-Key ${apiKey}`,
        },
        body: formData,
      });

      console.log("🟡 [PANDADOC] PandaDoc API response status:", createResponse.status);

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error("❌ [PANDADOC] PandaDoc API error:", errorText);
        throw new Error(`PandaDoc API error: ${createResponse.status} - ${errorText}`);
      }

      const pandadocDoc = await createResponse.json();
      console.log("✅ [PANDADOC] PandaDoc document created:", pandadocDoc.id);
      console.log("🟡 [PANDADOC] PandaDoc response:", JSON.stringify(pandadocDoc, null, 2));

      // Update existing record or create new one
      let signature;
      if (body.signatureId) {
        // Update existing signature record
        const { data: updatedSignature, error: dbError } = await supabase
          .from("document_signatures")
          .update({
            pandadoc_document_id: pandadocDoc.id,
            status: "draft",
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.signatureId)
          .select()
          .single();

        if (dbError) {
          throw new Error(`Database error: ${dbError.message}`);
        }
        signature = updatedSignature;
      } else {
        // Create new record in our database
        const { data: newSignature, error: dbError } = await supabase
          .from("document_signatures")
          .insert({
            pandadoc_document_id: pandadocDoc.id,
            document_type: body.documentType,
            reference_id: body.referenceId,
            reference_table: body.referenceTable,
            document_name: body.documentName,
            document_url: body.documentUrl,
            status: "draft",
            recipients: body.recipients,
          })
          .select()
          .single();

        if (dbError) {
          throw new Error(`Database error: ${dbError.message}`);
        }
        signature = newSignature;
      }

      return new Response(JSON.stringify(signature), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send document for signature
    if (action === "send") {
      console.log("Sending document for signature:", body.signatureId);

      const { data: signature, error: fetchError } = await supabase
        .from("document_signatures")
        .select("*")
        .eq("id", body.signatureId)
        .single();

      if (fetchError || !signature) {
        throw new Error("Signature request not found");
      }

      // Poll for document to be ready (max 30 seconds)
      let attempts = 0;
      let docStatus = "";
      while (attempts < 30 && docStatus !== "document.draft") {
        const statusResponse = await fetch(
          `https://api.pandadoc.com/public/v1/documents/${signature.pandadoc_document_id}`,
          {
            headers: {
              Authorization: `API-Key ${apiKey}`,
            },
          }
        );

        if (statusResponse.ok) {
          const docData = await statusResponse.json();
          docStatus = docData.status;
          
          if (docStatus === "document.draft") {
            break;
          }
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      }

      if (docStatus !== "document.draft") {
        throw new Error("Document not ready for sending. Please try again in a moment.");
      }

      // Add any remaining recipients (counterparty) before sending
      const allRecipients = signature.recipients || [];
      if (allRecipients.length > 1) {
        console.log("Adding remaining recipients to document...");
        
        // Get current document to check existing recipients
        const docResponse = await fetch(
          `https://api.pandadoc.com/public/v1/documents/${signature.pandadoc_document_id}`,
          {
            headers: {
              Authorization: `API-Key ${apiKey}`,
            },
          }
        );
        
        if (docResponse.ok) {
          const docData = await docResponse.json();
          const existingEmails = docData.recipients?.map((r: any) => r.email) || [];
          
          // Add recipients that aren't already in the document
          for (let i = 1; i < allRecipients.length; i++) {
            const recipient = allRecipients[i];
            if (!existingEmails.includes(recipient.email)) {
              console.log(`Adding recipient: ${recipient.email}`);
              
              const addRecipientResponse = await fetch(
                `https://api.pandadoc.com/public/v1/documents/${signature.pandadoc_document_id}/recipients`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `API-Key ${apiKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    id: `recipient_${i + 1}`,
                    email: recipient.email,
                    first_name: recipient.firstName,
                    last_name: recipient.lastName,
                    role: `Signer${i + 1}`,
                    signing_order: recipient.signingOrder || (i + 1),
                  }),
                }
              );
              
              if (!addRecipientResponse.ok) {
                const errorText = await addRecipientResponse.text();
                console.error(`Failed to add recipient: ${errorText}`);
              }
            }
          }
          
          // Wait for recipients to be added
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const sendResponse = await fetch(
        `https://api.pandadoc.com/public/v1/documents/${signature.pandadoc_document_id}/send`,
        {
          method: "POST",
          headers: {
            Authorization: `API-Key ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject: body.subject || `Please sign: ${signature.document_name}`,
            message: body.message || "Please review and sign this document.",
            silent: body.silent || false,
          }),
        }
      );

      if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        throw new Error(`PandaDoc send error: ${sendResponse.status} - ${errorText}`);
      }

      // Update status in database
      const { error: updateError } = await supabase
        .from("document_signatures")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", body.signatureId);

      if (updateError) {
        throw new Error(`Database update error: ${updateError.message}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get signing link for embedded signing
    if (action === "signing-link") {
      console.log("Getting signing link for:", body.signatureId);

      const { data: signature, error: fetchError } = await supabase
        .from("document_signatures")
        .select("*")
        .eq("id", body.signatureId)
        .single();

      if (fetchError || !signature) {
        throw new Error("Signature request not found");
      }

      // Validate pandadoc_document_id exists
      if (!signature.pandadoc_document_id) {
        throw new Error("Document not yet created in PandaDoc. Please send for signature first.");
      }

      console.log("Checking PandaDoc document status:", signature.pandadoc_document_id);

      // Check document status from PandaDoc
      const statusResponse = await fetch(
        `https://api.pandadoc.com/public/v1/documents/${signature.pandadoc_document_id}`,
        {
          headers: {
            Authorization: `API-Key ${apiKey}`,
          },
        }
      );

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error("PandaDoc status check failed:", statusResponse.status, errorText);
        throw new Error(`Failed to check document status: ${statusResponse.status} - ${errorText}`);
      }

      const docData = await statusResponse.json();
      
      // Note: We no longer try to add recipients here.
      // The embedded session API will validate that the recipient exists
      // and return a clear error if not.
      console.log("Existing PandaDoc recipients:", (docData.recipients || []).map((r: any) => r.email));
      
      // If document is in draft status, send it before creating session
      if (docData.status === "document.draft") {
        console.log("Document in draft status, sending...");

        const sendResponse = await fetch(
          `https://api.pandadoc.com/public/v1/documents/${signature.pandadoc_document_id}/send`,
          {
            method: "POST",
            headers: {
              Authorization: `API-Key ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              subject: `Please sign: ${signature.document_name}`,
              message: "Please review and sign this document.",
              silent: false,
            }),
          }
        );

        if (!sendResponse.ok) {
          const errorText = await sendResponse.text();
          throw new Error(`Failed to send document: ${sendResponse.status} - ${errorText}`);
        }

        // Update status in database
        await supabase
          .from("document_signatures")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", body.signatureId);

        // Wait for send to propagate
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Create signing session
      const sessionResponse = await fetch(
        `https://api.pandadoc.com/public/v1/documents/${signature.pandadoc_document_id}/session`,
        {
          method: "POST",
          headers: {
            Authorization: `API-Key ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient: body.recipientEmail,
            lifetime: 900, // 15 minutes
          }),
        }
      );

      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        throw new Error(`PandaDoc session error: ${sessionResponse.status} - ${errorText}`);
      }

      const sessionData = await sessionResponse.json();
      
      // Construct the embedded signing URL
      const embeddedSigningUrl = `https://app.pandadoc.com/s/${sessionData.id}`;
      
      console.log("Session created:", sessionData.id);
      console.log("Embedded signing URL:", embeddedSigningUrl);

      // Update signing link and status in database
      await supabase
        .from("document_signatures")
        .update({
          signing_link: embeddedSigningUrl,
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", body.signatureId);

      return new Response(JSON.stringify({ signing_link: embeddedSigningUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get document status
    if (action === "status") {
      const signatureId = body.signatureId;
      if (!signatureId) {
        throw new Error("signatureId parameter required");
      }

      const { data: signature, error: fetchError } = await supabase
        .from("document_signatures")
        .select("*")
        .eq("id", signatureId)
        .single();

      if (fetchError || !signature) {
        throw new Error("Signature request not found");
      }

      // Fetch latest status from PandaDoc
      if (signature.pandadoc_document_id) {
        const statusResponse = await fetch(
          `https://api.pandadoc.com/public/v1/documents/${signature.pandadoc_document_id}`,
          {
            headers: {
              Authorization: `API-Key ${apiKey}`,
            },
          }
        );

        if (statusResponse.ok) {
          const pandadocDoc = await statusResponse.json();

          // Map PandaDoc status to our status
          let ourStatus = signature.status;
          let completedAt = signature.completed_at;
          
          if (pandadocDoc.status === "document.sent") ourStatus = "sent";
          if (pandadocDoc.status === "document.viewed") ourStatus = "viewed";
          if (pandadocDoc.status === "document.completed") {
            ourStatus = "completed";
            completedAt = new Date().toISOString();
            
            // Automatically download the signed document
            console.log("Document completed, downloading signed PDF...");
            try {
              const downloadResponse = await fetch(
                `https://api.pandadoc.com/public/v1/documents/${signature.pandadoc_document_id}/download`,
                {
                  headers: {
                    Authorization: `API-Key ${apiKey}`,
                  },
                }
              );

              if (downloadResponse.ok) {
                const pdfBlob = await downloadResponse.blob();
                const signedPath = `${signature.document_name}-signed-${Date.now()}.pdf`;
                
                // Store all signed documents in the public signed-documents bucket
                const { error: uploadError } = await supabase.storage
                  .from("signed-documents")
                  .upload(signedPath, pdfBlob, {
                    contentType: "application/pdf",
                  });

                if (!uploadError) {
                  const { data: urlData } = supabase.storage
                    .from("signed-documents")
                    .getPublicUrl(signedPath);

                  // Update signature with signed document URL
                  await supabase
                    .from("document_signatures")
                    .update({ 
                      signed_document_url: urlData.publicUrl,
                      status: ourStatus,
                      completed_at: completedAt
                    })
                    .eq("id", signatureId);
                    
                  signature.signed_document_url = urlData.publicUrl;
                  console.log("Signed document downloaded and stored:", urlData.publicUrl);
                }
              }
            } catch (downloadError) {
              console.error("Failed to download signed document:", downloadError);
            }
          }
          if (pandadocDoc.status === "document.declined") ourStatus = "declined";

          // Update if status changed (only if we haven't already updated with signed URL)
          if (ourStatus !== signature.status && !signature.signed_document_url) {
            await supabase
              .from("document_signatures")
              .update({ 
                status: ourStatus,
                completed_at: completedAt
              })
              .eq("id", signatureId);
            signature.status = ourStatus;
          }
        }
      }

      return new Response(JSON.stringify(signature), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download signed document
    if (action === "download") {
      const signatureId = body.signatureId;
      if (!signatureId) {
        throw new Error("signatureId parameter required");
      }

      const { data: signature, error: fetchError } = await supabase
        .from("document_signatures")
        .select("*")
        .eq("id", signatureId)
        .single();

      if (fetchError || !signature) {
        throw new Error("Signature request not found");
      }

      const downloadResponse = await fetch(
        `https://api.pandadoc.com/public/v1/documents/${signature.pandadoc_document_id}/download`,
        {
          headers: {
            Authorization: `API-Key ${apiKey}`,
          },
        }
      );

      if (!downloadResponse.ok) {
        const errorText = await downloadResponse.text();
        throw new Error(`PandaDoc download error: ${downloadResponse.status} - ${errorText}`);
      }

      const pdfBlob = await downloadResponse.blob();

      // Upload to Supabase storage
      const signedPath = `signed/${signature.document_name}-signed-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("company-documents") // Use appropriate bucket
        .upload(signedPath, pdfBlob, {
          contentType: "application/pdf",
        });

      if (uploadError) {
        throw new Error(`Storage upload error: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("company-documents")
        .getPublicUrl(signedPath);

      // Update database with signed document URL
      await supabase
        .from("document_signatures")
        .update({
          signed_document_url: urlData.publicUrl,
        })
        .eq("id", signatureId);

      return new Response(JSON.stringify({ url: urlData.publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action parameter" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("PandaDoc signing error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
