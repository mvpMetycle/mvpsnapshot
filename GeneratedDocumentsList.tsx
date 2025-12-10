import { useState } from "react";
import { FileText, Download, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PdfViewerModal } from "@/components/PdfViewerModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface GeneratedDocument {
  id: string;
  document_name: string;
  document_url: string;
  generated_at: string;
  document_templates: {
    name: string;
    category: string;
  };
}

interface GeneratedDocumentsListProps {
  documents: GeneratedDocument[];
  onDelete: (documentId: string) => void;
}

// Helper to extract file path from Supabase storage URL
const extractFilePath = (url: string): string | null => {
  try {
    const match = url.match(/\/bl-documents\/(.+)$/);
    if (match) {
      return decodeURIComponent(match[1].split('?')[0]);
    }
    // Also handle full URLs
    const urlObj = new URL(url);
    const fullMatch = urlObj.pathname.match(/\/bl-documents\/(.+)$/);
    return fullMatch ? decodeURIComponent(fullMatch[1]) : null;
  } catch {
    return null;
  }
};

export const GeneratedDocumentsList = ({ documents, onDelete }: GeneratedDocumentsListProps) => {
  const [viewingDoc, setViewingDoc] = useState<GeneratedDocument | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (doc: GeneratedDocument) => {
    setDownloadingId(doc.id);
    try {
      const filePath = extractFilePath(doc.document_url);
      if (!filePath) {
        toast.error("Invalid document URL");
        return;
      }

      const { data, error } = await supabase.storage
        .from("bl-documents")
        .download(filePath);

      if (error) throw error;

      const downloadUrl = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = doc.document_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success("Document downloaded");
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    } finally {
      setDownloadingId(null);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No documents generated yet</p>
        <p className="text-sm text-muted-foreground mt-1">Generate your first document from a template</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-[600px]">
        <div className="space-y-2 p-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground truncate">{doc.document_name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {doc.document_templates.name}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {doc.document_templates.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Generated {format(new Date(doc.generated_at), "MMM dd, yyyy 'at' HH:mm")}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingDoc(doc)}
                    title="View Document"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc.id}
                    title="Download"
                  >
                    {downloadingId === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${doc.document_name}"?`)) {
                        onDelete(doc.id);
                      }
                    }}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {viewingDoc && (
        <PdfViewerModal
          isOpen={!!viewingDoc}
          onClose={() => setViewingDoc(null)}
          pdfUrl={viewingDoc.document_url}
          documentName={viewingDoc.document_name}
          onDownload={() => handleDownload(viewingDoc)}
        />
      )}
    </>
  );
};
