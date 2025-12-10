import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSignature, Loader2 } from "lucide-react";
import { pandadocService, CreateSigningRequestParams, SigningRequest } from "@/services/pandadocService";
import { toast } from "sonner";

interface SendForSignatureButtonProps extends CreateSigningRequestParams {
  onSuccess?: (signingRequest: SigningRequest) => void;
  onError?: (error: Error) => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
}

export const SendForSignatureButton = ({
  signatureId,
  documentUrl,
  documentName,
  documentType,
  referenceId,
  referenceTable,
  recipients,
  onSuccess,
  onError,
  variant = "outline",
  size = "sm",
  className,
  disabled = false,
}: SendForSignatureButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSendForSignature = async () => {
    if (!documentUrl) {
      toast.error("No document uploaded", {
        description: "Please upload a document before sending for signature.",
      });
      return;
    }

    if (recipients.length === 0) {
      toast.error("No recipients", {
        description: "Please specify at least one recipient.",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create signing request (or update existing one if signatureId provided)
      const signingRequest = await pandadocService.createSigningRequest({
        signatureId,
        documentUrl,
        documentName,
        documentType,
        referenceId,
        referenceTable,
        recipients,
      });

      // Automatically send for signature
      await pandadocService.sendForSignature(signingRequest.id, {
        subject: `Please sign: ${documentName}`,
        message: "Please review and sign this document.",
      });

      toast.success("Sent for signature", {
        description: `${documentName} has been sent to ${recipients.length} recipient(s).`,
      });

      if (onSuccess) {
        onSuccess(signingRequest);
      }
    } catch (error: any) {
      console.error("Error sending for signature:", error);
      
      toast.error("Failed to send for signature", {
        description: error.message || "An unexpected error occurred.",
      });

      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSendForSignature}
      disabled={disabled || isLoading || !documentUrl}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      ) : (
        <>
          <FileSignature className="mr-2 h-4 w-4" />
          Send for Signature
        </>
      )}
    </Button>
  );
};
