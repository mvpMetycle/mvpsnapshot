import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DocumentGenerationService } from "@/services/documentGenerationService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PdfViewerModal } from "@/components/PdfViewerModal";
import {
  FileText,
  Download,
  Eye,
  Loader2,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

// Helper to extract file path from full Supabase storage URL
const extractFilePath = (url: string): string | null => {
  try {
    // Handle full URLs with potential query params
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const match = pathname.match(/\/bl-documents\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    // Fallback for relative paths or malformed URLs
    const match = url.match(/\/bl-documents\/([^?]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
};

// Template names we want to show for BL-level generation
const BL_TEMPLATES = [
  "Certificate of Origin",
  "Freight Certificate",
  "Non-Radioactive and No War Certificate",
  "Packing List",
];

interface BLDocumentGenerationProps {
  blOrderId: number;
  blOrder?: {
    bl_url: string | null;
    bl_number: string | null;
    bl_order_name: string | null;
  };
  onViewBL?: () => void;
  onDownloadBL?: () => void;
}

interface GeneratedDoc {
  id: string;
  template_id: string;
  bl_order_id: number;
  document_name: string;
  document_url: string | null;
  generated_at: string | null;
  document_templates: {
    name: string;
    category: string;
  } | null;
}

export function BLDocumentGeneration({ blOrderId, blOrder, onViewBL, onDownloadBL }: BLDocumentGenerationProps) {
  const queryClient = useQueryClient();
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [generatingTemplates, setGeneratingTemplates] = useState<Set<string>>(new Set());
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{ url: string; name: string } | null>(null);

  // View generated document using PdfViewerModal (uses Google Docs proxy to bypass Chrome blocking)
  const handleViewGeneratedDoc = (documentUrl: string, documentName: string) => {
    // Construct full Supabase URL if needed
    const fullUrl = documentUrl.startsWith('http') 
      ? documentUrl 
      : `https://tbwkhqvrqhagoswehrkx.supabase.co/storage/v1/object/public/bl-documents/${documentUrl}`;
    
    setViewingDocument({ url: fullUrl, name: documentName });
    setPdfViewerOpen(true);
  };

  // Download generated document using Supabase SDK
  const handleDownloadGeneratedDoc = async (documentUrl: string, documentName: string) => {
    try {
      const filePath = extractFilePath(documentUrl);
      if (!filePath) {
        toast.error("Invalid document URL");
        return;
      }
      
      const { data, error } = await supabase.storage
        .from('bl-documents')
        .download(filePath);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Document downloaded");
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error("Failed to download document");
    }
  };

  // Fetch available templates
  const { data: templates } = useQuery({
    queryKey: ["bl-document-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("id, name, category")
        .eq("is_active", true)
        .in("name", BL_TEMPLATES);

      if (error) throw error;
      return data;
    },
  });

  // Fetch already generated documents for this BL Order
  const { data: generatedDocs, refetch: refetchDocs } = useQuery({
    queryKey: ["generated-documents-bl", blOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_documents")
        .select("*, document_templates(name, category)")
        .eq("bl_order_id", blOrderId);

      if (error) throw error;
      return data as GeneratedDoc[];
    },
    enabled: !!blOrderId,
  });

  // Map template name to generated doc
  const generatedByTemplate = (generatedDocs || []).reduce((acc, doc) => {
    if (doc.document_templates?.name) {
      acc[doc.document_templates.name] = doc;
    }
    return acc;
  }, {} as Record<string, GeneratedDoc>);

  // Generate a single document
  const handleGenerate = async (templateId: string, templateName: string) => {
    setGeneratingTemplates((prev) => new Set(prev).add(templateName));

    try {
      const result = await DocumentGenerationService.generateDocument({
        templateId,
        blOrderId,
      });

      toast.success(`${templateName} generated successfully`);
      queryClient.invalidateQueries({ queryKey: ["generated-documents-bl", blOrderId] });

      // Open the document in viewer modal instead of new tab (avoids browser blocking)
      if (result.url) {
        const fullUrl = result.url.startsWith('http') 
          ? result.url 
          : `https://tbwkhqvrqhagoswehrkx.supabase.co/storage/v1/object/public/bl-documents/${result.url}`;
        setViewingDocument({ url: fullUrl, name: templateName });
        setPdfViewerOpen(true);
      }
    } catch (error: any) {
      console.error("Error generating document:", error);
      toast.error(`Failed to generate ${templateName}: ${error.message}`);
    } finally {
      setGeneratingTemplates((prev) => {
        const next = new Set(prev);
        next.delete(templateName);
        return next;
      });
    }
  };

  // Generate all selected documents
  const handleGenerateSelected = async () => {
    if (selectedTemplates.size === 0) {
      toast.error("Please select at least one template");
      return;
    }

    const templatesToGenerate = templates?.filter((t) => selectedTemplates.has(t.name)) || [];

    for (const template of templatesToGenerate) {
      await handleGenerate(template.id, template.name);
    }

    setSelectedTemplates(new Set());
  };

  // Toggle template selection
  const toggleTemplate = (templateName: string) => {
    setSelectedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(templateName)) {
        next.delete(templateName);
      } else {
        next.add(templateName);
      }
      return next;
    });
  };

  // Sort templates to show BL_TEMPLATES order

  // Sort templates to show BL_TEMPLATES order
  const sortedTemplates = templates?.sort((a, b) => {
    return BL_TEMPLATES.indexOf(a.name) - BL_TEMPLATES.indexOf(b.name);
  }) || [];

  return (
    <div className="space-y-4">
      {/* Header with Generate Selected button */}
      {selectedTemplates.size > 0 && (
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
          <span className="text-sm text-muted-foreground">
            {selectedTemplates.size} template{selectedTemplates.size > 1 ? "s" : ""} selected
          </span>
          <Button size="sm" onClick={handleGenerateSelected}>
            Generate Selected
          </Button>
        </div>
      )}

      {/* Unified Document List */}
      <div className="space-y-2">
        {/* Bill of Lading - First in the list */}
        {blOrder && (
          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <Checkbox disabled checked={false} className="opacity-50" />
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Bill of Lading</p>
                {blOrder.bl_url && (
                  <p className="text-xs text-muted-foreground">Uploaded</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {blOrder.bl_url ? (
                <>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Uploaded
                  </Badge>
                  <button
                    onClick={onViewBL}
                    className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={onDownloadBL}
                    className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Not Uploaded
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Generated Document Templates */}
        {sortedTemplates.map((template) => {
          const generatedDoc = generatedByTemplate[template.name];
          const isGenerating = generatingTemplates.has(template.name);
          const isSelected = selectedTemplates.has(template.name);

          return (
            <div
              key={template.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
            >
              {/* Left: Checkbox + Name */}
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleTemplate(template.name)}
                  disabled={isGenerating}
                />
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{template.name}</p>
                  {generatedDoc && (
                    <p className="text-xs text-muted-foreground">
                      Generated{" "}
                      {generatedDoc.generated_at
                        ? new Date(generatedDoc.generated_at).toLocaleDateString()
                        : ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Status + Actions */}
              <div className="flex items-center gap-2">
                {generatedDoc ? (
                  <>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Generated
                    </Badge>
                    {generatedDoc.document_url && (
                      <button
                        onClick={() => handleViewGeneratedDoc(generatedDoc.document_url!, generatedDoc.document_name)}
                        className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {generatedDoc.document_url && (
                      <button
                        onClick={() => handleDownloadGeneratedDoc(generatedDoc.document_url!, generatedDoc.document_name)}
                        className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGenerate(template.id, template.name)}
                      disabled={isGenerating}
                      title="Regenerate"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleGenerate(template.id, template.name)}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate"
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {sortedTemplates.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No document templates found. Please create templates in the Documentation section.
          </div>
        )}
      </div>

      {/* PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={pdfViewerOpen}
        onClose={() => {
          setPdfViewerOpen(false);
          setViewingDocument(null);
        }}
        pdfUrl={viewingDocument?.url || ""}
        documentName={viewingDocument?.name || "Document"}
        onDownload={viewingDocument ? () => handleDownloadGeneratedDoc(viewingDocument.url, viewingDocument.name) : undefined}
      />
    </div>
  );
}
