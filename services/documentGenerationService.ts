import { supabase } from "@/integrations/supabase/client";
import { TemplateEngine } from "@/lib/templateEngine";

export interface GenerateDocumentParams {
  templateId: string;
  blOrderId: number;
}

export interface GenerateOrderDocumentParams {
  templateName: "Sales Order" | "Purchase Order";
  orderId: string;
}

// Cache for logo base64 to avoid re-fetching
let cachedLogoBase64: string | null = null;

/**
 * Fetches the Metycle logo and converts it to base64
 */
async function getLogoBase64(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64;

  try {
    const response = await fetch("/images/metycle-logo-white.png");
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoBase64 = reader.result as string;
        resolve(cachedLogoBase64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to load logo:", error);
    return "";
  }
}

/**
 * Replaces the CSS-based logo div with an actual image in the HTML
 * and constrains the top-bar height
 */
function replaceLogoWithImage(html: string, logoBase64: string): string {
  if (!logoBase64) return html;

  // Pattern to match the old logo HTML structure
  const oldLogoPattern =
    /<div class="logo">\s*<div class="logo-icon">m<\/div>\s*<div class="logo-text">metycle<\/div>\s*<\/div>/gi;

  // New logo HTML with embedded image - 100px height
  const newLogoHtml = `<div class="logo" style="display: flex; align-items: center;">
    <img src="${logoBase64}" alt="Metycle" style="height: 100px; width: auto;" />
  </div>`;

  let result = html.replace(oldLogoPattern, newLogoHtml);

  // Add CSS override for top-bar to have fixed height that fits the 100px logo
  const topBarOverride = `<style>.top-bar { height: 120px !important; max-height: 120px !important; padding: 10px 35px !important; box-sizing: border-box !important; }</style>`;
  
  // Insert override style right after opening <head> or at start of content
  if (result.includes('<head>')) {
    result = result.replace('<head>', '<head>' + topBarOverride);
  } else if (result.includes('<style>')) {
    result = result.replace('<style>', topBarOverride + '<style>');
  } else {
    result = topBarOverride + result;
  }

  return result;
}

export class DocumentGenerationService {
  /**
   * Generate a document from a template and BL Order data
   */
  static async generateDocument({ templateId, blOrderId }: GenerateDocumentParams) {
    // 1. Fetch template
    const { data: template, error: templateError } = await supabase
      .from("document_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      throw new Error("Template not found");
    }

    // 2. Fetch BL Order and related data
    const { data: blOrder, error: blOrderError } = await supabase
      .from("bl_order")
      .select("*")
      .eq("id", blOrderId)
      .single();

    if (blOrderError || !blOrder) {
      throw new Error("BL Order not found");
    }

    // 3. Fetch BL Extraction data
    const { data: blExtraction } = await supabase
      .from("bl_extraction")
      .select("*")
      .eq("bl_order_id", blOrderId)
      .single();

    // 4. Fetch Containers
    const { data: containers } = await supabase
      .from("bl_extraction_container")
      .select("*")
      .eq("bl_order_id", blOrderId);

    // 5. Fetch related Order data if order_id exists
    let orderData = null;
    let companyData = null;
    let companyAddressData = null;

    if (blOrder.order_id) {
      const { data: order } = await supabase.from("order").select("*").eq("id", blOrder.order_id).single();

      orderData = order;

      // Try to fetch company data (buyer or seller)
      if (order) {
        // For now, we'll fetch based on buyer name matching company name
        const { data: company } = await supabase
          .from("Company")
          .select("*, Company_address(*)")
          .ilike("name", order.buyer || "")
          .single();

        if (company) {
          companyData = company;
          companyAddressData = company.Company_address?.[0];
        }
      }
    }

    // 6. Prepare data for template engine
    const templateData = {
      bl_extraction: blExtraction || {},
      bl_order: blOrder,
      order: orderData || {},
      company: companyData || {},
      company_address: companyAddressData || {},
      containers: containers || [],
    };

    // 7. Process template
    const engine = new TemplateEngine(templateData);
    const processedHtml = engine.process(template.content);

    // 8. Generate PDF
    const documentName = `${template.name}_${blOrder.bl_order_name || blOrderId}_${Date.now()}.pdf`;

    const pdfBlob = await this.htmlToPdf(processedHtml, documentName);

    // 9. Upload to Supabase Storage
    const filePath = `documents/${documentName}`;
    const { error: uploadError } = await supabase.storage.from("bl-documents").upload(filePath, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (uploadError) {
      throw new Error("Failed to upload document");
    }

    // 10. Get public URL
    const { data: urlData } = supabase.storage.from("bl-documents").getPublicUrl(filePath);

    const documentUrl = urlData.publicUrl;

    // 11. Record in generated_documents table
    const { data: generatedDoc, error: insertError } = await supabase
      .from("generated_documents")
      .insert({
        template_id: templateId,
        bl_order_id: blOrderId,
        document_name: documentName,
        document_url: documentUrl,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error("Failed to record generated document");
    }

    // 12. If this is a Sales Order or Purchase Order template and we have a linked order,
    // update the corresponding document URL on the order so it shows up for signing.
    if (orderData && blOrder.order_id) {
      if (template.name === "Sales Order") {
        await supabase.from("order").update({ sales_order_url: documentUrl }).eq("id", blOrder.order_id);
      }

      if (template.name === "Purchase Order") {
        await supabase.from("order").update({ purchase_order_url: documentUrl }).eq("id", blOrder.order_id);
      }
    }

    return {
      document: generatedDoc,
      url: documentUrl,
      html: processedHtml,
    };
  }

  /**
   * Convert HTML to PDF using iframe-based rendering approach
   * This method creates an off-screen iframe and captures each .page element separately
   * to properly handle multi-page documents with correct page breaks
   */
  private static async htmlToPdf(html: string, filename: string): Promise<Blob> {
    try {
      console.log("🔵 [PDF] Starting page-by-page PDF generation for:", filename);
      console.log("🔵 [PDF] HTML content length:", html.length);

      // Dynamically import dependencies
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default;
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;

      // Create off-screen iframe with A4 dimensions
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;height:5000px;border:none;";
      document.body.appendChild(iframe);

      try {
        // Get iframe document
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          throw new Error("Could not access iframe document");
        }

        // Get logo base64 and replace CSS logo with image
        const logoBase64 = await getLogoBase64();
        const htmlWithLogo = replaceLogoWithImage(html, logoBase64);

        // Inject CSS constraints to fix layout and text alignment issues
        const pageConstraintCSS = `
          <style>
            /* Force all fonts to use system fallbacks for consistent rendering */
            * {
              font-family: Arial, Helvetica, sans-serif !important;
            }
            
            /* Force logo image to be larger */
            .logo img {
              height: 100px !important;
              width: auto !important;
              max-width: 250px !important;
            }
            
            .page {
              width: 794px !important;
              height: 1123px !important;
              min-height: 1123px !important;
              max-height: 1123px !important;
              overflow: hidden !important;
              page-break-after: always;
              position: relative !important;
              box-sizing: border-box !important;
            }
            
            /* Ensure consistent table rendering */
            table {
              table-layout: fixed !important;
            }
            
            /* Fix text baseline alignment */
            p, span, div, td, th {
              line-height: 1.4 !important;
            }
          </style>
        `;

        // Write HTML content to iframe with CSS constraints
        iframeDoc.open();
        iframeDoc.write(pageConstraintCSS + htmlWithLogo);
        iframeDoc.close();

        console.log("🔵 [PDF] HTML written to iframe, waiting for content to render...");

        // Wait longer for fonts and content to fully render
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const iframeBody = iframeDoc.body;
        if (!iframeBody || iframeBody.innerHTML.length < 100) {
          throw new Error("Iframe body has insufficient content");
        }

        // Find all .page elements in the document
        const pageElements = iframeDoc.querySelectorAll(".page");
        console.log("🔵 [PDF] Found", pageElements.length, "page elements");

        // Create PDF
        const pdf = new jsPDF({
          unit: "px",
          format: "a4",
          orientation: "portrait",
          compress: true,
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        if (pageElements.length > 0) {
          // Capture each .page element separately
          for (let i = 0; i < pageElements.length; i++) {
            const pageEl = pageElements[i] as HTMLElement;

            console.log(`🔵 [PDF] Capturing page ${i + 1}/${pageElements.length}`);

            // Use fixed A4 page height and set both window dimensions
            const canvas = await html2canvas(pageEl, {
              scale: 2,
              useCORS: true,
              allowTaint: false,
              logging: false,
              width: 794,
              height: 1123,
              windowWidth: 794,
              windowHeight: 1123,
            });

            const imgData = canvas.toDataURL("image/jpeg", 0.95);
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            // Add new page for subsequent pages
            if (i > 0) {
              pdf.addPage();
            }

            // Add image, fitting to page width
            pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight));
          }
        } else {
          // Fallback: capture entire body if no .page elements found
          console.log("🔵 [PDF] No .page elements found, capturing entire body");

          const canvas = await html2canvas(iframeBody, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            logging: false,
            width: 794,
            height: iframeBody.scrollHeight,
            windowWidth: 794,
            windowHeight: iframeBody.scrollHeight,
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          const imgHeight = (canvas.height * pdfWidth) / canvas.width;

          pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, imgHeight);

          // Handle multi-page if content is taller than one page
          if (imgHeight > pdfHeight) {
            let heightLeft = imgHeight - pdfHeight;
            let position = -pdfHeight;

            while (heightLeft > 0) {
              pdf.addPage();
              pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight);
              heightLeft -= pdfHeight;
              position -= pdfHeight;
            }
          }
        }

        // Output as blob
        const pdfBlob = pdf.output("blob");

        console.log("✅ [PDF] PDF generated successfully, size:", pdfBlob.size, "bytes");

        if (!pdfBlob || pdfBlob.size === 0) {
          throw new Error("Generated PDF is empty (0 bytes)");
        }

        return pdfBlob;
      } finally {
        // Clean up iframe
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
          console.log("🔵 [PDF] Iframe cleaned up");
        }
      }
    } catch (error) {
      console.error("❌ [PDF] Error generating PDF:", error);
      throw new Error("Failed to generate PDF: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  /**
   * Preview template with sample data
   */
  static previewTemplate(templateContent: string): string {
    const engine = new TemplateEngine(TemplateEngine.getSampleData());
    return engine.process(templateContent);
  }

  /**
   * Fetch all generated documents for a BL Order
   */
  static async getGeneratedDocuments(blOrderId: number) {
    const { data, error } = await supabase
      .from("generated_documents")
      .select("*, document_templates(name, category)")
      .eq("bl_order_id", blOrderId)
      .order("generated_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Delete a generated document
   */
  static async deleteGeneratedDocument(id: string) {
    const { error } = await supabase.from("generated_documents").delete().eq("id", id);

    if (error) throw error;
  }

  /**
   * Generate Sales Order or Purchase Order directly from order data
   * (not requiring a BL Order)
   */
  static async generateOrderDocument({ templateName, orderId }: GenerateOrderDocumentParams) {
    // 1. Fetch the template
    const { data: template, error: templateError } = await supabase
      .from("document_templates")
      .select("*")
      .eq("name", templateName)
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      throw new Error(`${templateName} template not found`);
    }

    // 2. Fetch order data
    const { data: order, error: orderError } = await supabase.from("order").select("*").eq("id", orderId).single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // 3. Fetch buy and sell tickets
    const buyTicketIds = order.buyer?.split(",").map((id: string) => parseInt(id.trim())) || [];
    const sellTicketIds = order.seller?.split(",").map((id: string) => parseInt(id.trim())) || [];

    // 3.5 Backend validation: Block wrong document type for Inventory orders
    const isInventory = order.transaction_type?.toLowerCase() === "inventory";

    if (isInventory) {
      // For inventory orders, fetch tickets to determine trade type
      let ticketType: string | null = null;

      if (buyTicketIds.length > 0) {
        const { data: buyTicket } = await supabase.from("ticket").select("type").eq("id", buyTicketIds[0]).single();
        ticketType = buyTicket?.type || null;
      } else if (sellTicketIds.length > 0) {
        const { data: sellTicket } = await supabase.from("ticket").select("type").eq("id", sellTicketIds[0]).single();
        ticketType = sellTicket?.type || null;
      }

      // Validate document type matches ticket type
      if (ticketType === "Buy" && templateName === "Sales Order") {
        throw new Error("Cannot generate Sales Order for Inventory Buy orders. Only Purchase Order is allowed.");
      }
      if (ticketType === "Sell" && templateName === "Purchase Order") {
        throw new Error("Cannot generate Purchase Order for Inventory Sell orders. Only Sales Order is allowed.");
      }
    }

    const { data: buyTickets } = await supabase.from("ticket").select("*").in("id", buyTicketIds);

    const { data: sellTickets } = await supabase.from("ticket").select("*").in("id", sellTicketIds);

    // 4. Fetch company data using company_id from tickets (with fallback to name matching)
    let companyData = null;
    let companyAddressData = null;

    const fetchCompanyData = async (companyId: number | null, clientName: string | null) => {
      let company = null;

      // First try by company_id
      if (companyId) {
        const { data } = await supabase.from("Company").select("*").eq("id", companyId).maybeSingle();
        company = data;
      }

      // Fallback to matching by client_name
      if (!company && clientName) {
        const { data } = await supabase.from("Company").select("*").ilike("name", clientName).maybeSingle();
        company = data;
      }

      if (company) {
        const { data: address } = await supabase
          .from("Company_address")
          .select("*")
          .eq("company_id", company.id)
          .eq("is_primary", true)
          .maybeSingle();
        return { company, address };
      }

      return { company: null, address: null };
    };

    if (templateName === "Sales Order" && sellTickets && sellTickets.length > 0) {
      const ticket = sellTickets[0];
      const result = await fetchCompanyData(ticket.company_id, ticket.client_name);
      companyData = result.company;
      companyAddressData = result.address;
    }

    if (templateName === "Purchase Order" && buyTickets && buyTickets.length > 0) {
      const ticket = buyTickets[0];
      const result = await fetchCompanyData(ticket.company_id, ticket.client_name);
      companyData = result.company;
      companyAddressData = result.address;
    }

    // 5. Prepare template data - use nested structure that TemplateEngine expects
    const ticket = templateName === "Sales Order" ? sellTickets && sellTickets[0] : buyTickets && buyTickets[0];

    const templateData = {
      order: {
        ...order,
        commodity_type: order.commodity_type,
        isri_grade: order.isri_grade,
        metal_form: order.metal_form,
        allocated_quantity_mt: order.allocated_quantity_mt,
        buy_price: order.buy_price,
        sell_price: order.sell_price,
        ship_to: order.ship_to,
        ship_from: order.ship_from,
        order_id: orderId,
      },
      company: {
        ...companyData,
        name: ticket?.client_name || companyData?.name,
      },
      company_address: companyAddressData || {},
      // Add ticket object for template variables
      ticket: ticket
        ? {
            payment_terms: ticket.payment_terms,
            payment_trigger_event: ticket.payment_trigger_event,
            payment_offset_days: ticket.payment_offset_days,
            product_details: ticket.product_details,
            currency: ticket.currency,
            transport_method: ticket.transport_method,
            country_of_origin: ticket.country_of_origin,
            qp_start: ticket.qp_start,
            qp_end: ticket.qp_end,
            incoterms: ticket.incoterms,
            basis: ticket.basis,
            payable_percent: ticket.payable_percent,
          }
        : {},
      // Keep these at root level for backward compatibility
      currency: ticket?.currency || "USD",
      transport_method: ticket?.transport_method,
      country_of_origin: ticket?.country_of_origin,
      qp_start: ticket?.qp_start,
      qp_end: ticket?.qp_end,
      incoterms: ticket?.incoterms,
      payment_terms: ticket?.payment_terms,
    };

    // 6. Process template
    console.log("🔵 [TEMPLATE] Processing template with data:", {
      orderKeys: Object.keys(templateData.order || {}),
      companyName: templateData.company?.name,
      hasCompanyAddress: !!templateData.company_address,
      currency: templateData.currency,
    });

    const engine = new TemplateEngine(templateData);
    const processedHtml = engine.process(template.content);

    console.log("🔵 [TEMPLATE] Processed HTML length:", processedHtml.length);
    console.log("🔵 [TEMPLATE] HTML preview (first 800 chars):", processedHtml.substring(0, 800));

    // 7. Generate PDF with proper configuration
    const documentName = `${templateName.replace(" ", "_")}_${orderId}_${Date.now()}.pdf`;

    console.log("🔵 [PDF GEN] Generating PDF for:", documentName);
    console.log("🔵 [PDF GEN] HTML length:", processedHtml.length);
    console.log("🔵 [PDF GEN] HTML preview (first 500 chars):", processedHtml.substring(0, 500));

    const pdfBlob = await this.htmlToPdf(processedHtml, documentName);

    console.log("🔵 [PDF GEN] Generated PDF size:", pdfBlob.size, "bytes");
    console.log("🔵 [PDF GEN] PDF blob type:", pdfBlob.type);

    if (pdfBlob.size === 0) {
      throw new Error("Generated PDF is empty");
    }

    if (pdfBlob.size < 1000) {
      console.warn("⚠️ [PDF GEN] PDF size is very small:", pdfBlob.size, "bytes");
    }

    // 8. Upload to storage
    const filePath = `orders/${documentName}`;
    console.log("🟢 [STORAGE] Uploading to Supabase storage:", filePath);
    console.log("🟢 [STORAGE] Blob size before upload:", pdfBlob.size, "bytes");

    const { error: uploadError } = await supabase.storage.from("bl-documents").upload(filePath, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (uploadError) {
      console.error("❌ [STORAGE] Upload error:", uploadError);
      throw new Error(`Failed to upload ${templateName}`);
    }

    console.log("✅ [STORAGE] Upload successful");

    // 9. Get public URL
    const { data: urlData } = supabase.storage.from("bl-documents").getPublicUrl(filePath);

    const documentUrl = urlData.publicUrl;
    console.log("🟢 [STORAGE] Public URL:", documentUrl);

    // 10. Update order table with the document URL
    const updateField =
      templateName === "Sales Order" ? { sales_order_url: documentUrl } : { purchase_order_url: documentUrl };

    const { error: updateError } = await supabase.from("order").update(updateField).eq("id", orderId);

    if (updateError) {
      throw new Error(`Failed to update order with ${templateName} URL`);
    }

    // Document generated successfully - ready to be uploaded to PandaDoc via Signing page

    return {
      url: documentUrl,
      html: processedHtml,
    };
  }
}
