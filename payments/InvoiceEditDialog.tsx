import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Trash2, FileText, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

// Helper to extract bucket and path from Supabase URL
const parseSupabaseUrl = (url: string) => {
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^\/]+)\/(.+)/);
  if (match) {
    return { bucket: match[1], filePath: decodeURIComponent(match[2].split('?')[0]) };
  }
  return null;
};

type InvoiceRow = {
  id: number;
  invoice_type: string | null;
  invoice_number: string | null;
  "amount_%": number | null;
  total_amount: number | null;
  issue_date: string | null;
  original_due_date: string | null;
  actual_due_date: string | null;
  invoice_direction: string | null;
  company_name: string | null;
  currency: string | null;
  order_id: string | null;
  status: string | null;
  file_url: string | null;
};

type InvoiceEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: "buy" | "sell";
  orderId: string;
  invoice: InvoiceRow | null | undefined;
  defaultValues: {
    invoice_number: string;
    company_name: string;
    currency: string;
    "amount_%": number | null;
    total_amount: number | null;
    issue_date: string | null;
    original_due_date: string | null;
    actual_due_date: string | null;
    status: string;
  };
  onSaved: () => void;
};

const INVOICE_STATUSES = ["Draft", "Pending", "Sent", "Paid", "Overdue", "Cancelled"];

