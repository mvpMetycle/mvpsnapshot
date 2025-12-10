import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SendForSignatureButton } from "./SendForSignatureButton";
import { SignatureStatusBadge } from "./SignatureStatusBadge";
import { EmbeddedSigningModal } from "./EmbeddedSigningModal";
import { PdfViewerModal } from "./PdfViewerModal";
import { Button } from "./ui/button";
import { Download, FileSignature, ExternalLink } from "lucide-react";
import { pandadocService, Recipient, SigningRequest } from "@/services/pandadocService";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DocumentSigningSectionProps {
  documentUrl: string | null;
  documentName: string;
  documentType: 'purchase_order' | 'sales_order' | 'bl_document' | 'company_document';
  referenceId: string;
  referenceTable: string;
  recipients: Recipient[];
  onSigningComplete?: () => void;
  showUploadStatus?: boolean;
}

// Helper to extract bucket name and file path from Supabase storage URL
const extractStorageInfo = (url: string): { bucket: string; filePath: string } | null => {
  try {
    const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:\?|$)/);
    if (match) {
      return {
        bucket: match[1],
        filePath: match[2]
      };
    }
    return null;
  } catch {
    return null;
  }
};

export const DocumentSigningSection = ({
  documentUrl,
  documentName,
  documentType,
  referenceId,
  referenceTable,
  recipients,
  onSigningComplete,
  showUploadStatus = true,
}: DocumentSigningSectionProps) => {
  const [showSigningModal, setShowSigningModal] = useState(false);
  const [currentSigningLink, setCurrentSigningLink] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  // Fetch signatures for this document
  const { data: signatures, refetch: refetchSignatures } = useQuery({
    queryKey: ["document-signatures", referenceTable, referenceId, documentType],
    queryFn: () => pandadocService.getSignaturesForReference(referenceTable, referenceId),
  });

  // Find the signature for this specific document type
  const signature = signatures?.find((s) => s.document_type === documentType);

  const handleSigningSuccess = (signingRequest: SigningRequest) => {
    refetchSignatures();
    if (onSigningComplete) {
      onSigningComplete();
    }
  };

  const handleSignNow = async () => {
    if (!signature?.id) return;

    try {
      // Get embedded signing link for the first recipient
      const signingLink = await pandadocService.getSigningLink(
        signature.id,
        recipients[0].email
      );
      setCurrentSigningLink(signingLink);
      setShowSigningModal(true);
    } catch (error: any) {
      toast.error("Failed to open signing interface", {
        description: error.message,
      });
    }
  };

  const handleDownloadSigned = async () => {
    if (!signature?.signed_document_url) return;
    
    setIsDownloading(true);
    try {
      const storageInfo = extractStorageInfo(signature.signed_document_url);
      if (!storageInfo) {
        // If it's an external URL (like PandaDoc), open directly
        window.open(signature.signed_document_url, "_blank");
        return;
      }

      const { data, error } = await supabase.storage
        .from(storageInfo.bucket)
        .download(storageInfo.filePath);

      if (error) throw error;

      const downloadUrl = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${documentName}_signed.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success("Signed document downloaded");
    } catch (error: any) {
      console.error("Download signed error:", error);
      // Fallback to direct open for external URLs
      window.open(signature.signed_document_url, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleViewOriginal = () => {
    if (!documentUrl) {
      toast.error("Document URL not available");
      return;
    }
    setShowPdfViewer(true);
  };

  const handleDownloadOriginal = async () => {
    if (!documentUrl) {
      toast.error("Document URL not available");
      return;
    }

    setIsDownloading(true);
    try {
      const storageInfo = extractStorageInfo(documentUrl);
      if (!storageInfo) {
        throw new Error("Could not extract file path from URL");
      }

      const { data, error } = await supabase.storage
        .from(storageInfo.bucket)
        .download(storageInfo.filePath);

      if (error) throw error;

      const downloadUrl = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${documentName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success("Document downloaded successfully");
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error("Failed to download document", {
        description: error.message,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showUploadStatus && (
            <>
              {documentUrl ? (
                <span className="text-sm text-muted-foreground">
                  ✓ Uploaded
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Not uploaded
                </span>
              )}
            </>
          )}
          
          {signature && (
            <SignatureStatusBadge status={signature.status} />
          )}
        </div>

        <div className="flex items-center gap-2">
          {documentUrl && (!signature || !signature.pandadoc_document_id) && (
            <SendForSignatureButton
              documentUrl={documentUrl}
              documentName={documentName}
              documentType={documentType}
              referenceId={referenceId}
              referenceTable={referenceTable}
              recipients={recipients}
              signatureId={signature?.id}
              onSuccess={handleSigningSuccess}
              size="sm"
            />
          )}

          {signature && signature.pandadoc_document_id && signature.status !== "completed" && signature.status !== "declined" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignNow}
            >
              <FileSignature className="mr-2 h-4 w-4" />
              Sign Now
            </Button>
          )}

          {signature?.status === "completed" && signature.signed_document_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSigned}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Signed
            </Button>
          )}

          {documentUrl && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewOriginal}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadOriginal}
                disabled={isDownloading}
              >
                <Download className="mr-2 h-4 w-4" />
                {isDownloading ? "Downloading..." : "Download"}
              </Button>
            </>
          )}
        </div>
      </div>

      <EmbeddedSigningModal
        signingLink={currentSigningLink}
        isOpen={showSigningModal}
        onClose={() => setShowSigningModal(false)}
        onComplete={() => {
          refetchSignatures();
          if (onSigningComplete) {
            onSigningComplete();
          }
        }}
        documentName={documentName}
      />

      {documentUrl && (
        <PdfViewerModal
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
          pdfUrl={documentUrl}
          documentName={documentName}
          onDownload={handleDownloadOriginal}
        />
      )}
    </div>
  );
};
