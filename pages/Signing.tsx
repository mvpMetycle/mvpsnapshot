import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSignature, Send, Download, ExternalLink, RefreshCw, FileText, Trash2, RotateCcw } from "lucide-react";
import { EmbeddedSigningModal } from "@/components/EmbeddedSigningModal";
import { PdfViewerModal } from "@/components/PdfViewerModal";
import { pandadocService } from "@/services/pandadocService";
import { toast } from "sonner";
import { SignatureStatusBadge } from "@/components/SignatureStatusBadge";
import { DeleteWithReasonDialog } from "@/components/DeleteWithReasonDialog";
import { DocumentGenerationService } from "@/services/documentGenerationService";

export default function Signing() {
  const [showSigningModal, setShowSigningModal] = useState(false);
  const [currentSigningLink, setCurrentSigningLink] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
  const [currentPdfName, setCurrentPdfName] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'generated' | 'pandadoc'; item: any } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: signatures, isLoading, refetch } = useQuery({
    queryKey: ["all-document-signatures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_signatures")
        .select("*")
        .in("document_type", ["sales_order", "purchase_order"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Query for generated documents (orders with PDFs but no signature records)
  const { data: generatedDocs, isLoading: isLoadingGenerated, refetch: refetchGenerated } = useQuery({
    queryKey: ["generated-documents"],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("order")
        .select("id, buyer, seller, sales_order_url, purchase_order_url")
        .or("sales_order_url.not.is.null,purchase_order_url.not.is.null");

      if (error) throw error;

      // Get all signature record references
      const { data: existingSignatures } = await supabase
        .from("document_signatures")
        .select("reference_id, document_type");

      const signatureMap = new Set(
        existingSignatures?.map(s => `${s.reference_id}-${s.document_type}`) || []
      );

      // Filter out orders that already have signatures
      const docsToUpload: Array<{
        orderId: string;
        documentType: 'sales_order' | 'purchase_order';
        documentUrl: string;
        documentName: string;
        counterpartyName: string;
      }> = [];

      orders?.forEach(order => {
        if (order.sales_order_url && !signatureMap.has(`${order.id}-sales_order`)) {
          docsToUpload.push({
            orderId: order.id,
            documentType: 'sales_order',
            documentUrl: order.sales_order_url,
            documentName: `Sales_Order_${order.id}`,
            counterpartyName: order.buyer || 'Customer',
          });
        }
        if (order.purchase_order_url && !signatureMap.has(`${order.id}-purchase_order`)) {
          docsToUpload.push({
            orderId: order.id,
            documentType: 'purchase_order',
            documentUrl: order.purchase_order_url,
            documentName: `Purchase_Order_${order.id}`,
            counterpartyName: order.seller || 'Supplier',
          });
        }
      });

      return docsToUpload;
    },
  });

  const handleUploadToPandaDoc = async (doc: any) => {
    try {
      toast.loading("Uploading to PandaDoc...");
      await pandadocService.uploadToPandaDoc({
        documentUrl: doc.documentUrl,
        documentName: doc.documentName,
        documentType: doc.documentType,
        referenceId: doc.orderId,
        counterpartyName: doc.counterpartyName,
      });
      
      toast.dismiss();
      toast.success("Document uploaded to PandaDoc!");
      refetchGenerated();
      refetch();
    } catch (error: any) {
      toast.dismiss();
      toast.error("Failed to upload to PandaDoc", {
        description: error.message,
      });
    }
  };

  const handleMetycleSign = async (signature: any) => {
    try {
      // Get Metycle recipient (first in the array)
      const metycleRecipient = signature.recipients?.[0];
      if (!metycleRecipient) {
        toast.error("No Metycle recipient found");
        return;
      }

      // Create PandaDoc document if not already created
      if (!signature.pandadoc_document_id) {
        toast.loading("Creating document in PandaDoc...");
        await pandadocService.createSigningRequest({
          signatureId: signature.id, // Pass existing signature ID to update it
          documentUrl: signature.document_url,
          documentName: signature.document_name,
          documentType: signature.document_type,
          referenceId: signature.reference_id,
          referenceTable: signature.reference_table,
          recipients: signature.recipients,
        });
        
        // Refetch signature to get pandadoc_document_id
        await refetch();
        toast.dismiss();
        toast.success("Document created! Please click Sign again.");
        return;
      }

      const signingLink = await pandadocService.getSigningLink(
        signature.id,
        metycleRecipient.email
      );
      
      setSelectedDocument(signature);
      setCurrentSigningLink(signingLink);
      setShowSigningModal(true);
    } catch (error: any) {
      toast.error("Failed to open signing interface", {
        description: error.message,
      });
    }
  };

  const handleSendToCounterparty = async (signature: any) => {
    try {
      await pandadocService.sendDocument(signature.id, {
        subject: `Please sign: ${signature.document_name}`,
        message: "Please review and sign this document.",
      });
      
      toast.success("Document sent to counterparty!");
      refetch();
    } catch (error: any) {
      toast.error("Failed to send document", {
        description: error.message,
      });
    }
  };

  const handleDownload = async (url: string, filename?: string) => {
    try {
      toast.loading("Downloading document...");
      
      // Fetch the file as a blob
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Create a blob URL and trigger download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || url.split('/').pop() || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
      
      toast.dismiss();
      toast.success("Document downloaded!");
    } catch (error: any) {
      toast.dismiss();
      toast.error("Download failed", {
        description: error.message,
      });
    }
  };

  const handleViewPdf = (url: string, documentName: string) => {
    setCurrentPdfUrl(url);
    setCurrentPdfName(documentName);
    setShowPdfViewer(true);
  };

  const handleRefreshStatus = async (signature: any) => {
    try {
      toast.loading("Checking document status...");
      await pandadocService.getStatus(signature.id);
      await refetch();
      toast.dismiss();
      toast.success("Status updated!");
    } catch (error: any) {
      toast.dismiss();
      toast.error("Failed to refresh status", {
        description: error.message,
      });
    }
  };

  // Delete generated document (clear URL from order)
  const handleDeleteGeneratedDoc = async (reason: string) => {
    if (!deleteTarget || deleteTarget.type !== 'generated') return;
    
    setIsDeleting(true);
    try {
      const doc = deleteTarget.item;
      const updateField = doc.documentType === 'sales_order' 
        ? { sales_order_url: null } 
        : { purchase_order_url: null };
      
      const { error } = await supabase
        .from("order")
        .update(updateField)
        .eq("id", doc.orderId);

      if (error) throw error;

      toast.success("Document removed successfully");
      refetchGenerated();
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error("Failed to delete document: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete document signature record
  const handleDeleteSignature = async (reason: string) => {
    if (!deleteTarget || deleteTarget.type !== 'pandadoc') return;
    
    setIsDeleting(true);
    try {
      const signature = deleteTarget.item;
      
      const { error } = await supabase
        .from("document_signatures")
        .delete()
        .eq("id", signature.id);

      if (error) throw error;

      toast.success("Document signature removed successfully");
      refetch();
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error("Failed to delete document: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (type: 'generated' | 'pandadoc', item: any) => {
    setDeleteTarget({ type, item });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (reason: string) => {
    if (deleteTarget?.type === 'generated') {
      await handleDeleteGeneratedDoc(reason);
    } else if (deleteTarget?.type === 'pandadoc') {
      await handleDeleteSignature(reason);
    }
  };

  // Regenerate document (only for documents not yet sent for signatures)
  const handleRegenerateDocument = async (doc: { orderId: string; documentType: 'sales_order' | 'purchase_order' }) => {
    try {
      const templateName = doc.documentType === 'sales_order' ? 'Sales Order' : 'Purchase Order';
      toast.loading(`Regenerating ${templateName}...`);
      
      await DocumentGenerationService.generateOrderDocument({
        templateName: templateName as 'Sales Order' | 'Purchase Order',
        orderId: doc.orderId,
      });
      
      toast.dismiss();
      toast.success(`${templateName} regenerated successfully!`);
      refetchGenerated();
    } catch (error: any) {
      toast.dismiss();
      toast.error("Failed to regenerate document", {
        description: error.message,
      });
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case "sales_order":
        return "Sales Order";
      case "purchase_order":
        return "Purchase Order";
      default:
        return type;
    }
  };

  const isMetycleSigned = (signature: any) => {
    // Check if Metycle (first recipient) has signed
    return signature.status === "sent" || signature.status === "completed";
  };

  const canSendToCounterparty = (signature: any) => {
    // Can send to counterparty if Metycle has signed but not yet sent
    return isMetycleSigned(signature) && signature.status !== "completed";
  };

  if (isLoading || isLoadingGenerated) {
    return <div className="p-6">Loading signatures...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Document Signing</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Generated Documents</div>
            <div className="text-2xl font-bold">{generatedDocs?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Documents</div>
            <div className="text-2xl font-bold">{signatures?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Awaiting Metycle</div>
            <div className="text-2xl font-bold">
              {signatures?.filter(s => s.status === "draft").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Pending Counterparty</div>
            <div className="text-2xl font-bold">
              {signatures?.filter(s => s.status === "sent").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Completed</div>
            <div className="text-2xl font-bold">
              {signatures?.filter(s => s.status === "completed").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generated Documents (Ready to Upload) */}
      {generatedDocs && generatedDocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generated Documents (Ready to Upload)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedDocs.map((doc, idx) => (
                  <TableRow key={`${doc.orderId}-${doc.documentType}-${idx}`}>
                    <TableCell className="font-medium">{doc.documentName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {doc.documentType === 'sales_order' ? 'Sales Order' : 'Purchase Order'}
                      </Badge>
                    </TableCell>
                    <TableCell>{doc.orderId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewPdf(doc.documentUrl, doc.documentName)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRegenerateDocument(doc)}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Regenerate
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUploadToPandaDoc(doc)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Upload to PandaDoc
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog('generated', doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Documents in PandaDoc */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Documents in PandaDoc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reference ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!signatures || signatures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No documents for signing. Generate SO/PO from orders first.
                </TableCell>
              </TableRow>
            ) : (
              signatures.map((signature) => (
                <TableRow key={signature.id}>
                  <TableCell className="font-medium">
                    {signature.document_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getDocumentTypeLabel(signature.document_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>{signature.reference_id}</TableCell>
                  <TableCell>
                    <SignatureStatusBadge status={signature.status} />
                  </TableCell>
                  <TableCell>
                    {new Date(signature.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* Metycle Sign */}
                      {signature.status === "draft" && (
                        <Button
                          size="sm"
                          onClick={() => handleMetycleSign(signature)}
                        >
                          <FileSignature className="h-4 w-4 mr-2" />
                          Sign (Metycle)
                        </Button>
                      )}

                      {/* Send to Counterparty */}
                      {canSendToCounterparty(signature) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendToCounterparty(signature)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send to Counterparty
                        </Button>
                      )}

                      {/* Refresh Status - show only if not completed */}
                      {signature.pandadoc_document_id && signature.status !== "completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRefreshStatus(signature)}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Check Status
                        </Button>
                      )}

                      {/* Download if completed */}
                      {signature.status === "completed" && signature.signed_document_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(signature.signed_document_url, signature.document_name + '-signed.pdf')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Signed
                        </Button>
                      )}

                      {/* View Original */}
                      {signature.document_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewPdf(signature.document_url, signature.document_name)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      )}

                      {/* Delete */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog('pandadoc', signature)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
          </div>
        </CardContent>
      </Card>

      {/* Embedded Signing Modal */}
      <EmbeddedSigningModal
        signingLink={currentSigningLink}
        isOpen={showSigningModal}
        onClose={() => {
          setShowSigningModal(false);
          setCurrentSigningLink(null);
          setSelectedDocument(null);
        }}
        onComplete={() => {
          refetch();
          setShowSigningModal(false);
          setCurrentSigningLink(null);
          setSelectedDocument(null);
        }}
        documentName={selectedDocument?.document_name || ""}
      />

      {/* PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={showPdfViewer}
        onClose={() => {
          setShowPdfViewer(false);
          setCurrentPdfUrl(null);
          setCurrentPdfName("");
        }}
        pdfUrl={currentPdfUrl || ""}
        documentName={currentPdfName}
        onDownload={currentPdfUrl ? () => handleDownload(currentPdfUrl, currentPdfName + '.pdf') : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteWithReasonDialog
        entityLabel={
          deleteTarget?.type === 'generated' 
            ? `generated document "${deleteTarget.item?.documentName}"` 
            : `document signature "${deleteTarget?.item?.document_name}"`
        }
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