export function InvoiceEditDialog({
  open,
  onOpenChange,
  side,
  orderId,
  invoice,
  defaultValues,
  onSaved,
}: InvoiceEditDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  const direction = side === "buy" ? "payable" : "receivable";
  const title = side === "buy" ? "Buy Side Invoice (Payable)" : "Sell Side Invoice (Receivable)";

  // Form state
  const [formData, setFormData] = useState<{
    invoice_number: string | null;
    company_name: string | null;
    currency: string | null;
    "amount_%": number | null;
    total_amount: number | null;
    issue_date: string | null;
    original_due_date: string | null;
    actual_due_date: string | null;
    status: string | null;
    file_url: string | null;
    paid_date: string | null;
  }>({
    invoice_number: null,
    company_name: null,
    currency: null,
    "amount_%": null,
    total_amount: null,
    issue_date: null,
    original_due_date: null,
    actual_due_date: null,
    status: null,
    file_url: null,
    paid_date: null,
  });

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      if (invoice) {
        // Use existing invoice data
        setFormData({
          invoice_number: invoice.invoice_number,
          company_name: invoice.company_name,
          currency: invoice.currency,
          "amount_%": invoice["amount_%"],
          total_amount: invoice.total_amount,
          issue_date: invoice.issue_date,
          original_due_date: invoice.original_due_date,
          actual_due_date: invoice.actual_due_date,
          status: invoice.status,
          file_url: invoice.file_url,
          paid_date: null, // Will be loaded from payment if exists
        });
        // Load existing paid_date from payment table if invoice is paid
        if (invoice.id && invoice.status?.toLowerCase() === 'paid') {
          loadPaidDate(invoice.id);
        }
      } else {
        // Use defaults from ticket/order
        setFormData({
          ...defaultValues,
          file_url: null,
          paid_date: null,
        });
      }
    }
  }, [open, invoice, defaultValues]);

  // Load paid_date from existing payment record
  const loadPaidDate = async (invoiceId: number) => {
    const { data } = await supabase
      .from('payment')
      .select('paid_date')
      .eq('invoice_id', invoiceId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data?.paid_date) {
      setFormData(prev => ({ ...prev, paid_date: data.paid_date }));
    }
  };

  // Generate signed URL for PDF viewing via Google Docs proxy
  useEffect(() => {
    const loadPdfViewer = async () => {
      if (!formData.file_url) {
        setPdfViewerUrl(null);
        return;
      }

      setIsLoadingPdf(true);
      try {
        const parsed = parseSupabaseUrl(formData.file_url);
        let signedUrl = formData.file_url;

        if (parsed) {
          const { data, error: signError } = await supabase.storage
            .from(parsed.bucket)
            .createSignedUrl(parsed.filePath, 600); // 10 minutes validity

          if (signError) throw signError;
          if (data?.signedUrl) {
            signedUrl = data.signedUrl;
          }
        }

        // Use Google Docs Viewer as proxy to bypass Chrome iframe restrictions
        const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(signedUrl)}&embedded=true`;
        setPdfViewerUrl(googleViewerUrl);
      } catch (err) {
        console.error("Error loading PDF:", err);
        setPdfViewerUrl(null);
      } finally {
        setIsLoadingPdf(false);
      }
    };

    loadPdfViewer();
  }, [formData.file_url]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Save invoice mutation
  const saveInvoice = async () => {
    // Validate paid_date is required when status is Paid
    if (formData.status?.toLowerCase() === 'paid' && !formData.paid_date) {
      toast.error("Paid Date is required when status is Paid");
      return;
    }

    setIsSaving(true);
    try {
      // Convert UI percent (e.g., 20) to DB decimal (e.g., 0.2) if needed
      const dataToSave = {
        invoice_number: formData.invoice_number,
        company_name: formData.company_name,
        currency: formData.currency,
        "amount_%": formData["amount_%"],
        total_amount: formData.total_amount,
        issue_date: formData.issue_date,
        original_due_date: formData.original_due_date,
        actual_due_date: formData.actual_due_date,
        status: formData.status,
        file_url: formData.file_url,
      };

      let invoiceId = invoice?.id;

      if (invoiceId) {
        // Update existing
        const { error } = await supabase.from("invoice").update(dataToSave).eq("id", invoiceId);
        if (error) throw error;
      } else {
        // Insert new
        const { data: newInvoice, error } = await supabase.from("invoice").insert({
          order_id: orderId,
          invoice_direction: direction,
          invoice_type: "Downpayment",
          ...dataToSave,
        }).select('id').single();
        if (error) throw error;
        invoiceId = newInvoice.id;
      }

      // If status is Paid and paid_date is provided, create/update payment record
      if (formData.status?.toLowerCase() === 'paid' && formData.paid_date && invoiceId) {
        await createOrUpdatePaymentRecord(invoiceId);
      }

      toast.success(invoice ? "Invoice saved" : "Invoice created");
      queryClient.invalidateQueries({ queryKey: ["downpayment-invoice-buy", orderId] });
      queryClient.invalidateQueries({ queryKey: ["downpayment-invoice-sell", orderId] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Create or update payment record when invoice is marked as paid
  const createOrUpdatePaymentRecord = async (invoiceId: number) => {
    // Check if payment record already exists for this invoice
    const { data: existingPayment } = await supabase
      .from('payment')
      .select('id')
      .eq('invoice_id', invoiceId)
      .is('deleted_at', null)
      .maybeSingle();

    const paymentData = {
      invoice_id: invoiceId,
      paid_date: formData.paid_date,
      total_amount_paid: formData.total_amount,
      payment_direction: direction,
      company_name: formData.company_name,
      currency: formData.currency,
      payment_type: 'Downpayment' as const,
      reference_note: `Payment for invoice ${formData.invoice_number || invoiceId}`,
    };

    if (existingPayment) {
      // Update existing payment
      const { error } = await supabase
        .from('payment')
        .update(paymentData)
        .eq('id', existingPayment.id);
      if (error) throw error;
    } else {
      // Create new payment
      const { error } = await supabase
        .from('payment')
        .insert(paymentData);
      if (error) throw error;
    }
  };

  // Upload PDF
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${orderId}_${side}_downpayment_${Date.now()}.${fileExt}`;
      const filePath = `invoices/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("bl-documents").upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("bl-documents").getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, file_url: urlData.publicUrl }));
      toast.success("PDF uploaded");
    } catch (error: any) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Delete PDF
  const handleDeletePdf = async () => {
    if (!formData.file_url) return;

    setIsDeleting(true);
    try {
      // Extract file path from URL
      const url = new URL(formData.file_url);
      const pathParts = url.pathname.split("/storage/v1/object/public/bl-documents/");
      if (pathParts.length > 1) {
        const filePath = pathParts[1];
        await supabase.storage.from("bl-documents").remove([filePath]);
      }

      setFormData((prev) => ({ ...prev, file_url: null }));
      toast.success("PDF deleted");
    } catch (error: any) {
      toast.error("Failed to delete PDF: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const isPaidStatus = formData.status?.toLowerCase() === 'paid';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
          {/* Left Column - Form */}
          <div className="overflow-y-auto pr-4 space-y-4">
            <div>
              <Label className="text-sm">Invoice Number</Label>
              <Input
                value={formData.invoice_number || ""}
                onChange={(e) => handleFieldChange("invoice_number", e.target.value || null)}
                placeholder="INV-001"
              />
            </div>

            <div>
              <Label className="text-sm">Company Name</Label>
              <Input
                value={formData.company_name || ""}
                onChange={(e) => handleFieldChange("company_name", e.target.value || null)}
                placeholder="Company name"
              />
            </div>

            <div>
              <Label className="text-sm">Currency</Label>
              <Select value={formData.currency || "USD"} onValueChange={(v) => handleFieldChange("currency", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CNY">CNY</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Amount %</Label>
              <Input
                type="number"
                value={formData["amount_%"] != null ? formData["amount_%"] * 100 : ""}
                onChange={(e) =>
                  handleFieldChange("amount_%", e.target.value ? parseFloat(e.target.value) / 100 : null)
                }
                placeholder="e.g. 20 for 20%"
              />
              <p className="text-xs text-muted-foreground mt-1">(e.g., 20 for 20%)</p>
            </div>

            <div>
              <Label className="text-sm">Total Amount</Label>
              <Input
                type="number"
                value={formData.total_amount || ""}
                onChange={(e) => handleFieldChange("total_amount", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label className="text-sm">Issue Date</Label>
              <Input
                type="date"
                value={formData.issue_date || ""}
                onChange={(e) => handleFieldChange("issue_date", e.target.value || null)}
              />
            </div>

            <div>
              <Label className="text-sm">Original Due Date</Label>
              <Input
                type="date"
                value={formData.original_due_date || ""}
                onChange={(e) => handleFieldChange("original_due_date", e.target.value || null)}
              />
            </div>

            <div>
              <Label className="text-sm">Actual Due Date</Label>
              <Input
                type="date"
                value={formData.actual_due_date || ""}
                onChange={(e) => handleFieldChange("actual_due_date", e.target.value || null)}
              />
            </div>

            <div>
              <Label className="text-sm">Status</Label>
              <Select value={formData.status || "Draft"} onValueChange={(v) => handleFieldChange("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Paid Date - shown when status is Paid */}
            {isPaidStatus && (
              <div>
                <Label className="text-sm">Paid Date <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={formData.paid_date || ""}
                  onChange={(e) => handleFieldChange("paid_date", e.target.value || null)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Required when status is Paid</p>
              </div>
            )}
          </div>

          {/* Right Column - PDF Preview */}
          <div className="border rounded-lg overflow-hidden flex flex-col bg-muted/20">
            <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
              <span className="text-sm font-medium">Invoice PDF</span>
              <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" className="hidden" />
                {formData.file_url && (
                  <Button variant="outline" size="sm" onClick={handleDeletePdf} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : formData.file_url ? (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  {formData.file_url ? "Re-upload" : "Upload PDF"}
                </Button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              {formData.file_url ? (
                isLoadingPdf ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading PDF...</p>
                  </div>
                ) : pdfViewerUrl ? (
                  <iframe 
                    src={pdfViewerUrl} 
                    className="w-full h-full border-0" 
                    title="Invoice PDF Preview"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                  />
                ) : (
                  <div className="text-center p-8">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-2">Unable to preview PDF</p>
                    <Button 
                      variant="secondary" 
                      onClick={() => window.open(formData.file_url!, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in new tab
                    </Button>
                  </div>
                )
              ) : (
                <div className="text-center p-8">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">No invoice uploaded yet</p>
                  <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload PDF
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center pt-4 border-t">
          <div>
            {formData.file_url && (
              <Button variant="destructive" onClick={handleDeletePdf} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete PDF
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={saveInvoice} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Invoice
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
