import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Download, X, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  documentName: string;
  onDownload?: () => void;
}

// Helper to extract bucket and path from Supabase URL
const parseSupabaseUrl = (url: string) => {
  // Matches: .../storage/v1/object/public/BUCKET/PATH or .../storage/v1/object/sign/BUCKET/PATH
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^\/]+)\/(.+)/);
  if (match) {
    return { bucket: match[1], filePath: decodeURIComponent(match[2]) };
  }
  return null;
};

export const PdfViewerModal = ({
  isOpen,
  onClose,
  pdfUrl,
  documentName,
  onDownload,
}: PdfViewerModalProps) => {
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [directUrl, setDirectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !pdfUrl) {
      return;
    }

    const fetchSignedUrl = async () => {
      setIsLoading(true);
      setError(null);
      setViewerUrl(null);
      setDirectUrl(null);
      
      try {
        const parsed = parseSupabaseUrl(pdfUrl);
        let signedUrl = pdfUrl;
        
        if (parsed) {
          // Generate signed URL for Supabase storage files
          const { data, error: signError } = await supabase.storage
            .from(parsed.bucket)
            .createSignedUrl(parsed.filePath, 600); // 10 minutes validity
          
          if (signError) {
            throw new Error(signError.message);
          }
          
          if (data?.signedUrl) {
            signedUrl = data.signedUrl;
          } else {
            throw new Error("Failed to generate signed URL");
          }
        }
        
        // Store direct URL for "Open in new tab"
        setDirectUrl(signedUrl);
        
        // Use Google Docs Viewer as proxy to bypass Chrome iframe restrictions
        const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(signedUrl)}&embedded=true`;
        setViewerUrl(googleViewerUrl);
        
      } catch (err: any) {
        console.error("Error loading PDF:", err);
        setError(err.message || "Failed to load PDF");
        toast.error("Failed to load PDF", {
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [isOpen, pdfUrl]);

  const handleClose = () => {
    setViewerUrl(null);
    setDirectUrl(null);
    setError(null);
    onClose();
  };

  const handleOpenInNewTab = () => {
    if (directUrl) {
      window.open(directUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-4">{documentName}</DialogTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              {directUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenInNewTab}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in new tab
                </Button>
              )}
              {onDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogDescription className="sr-only">
            PDF document viewer for {documentName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 w-full min-h-0 overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
          {isLoading && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          )}
          
          {error && (
            <div className="flex flex-col items-center gap-4 text-destructive">
              <p className="text-sm font-medium">Failed to load PDF</p>
              <p className="text-xs text-muted-foreground">{error}</p>
              {pdfUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(pdfUrl, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Try opening directly
                </Button>
              )}
            </div>
          )}
          
          {viewerUrl && !isLoading && !error && (
            <iframe
              src={viewerUrl}
              className="w-full h-full border-0"
              title={`PDF viewer for ${documentName}`}
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
