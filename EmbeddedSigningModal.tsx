import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmbeddedSigningModalProps {
  signingLink: string | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (payload: any) => void;
  documentName?: string;
}

export const EmbeddedSigningModal = ({
  signingLink,
  isOpen,
  onClose,
  onComplete,
  documentName = "Document",
}: EmbeddedSigningModalProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    if (isOpen && signingLink) {
      setIsLoading(true);
      setIframeError(false);

      // Listen for PandaDoc completion events
      const handleMessage = (event: MessageEvent) => {
        // Verify origin is from PandaDoc
        if (event.origin.includes("pandadoc.com")) {
          console.log("PandaDoc event:", event.data);

          // Handle completion event
          if (event.data?.type === "session_view.document.completed") {
            if (onComplete) {
              onComplete(event.data);
            }
            onClose();
          }
        }
      };

      window.addEventListener("message", handleMessage);

      return () => {
        window.removeEventListener("message", handleMessage);
      };
    }
  }, [isOpen, signingLink, onComplete, onClose]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setIframeError(true);
  };

  const openInNewTab = () => {
    if (signingLink) {
      window.open(signingLink, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sign Document</DialogTitle>
          <DialogDescription>
            Review and sign {documentName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {iframeError ? (
            <Alert>
              <AlertDescription className="space-y-4">
                <p>Unable to load the embedded signing interface.</p>
                <Button onClick={openInNewTab} variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in New Tab
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            signingLink && (
              <iframe
                src={signingLink}
                className="w-full h-full border-0 rounded-md"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title="PandaDoc Signing"
                allow="camera; microphone"
              />
            )
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={openInNewTab} size="sm">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in New Tab
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
