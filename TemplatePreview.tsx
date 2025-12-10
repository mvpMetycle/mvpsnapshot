import { ScrollArea } from "@/components/ui/scroll-area";
import { TemplateEngine } from "@/lib/templateEngine";
import { useMemo } from "react";

interface TemplatePreviewProps {
  content: string;
}

export const TemplatePreview = ({ content }: TemplatePreviewProps) => {
  const previewHtml = useMemo(() => {
    try {
      return TemplateEngine.previewTemplate(content);
    } catch (error) {
      return `<div style="color: red; padding: 20px;">Error processing template: ${error instanceof Error ? error.message : "Unknown error"}</div>`;
    }
  }, [content]);

  // CSS overrides to ensure .page elements have fixed height and don't push content
  const pageConstraintStyles = `
    <style>
      .page {
        height: 1123px !important;
        min-height: 1123px !important;
        max-height: 1123px !important;
        overflow: hidden !important;
        page-break-after: always;
        position: relative;
      }
      .page .content {
        overflow: hidden !important;
        max-height: calc(1123px - 120px) !important; /* Account for header/footer */
      }
    </style>
  `;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border bg-muted/30">
        <h4 className="text-lg font-semibold text-foreground">Live Preview</h4>
        <p className="text-xs text-muted-foreground mt-0.5">Rendered with sample data</p>
      </div>
      <ScrollArea className="flex-1">
        <div 
          className="p-8 bg-background"
          dangerouslySetInnerHTML={{ __html: pageConstraintStyles + previewHtml }}
        />
      </ScrollArea>
    </div>
  );
};
