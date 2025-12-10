import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Updates Purchase Order and Sales Order templates to fix logo styling
 * - Adds proper gradient background to logo circle
 * - Ensures consistent header bar height
 */
export async function updateTemplateLogoGradient(): Promise<boolean> {
  try {
    // Fetch current templates
    const { data: templates, error: fetchError } = await supabase
      .from("document_templates")
      .select("id, name, content")
      .in("name", ["Sales Order", "Purchase Order"]);

    if (fetchError || !templates) {
      throw new Error("Failed to fetch templates");
    }

    for (const template of templates) {
      let content = template.content;
      let updated = false;

      // Fix the logo-icon CSS - add gradient background and ensure proper styling
      // The exact pattern from the database
      const oldLogoIconCss = `.logo-icon { width: 36px; height: 36px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; text-transform: lowercase; }`;
      
      const newLogoIconCss = `.logo-icon { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%); border: 2px solid rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px; text-transform: lowercase; color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }`;

      if (content.includes(oldLogoIconCss)) {
        content = content.replace(oldLogoIconCss, newLogoIconCss);
        updated = true;
      } else {
        // Try generic replacement for any .logo-icon definition
        const genericPattern = /\.logo-icon\s*\{[^}]*width:\s*36px[^}]*\}/g;
        if (genericPattern.test(content)) {
          content = content.replace(genericPattern, newLogoIconCss);
          updated = true;
        }
      }

      // Also fix top-bar to have slightly more padding for better proportions
      const oldTopBar = `.top-bar { background: #245356; color: #ffffff; padding: 18px 35px;`;
      const newTopBar = `.top-bar { background: #245356; color: #ffffff; padding: 22px 35px;`;
      
      if (content.includes(oldTopBar)) {
        content = content.replace(oldTopBar, newTopBar);
        updated = true;
      }

      if (updated) {
        // Update in database
        const { error: updateError } = await supabase
          .from("document_templates")
          .update({ content, updated_at: new Date().toISOString() })
          .eq("id", template.id);

        if (updateError) {
          throw new Error(`Failed to update ${template.name}: ${updateError.message}`);
        }

        console.log(`✅ Updated ${template.name} with fixed logo styling`);
      } else {
        console.log(`ℹ️ ${template.name} already has updated styling or pattern not found`);
      }
    }

    toast.success("Templates updated with fixed logo styling");
    return true;
  } catch (error) {
    console.error("Error updating templates:", error);
    toast.error("Failed to update templates");
    return false;
  }
}
