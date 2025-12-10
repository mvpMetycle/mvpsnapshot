import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Updates Sales Order and Purchase Order templates with correct PandaDoc signature tags
 * Replaces old {signature__________} format with [s:Signer1] / [s:Signer2] format
 */
export async function updateTemplateSignatureTags() {
  try {
    console.log("🔧 Updating template signature tags...");

    // Fetch current templates
    const { data: templates, error: fetchError } = await supabase
      .from("document_templates")
      .select("id, name, content")
      .in("name", ["Sales Order", "Purchase Order"]);

    if (fetchError) throw fetchError;
    if (!templates || templates.length === 0) {
      throw new Error("Sales Order and Purchase Order templates not found");
    }

    // Update each template
    for (const template of templates) {
      let updatedContent = template.content;

      // Replace old signature tags with new PandaDoc format
      updatedContent = updatedContent
        .replace(
          /<span style="font-size: 1px; color: white;">\{signature__________\}<\/span>/g,
          '<span style="font-size: 12px; color: #ffffff; background: #ffffff;">[s:Signer1]</span>'
        )
        .replace(
          /<span style="font-size: 1px; color: white;">\{date______\}<\/span>/g,
          '<span style="font-size: 12px; color: #ffffff; background: #ffffff;">[d:Signer1]</span>'
        );

      // Add Signer2 tags for counterparty signature box
      if (template.name === "Sales Order") {
        // Find the purchaser signature box and add Signer2 tags
        updatedContent = updatedContent.replace(
          /(<p><strong>\{\{purchaser_name\}\} \/ \{\{purchaser_contact_name\}\}<\/strong><\/p>)\s*(<p style="margin-top: 20px;"><span[^>]*>\[s:Signer1\]<\/span><\/p>)/,
          '$1\n            <p style="margin-top: 20px;"><span style="font-size: 12px; color: #ffffff; background: #ffffff;">[s:Signer2]</span></p>\n            <p style="margin-top: 10px;">Date: <span style="font-size: 12px; color: #ffffff; background: #ffffff;">[d:Signer2]</span></p>'
        );
      } else if (template.name === "Purchase Order") {
        // Find the seller signature box and add Signer2 tags
        updatedContent = updatedContent.replace(
          /(<p><strong>\{\{seller_name\}\} \/ \{\{seller_contact_name\}\}<\/strong><\/p>)\s*(<p style="margin-top: 20px;"><span[^>]*>\[s:Signer1\]<\/span><\/p>)/,
          '$1\n            <p style="margin-top: 20px;"><span style="font-size: 12px; color: #ffffff; background: #ffffff;">[s:Signer2]</span></p>\n            <p style="margin-top: 10px;">Date: <span style="font-size: 12px; color: #ffffff; background: #ffffff;">[d:Signer2]</span></p>'
        );
      }

      // Update the template in the database
      const { error: updateError } = await supabase
        .from("document_templates")
        .update({ content: updatedContent })
        .eq("id", template.id);

      if (updateError) throw updateError;

      console.log(`✅ Updated ${template.name} with PandaDoc signature tags`);
    }

    toast.success("Templates updated with PandaDoc signature tags");
    return true;
  } catch (error) {
    console.error("❌ Error updating template signature tags:", error);
    toast.error("Failed to update templates: " + (error as Error).message);
    return false;
  }
}
