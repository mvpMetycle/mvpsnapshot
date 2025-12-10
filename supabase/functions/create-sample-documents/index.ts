import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { orderId } = await req.json();

    // Create complete Purchase Order PDF with all details
    const createPurchaseOrderPDF = async (orderId: string) => {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // -------- Page 1: Purchase Order Confirmation --------
      const page1 = pdfDoc.addPage([595, 842]);
      let y = 800;

      // Header bar with METYCLE address
      page1.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: rgb(0.14, 0.33, 0.34) });
      page1.drawText("METYCLE GmbH", { x: 50, y: 815, size: 10, font: boldFont, color: rgb(1, 1, 1) });
      page1.drawText("Venloer Str. 301-303, 50823 Cologne, Germany", {
        x: 50,
        y: 802,
        size: 8,
        font,
        color: rgb(1, 1, 1),
      });

      // Title & basic info
      y = 760;
      page1.drawText("Purchase Order Confirmation", { x: 50, y, size: 18, font: boldFont });
      y -= 30;
      page1.drawText(`Document date: ${new Date().toISOString().split("T")[0]}`, {
        x: 50,
        y,
        size: 10,
        font,
      });
      y -= 15;
      page1.drawText(`Order ID: ${orderId}`, { x: 50, y, size: 10, font });

      // Buyer block
      y -= 30;
      page1.drawText("Buyer", { x: 50, y, size: 12, font: boldFont });
      y -= 15;
      page1.drawText("METYCLE GmbH", { x: 50, y, size: 10, font });
      y -= 12;
      page1.drawText("Venloer Str. 301-303", { x: 50, y, size: 10, font });
      y -= 12;
      page1.drawText("50823 Cologne - Germany", { x: 50, y, size: 10, font });
      y -= 12;
      page1.drawText("Commercial Register: Cologne, HRB 110770", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("EORI Number: DE853113866728686", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("VAT Number: DE354945597", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("Contact: operations@metycle.com", { x: 50, y, size: 9, font });

      // Supplier block (sample data from provided PO)
      y -= 25;
      page1.drawText("Supplier", { x: 50, y, size: 12, font: boldFont });
      y -= 15;
      page1.drawText("REMET METAL SANAYI VE TICARET LIMITED SIRKETI", {
        x: 50,
        y,
        size: 9,
        font,
      });
      y -= 12;
      page1.drawText(
        "KUSTEPE MAH. MECIDIYEKOY YOLU CAD. TRUMP TOWER NO:12 IC KAPI NO:377",
        { x: 50, y, size: 8, font }
      );
      y -= 12;
      page1.drawText("Mecidiyekoy-Sisli Istanbul 34287, Turkiye", { x: 50, y, size: 8, font });
      y -= 12;
      page1.drawText("Contact person: Ibrahim CELEP", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("E-mail: export@remet.com.tr", { x: 50, y, size: 9, font });

      // Order details
      y -= 25;
      page1.drawText("Order Details", { x: 50, y, size: 12, font: boldFont });
      y -= 15;
      page1.drawText("Transport method: Container", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("Country of material origin: Turkiye", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("Delivery location: Riga", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("Quotational period: Not Specified", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("Delivery terms: CIF", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText(
        "Payment terms: 100% Prepayment against Proforma/Invoice",
        { x: 50, y, size: 9, font }
      );

      // Product table
      y -= 25;
      page1.drawText("Description", { x: 50, y, size: 9, font: boldFont });
      page1.drawText("Quantity", { x: 200, y, size: 9, font: boldFont });
      page1.drawText("Format", { x: 280, y, size: 9, font: boldFont });
      page1.drawText("Unit price", { x: 360, y, size: 9, font: boldFont });
      page1.drawText("Amount", { x: 460, y, size: 9, font: boldFont });
      y -= 2;
      page1.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1 });
      y -= 15;
      page1.drawText("Brass Honey 3%", { x: 50, y, size: 9, font });
      page1.drawText("22.00 MT", { x: 200, y, size: 9, font });
      page1.drawText("Not Specified", { x: 280, y, size: 9, font });
      page1.drawText("USD 5989/MT", { x: 360, y, size: 9, font });
      page1.drawText("USD 131758", { x: 460, y, size: 9, font });

      // Total
      y -= 25;
      page1.drawText("Total (excl. VAT): USD 131758", {
        x: 50,
        y,
        size: 10,
        font: boldFont,
      });

      // Terms sentence and return instruction
      y -= 25;
      page1.drawText(
        "This order will be executed on METYCLE GmbH's Terms and Conditions (see attached) or as specified in detail above.",
        { x: 50, y, size: 8, font, maxWidth: 495 }
      );
      y -= 20;
      page1.drawText(
        "Please return a countersigned copy of the order, along with loading schedule to operations@metycle.com.",
        { x: 50, y, size: 8, font, maxWidth: 495 }
      );

      // Signatures
      y -= 30;
      page1.drawText("Signatures", { x: 50, y, size: 12, font: boldFont });
      y -= 20;
      page1.drawText("METYCLE GmbH", { x: 50, y, size: 10, font });
      y -= 12;
      page1.drawText("Date, place, signature: ____________________________", {
        x: 50,
        y,
        size: 9,
        font,
      });
      y -= 25;
      page1.drawText("REMET METAL SANAYI VE TICARET LIMITED SIRKETI /", {
        x: 50,
        y,
        size: 9,
        font,
      });
      y -= 12;
      page1.drawText("Ibrahim CELEP", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("Date, place, signature: ____________________________", {
        x: 50,
        y,
        size: 9,
        font,
      });

      // Contact information block above footer
      y -= 30;
      page1.drawText("Contact Information", { x: 50, y, size: 10, font: boldFont });
      y -= 15;
      page1.drawText("METYCLE GmbH", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("Venloer Str. 301-303 | 50823 Cologne, Germany", { x: 50, y, size: 8, font });
      y -= 12;
      page1.drawText("Managing Directors: Rafael Suchan, Sebastian Brenner", {
        x: 50,
        y,
        size: 8,
        font,
      });
      y -= 12;
      page1.drawText("Bank: Deutsche Bank", { x: 50, y, size: 8, font });
      y -= 12;
      page1.drawText("IBAN: DE51 1007 0100 0327 4412 01 | BIC: DEUTDEBB101", {
        x: 50,
        y,
        size: 8,
        font,
      });
      y -= 12;
      page1.drawText("Bank: Sparkasse KolnBonn", { x: 50, y, size: 8, font });
      y -= 12;
      page1.drawText("IBAN: DE17 3705 0198 1936 9898 11 | BIC: COLSDE33XXX", {
        x: 50,
        y,
        size: 8,
        font,
      });

      // Footer bar with legal info
      page1.drawRectangle({ x: 0, y: 0, width: 595, height: 60, color: rgb(0.22, 0.22, 0.22) });
      page1.drawText("METYCLE GmbH | Venloer Str. 301-303 | 50823 Cologne, Germany", {
        x: 50,
        y: 45,
        size: 7,
        font,
        color: rgb(1, 1, 1),
      });
      page1.drawText("Managing Directors: Rafael Suchan, Sebastian Brenner", {
        x: 50,
        y: 35,
        size: 7,
        font,
        color: rgb(1, 1, 1),
      });
      page1.drawText(
        "Bank: Deutsche Bank | IBAN: DE51 1007 0100 0327 4412 01 | BIC: DEUTDEBB101",
        { x: 50, y: 25, size: 7, font, color: rgb(1, 1, 1) }
      );
      page1.drawText(
        "Bank: Sparkasse KolnBonn | IBAN: DE17 3705 0198 1936 9898 11 | BIC: COLSDE33XXX",
        { x: 50, y: 15, size: 7, font, color: rgb(1, 1, 1) }
      );
      page1.drawText("VAT-ID: DE354945597 | Company Register: Cologne, HRB 110770", {
        x: 50,
        y: 5,
        size: 7,
        font,
        color: rgb(1, 1, 1),
      });

      // -------- Pages 2-4: General Terms and Conditions of Purchase --------
      const addTermsPage = (pageNum: number, content: string[]) => {
        const page = pdfDoc.addPage([595, 842]);
        page.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: rgb(0.14, 0.33, 0.34) });
        page.drawText("METYCLE GmbH", { x: 50, y: 815, size: 10, font: boldFont, color: rgb(1, 1, 1) });
        page.drawText("General Terms and Conditions of Purchase", {
          x: 50,
          y: 800,
          size: 8,
          font,
          color: rgb(1, 1, 1),
        });

        let y = 760;
        for (const line of content) {
          if (y < 80) break;
          page.drawText(line, { x: 50, y, size: 8, font, maxWidth: 495 });
          y -= 12;
        }

        page.drawRectangle({ x: 0, y: 0, width: 595, height: 20, color: rgb(0.22, 0.22, 0.22) });
        page.drawText(`Page ${pageNum} of 4`, {
          x: 270,
          y: 8,
          size: 7,
          font,
          color: rgb(1, 1, 1),
        });
      };

      const terms1 = [
        "1. SCOPE",
        "1.1. These are the General Terms and Conditions of Purchase (\"GTC Purchase\") of METYCLE GmbH,",
        "registered with the Commercial Register of Cologne under HRB 110770.",
        "1.2. These GTC Purchase govern the purchase of scrap metal (\"Product\") by METYCLE from a supplier.",
        "1.3. METYCLE provides its offer only to Sellers that are entrepreneurs.",
        "",
        "2. OBJECT OF THE CONTRACT",
        "2.1. METYCLE purchases the Product from Seller. Seller delivers the Product to an agreed place of delivery.",
        "",
        "3. PRICES AND TERMS OF PAYMENT",
        "3.1. The Parties agree upon the price for the Product in each purchase order.",
        "3.2. Unless otherwise agreed, the currency is US-Dollar.",
        "3.3. Payment shall be due within 30 days after delivery and receipt of an accurate invoice.",
        "3.4. Payments shall be made by wire transfer to Seller's bank account.",
        "",
        "4. DELIVERY AND SHIPPING TERMS",
        "4.1. The delivery shall be effected according to FCA Incoterms 2020.",
        "4.2. All delivery dates stated in METYCLE's purchase order are binding.",
      ];

      const terms2 = [
        "5. INSPECTION, DEFECTS' NOTIFICATION",
        "5.1. The obligation to inspect and give notice of defects applies with the proviso that",
        "the obligation of METYCLE to inspect is limited to defects that are openly apparent.",
        "",
        "6. LIABILITY FOR DEFECTS, WARRANTIES",
        "6.1. Seller warrants that the Product:",
        "- complies with all applicable laws and regulations,",
        "- complies with all specifications of the purchase order,",
        "- is free from rights of third parties.",
        "",
        "7. LIABILITY IN GENERAL",
        "7.1. METYCLE assumes unlimited liability for willful intent and gross negligence.",
        "7.2. Liability for breaches is restricted to damages typical for this type of contract.",
        "",
        "8. CONFIDENTIALITY",
        "8.1. Each Party is obliged to treat the other Party's Confidential Information as strictly",
        "confidential and only to use such information for fulfilling contractual obligations.",
      ];

      const terms3 = [
        "9. DATA PROTECTION",
        "9.1. METYCLE treats the Seller's personal data in accordance with data protection laws.",
        "9.2. Seller is obliged to comply with applicable data protection laws.",
        "",
        "10. FINAL PROVISIONS",
        "10.1. All declarations and amendments must be submitted in text form (e.g., e-mail).",
        "10.2. These GTC Purchase shall be governed by the laws of the Federal Republic of Germany",
        "(excluding the UN Convention on Contracts for the International Sale of Goods).",
        "10.3. Cologne shall be the exclusive place of jurisdiction for all disputes.",
      ];

      addTermsPage(2, terms1);
      addTermsPage(3, terms2);
      addTermsPage(4, terms3);

      const pdfBytes = await pdfDoc.save();
      return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
    };

    const createSalesOrderPDF = async (orderId: string) => {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // -------- Page 1: Sales Order --------
      const page1 = pdfDoc.addPage([595, 842]);
      let y = 800;

      // Header bar with METYCLE address
      page1.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: rgb(0.14, 0.33, 0.34) });
      page1.drawText("METYCLE GmbH", { x: 50, y: 815, size: 10, font: boldFont, color: rgb(1, 1, 1) });
      page1.drawText("Venloer Str. 301-303, 50823 Cologne, Germany", {
        x: 50,
        y: 802,
        size: 8,
        font,
        color: rgb(1, 1, 1),
      });

      // Title & basic info
      y = 760;
      page1.drawText("Sales Order", { x: 50, y, size: 18, font: boldFont });
      y -= 30;
      page1.drawText(`Order number: ${orderId}`, { x: 50, y, size: 10, font });
      y -= 15;
      page1.drawText(`Document date: ${new Date().toISOString().split("T")[0]}`, {
        x: 50,
        y,
        size: 10,
        font,
      });

      // Seller (METYCLE)
      y -= 30;
      page1.drawText("Seller", { x: 50, y, size: 12, font: boldFont });
      y -= 15;
      page1.drawText("METYCLE GmbH", { x: 50, y, size: 10, font });
      y -= 12;
      page1.drawText("Venloer Str. 301-303", { x: 50, y, size: 10, font });
      y -= 12;
      page1.drawText("50823 Cologne - Germany", { x: 50, y, size: 10, font });
      y -= 12;
      page1.drawText("Commercial Register: Cologne, HRB 110770", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("EORI Number: DE853113866728686", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("VAT Number: DE354945597", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("Contact: contracts@metycle.com", { x: 50, y, size: 9, font });

      // Purchaser (sample from provided SO)
      y -= 25;
      page1.drawText("Purchaser", { x: 50, y, size: 12, font: boldFont });
      y -= 15;
      page1.drawText("METALEKSPO SIA", { x: 50, y, size: 10, font });
      y -= 12;
      page1.drawText("Rencenu iela 32, Latgale Suburb, Riga, Latvia 1073 Riga", {
        x: 50,
        y,
        size: 8,
        font,
      });
      y -= 12;
      page1.drawText("Latvia", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("Contact person: Sergejs Timofejevs", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("E-mail: sergejs.timofejevs@metalekspo.lv", { x: 50, y, size: 9, font });

      // Order details
      y -= 25;
      page1.drawText("Order details", { x: 50, y, size: 12, font: boldFont });
      y -= 15;
      page1.drawText("Transport method: Container", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("Delivery terms: CIF", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("Delivery location: Riga", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText(
        "Payment terms: 20% in advance, balance in 10 days after delivery to Riga port",
        { x: 50, y, size: 9, font, maxWidth: 495 }
      );

      // Product table
      y -= 25;
      page1.drawText("Description", { x: 50, y, size: 9, font: boldFont });
      page1.drawText("Quantity", { x: 200, y, size: 9, font: boldFont });
      page1.drawText("Format", { x: 280, y, size: 9, font: boldFont });
      page1.drawText("Unit price", { x: 360, y, size: 9, font: boldFont });
      page1.drawText("Amount", { x: 460, y, size: 9, font: boldFont });
      y -= 2;
      page1.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1 });
      y -= 15;
      page1.drawText("Brass Honey 3%", { x: 50, y, size: 9, font });
      page1.drawText("22.00 MT", { x: 200, y, size: 9, font });
      page1.drawText("Not Specified", { x: 280, y, size: 9, font });
      page1.drawText("USD 6177.00/MT", { x: 360, y, size: 9, font });
      page1.drawText("USD 135894.00", { x: 460, y, size: 9, font });

      // Total
      y -= 25;
      page1.drawText("Total (excl. VAT): USD 135894.00", {
        x: 50,
        y,
        size: 10,
        font: boldFont,
      });

      // Terms sentence
      y -= 25;
      page1.drawText(
        "This order will be executed on METYCLE GmbH's Terms and Conditions (see attached) or as specified in detail above.",
        { x: 50, y, size: 8, font, maxWidth: 495 }
      );

      // Signatures
      y -= 30;
      page1.drawText("Signatures", { x: 50, y, size: 12, font: boldFont });
      y -= 20;
      page1.drawText("METYCLE GmbH", { x: 50, y, size: 10, font });
      y -= 12;
      page1.drawText("Date, place, signature: ____________________________", {
        x: 50,
        y,
        size: 9,
        font,
      });
      y -= 25;
      page1.drawText("METALEKSPO SIA / Sergejs Timofejevs", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("Date, place, signature: ____________________________", {
        x: 50,
        y,
        size: 9,
        font,
      });

      // Contact information block above footer
      y -= 30;
      page1.drawText("Contact Information", { x: 50, y, size: 10, font: boldFont });
      y -= 15;
      page1.drawText("METYCLE GmbH", { x: 50, y, size: 9, font });
      y -= 12;
      page1.drawText("Venloer Str. 301-303 | 50823 Cologne, Germany", { x: 50, y, size: 8, font });
      y -= 12;
      page1.drawText("Managing Directors: Rafael Suchan, Sebastian Brenner", {
        x: 50,
        y,
        size: 8,
        font,
      });
      y -= 12;
      page1.drawText("Bank: Deutsche Bank", { x: 50, y, size: 8, font });
      y -= 12;
      page1.drawText("IBAN: DE51 1007 0100 0327 4412 01 | BIC: DEUTDEBB101", {
        x: 50,
        y,
        size: 8,
        font,
      });
      y -= 12;
      page1.drawText("Bank: Sparkasse KolnBonn", { x: 50, y, size: 8, font });
      y -= 12;
      page1.drawText("IBAN: DE17 3705 0198 1936 9898 11 | BIC: COLSDE33XXX", {
        x: 50,
        y,
        size: 8,
        font,
      });

      // Footer bar with legal info
      page1.drawRectangle({ x: 0, y: 0, width: 595, height: 60, color: rgb(0.22, 0.22, 0.22) });
      page1.drawText("METYCLE GmbH | Venloer Str. 301-303 | 50823 Cologne, Germany", {
        x: 50,
        y: 45,
        size: 7,
        font,
        color: rgb(1, 1, 1),
      });
      page1.drawText("Managing Directors: Rafael Suchan, Sebastian Brenner", {
        x: 50,
        y: 35,
        size: 7,
        font,
        color: rgb(1, 1, 1),
      });
      page1.drawText("VAT-ID: DE354945597 | Company Register: Cologne, HRB 110770", {
        x: 50,
        y: 25,
        size: 7,
        font,
        color: rgb(1, 1, 1),
      });

      // (Optional) Additional pages could include General Terms and Conditions of Sale
      const pdfBytes = await pdfDoc.save();
      return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
    };

    // Create and upload Sales Order
    const soBlob = await createSalesOrderPDF(orderId);
    const soPath = `orders/${orderId}/sample-sales-order-${Date.now()}.pdf`;
    
    const { error: soUploadError } = await supabase.storage
      .from("company-documents")
      .upload(soPath, soBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (soUploadError) {
      throw new Error(`Failed to upload Sales Order: ${soUploadError.message}`);
    }

    const { data: soUrl } = supabase.storage
      .from("company-documents")
      .getPublicUrl(soPath);

    // Create and upload Purchase Order
    const poBlob = await createPurchaseOrderPDF(orderId);
    const poPath = `orders/${orderId}/sample-purchase-order-${Date.now()}.pdf`;
    
    const { error: poUploadError } = await supabase.storage
      .from("company-documents")
      .upload(poPath, poBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (poUploadError) {
      throw new Error(`Failed to upload Purchase Order: ${poUploadError.message}`);
    }

    const { data: poUrl } = supabase.storage
      .from("company-documents")
      .getPublicUrl(poPath);

    // Update order with document URLs
    const { error: updateError } = await supabase
      .from("order")
      .update({
        sales_order_url: soUrl.publicUrl,
        purchase_order_url: poUrl.publicUrl,
      })
      .eq("id", orderId);

    if (updateError) {
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        salesOrderUrl: soUrl.publicUrl,
        purchaseOrderUrl: poUrl.publicUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error creating sample documents:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
