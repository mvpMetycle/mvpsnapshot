import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Trash2, FileText, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// Helper to generate Google Docs viewer URL for PDF preview (bypasses Chrome blocking)
const getGoogleDocsViewerUrl = (pdfUrl: string): string => {
  return `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
};

export type BLInvoiceType = "provisional" | "final" | "credit_note" | "debit_note";

type BLInvoiceCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceType: BLInvoiceType;
  side: "buy" | "sell";
  blOrderId: number;
  blOrderName: string;
  orderId: string | null;
  prefillData: {
    company_name: string | null;
    currency: string | null;
    amount_qt_mt: number | null;
    unit_price: number | null;
    total_amount: number | null;
  };
  orderAllocatedQuantityMt?: number | null;
  onSaved: () => void;
};

const INVOICE_STATUSES = ["Draft", "Pending", "Sent", "Paid", "Overdue", "Cancelled"];
const NOTE_REASONS = ["Claim", "Quantity Difference", "Provisional Difference", "Other"];

const INVOICE_TYPE_LABELS: Record<BLInvoiceType, string> = {
  provisional: "Provisional Invoice",
  final: "Final Invoice",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
};

export function BLInvoiceCreateDialog({
  open,
  onOpenChange,
  invoiceType,
  side,
  blOrderId,
  blOrderName,
  orderId,
  prefillData,
  orderAllocatedQuantityMt,
  onSaved,
}: BLInvoiceCreateDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const direction = side === "buy" ? "payable" : "receivable";
  const title = `Create ${INVOICE_TYPE_LABELS[invoiceType]} - ${side === "buy" ? "Buy Side (Payable)" : "Sell Side (Receivable)"}`;
  const isNoteType = invoiceType === "credit_note" || invoiceType === "debit_note";

  // Form state
  const [formData, setFormData] = useState<{
    invoice_number: string | null;
    company_name: string | null;
    currency: string | null;
    amount_qt_mt: number | null;
    unit_price: number | null;
    total_amount: number | null;
    issue_date: string | null;
    original_due_date: string | null;
    status: string;
    file_url: string | null;
    note_reason: string | null;
    notes: string | null;
    paid_date: string | null;
  }>({
    invoice_number: null,
    company_name: null,
    currency: null,
    amount_qt_mt: null,
    unit_price: null,
    total_amount: null,
    issue_date: null,
    original_due_date: null,
    status: "Draft",
    file_url: null,
    note_reason: null,
    notes: null,
    paid_date: null,
  });

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        invoice_number: null,
        company_name: prefillData.company_name,
        currency: prefillData.currency || "USD",
        amount_qt_mt: prefillData.amount_qt_mt,
        unit_price: prefillData.unit_price,
        total_amount: prefillData.total_amount,
        issue_date: new Date().toISOString().split("T")[0],
        original_due_date: null,
        status: "Draft",
        file_url: null,
        note_reason: null,
        notes: null,
        paid_date: null,
      });
    }
  }, [open, prefillData]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Recalculate total if qty or price changes
      if ((field === "amount_qt_mt" || field === "unit_price") && !isNoteType) {
        const qty = field === "amount_qt_mt" ? value : prev.amount_qt_mt;
        const price = field === "unit_price" ? value : prev.unit_price;
        if (qty != null && price != null) {
          updated.total_amount = qty * price;
        }
      }
      return updated;
    });
  };

  // Save invoice
  const saveInvoice = async () => {
    // Validate paid_date is required when status is Paid
    if (formData.status?.toLowerCase() === 'paid' && !formData.paid_date) {
      toast.error("Paid Date is required when status is Paid");
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = {
        bl_order_name: blOrderName,
        order_id: orderId,
        invoice_direction: direction,
        invoice_type: INVOICE_TYPE_LABELS[invoiceType],
        invoice_number: formData.invoice_number,
        company_name: formData.company_name,
        currency: formData.currency,
        amount_qt_mt: formData.amount_qt_mt,
        total_amount: formData.total_amount,
        issue_date: formData.issue_date,
        original_due_date: formData.original_due_date,
        status: formData.status,
        file_url: formData.file_url,
      };

      const { data: newInvoice, error } = await supabase
        .from("invoice")
        .insert(dataToSave)
        .select('id')
        .single();
      if (error) throw error;

      // If status is Paid and paid_date is provided, create payment record
      if (formData.status?.toLowerCase() === 'paid' && formData.paid_date && newInvoice?.id) {
        await createPaymentRecord(newInvoice.id);
      }

      toast.success(`${INVOICE_TYPE_LABELS[invoiceType]} created`);
      queryClient.invalidateQueries({ queryKey: ["invoices", "bl", blOrderName] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Create payment record when invoice is marked as paid
  const createPaymentRecord = async (invoiceId: number) => {
    // Determine payment type based on invoice type
    const paymentTypeMap: Record<string, 'Downpayment' | 'Provisional' | 'Final' | 'Credit Note' | 'Debit Note'> = {
      'provisional': 'Provisional',
      'final': 'Final',
      'credit_note': 'Credit Note',
      'debit_note': 'Debit Note',
    };

    const paymentData = {
      invoice_id: invoiceId,
      paid_date: formData.paid_date,
      total_amount_paid: formData.total_amount,
      payment_direction: direction,
      company_name: formData.company_name,
      currency: formData.currency,
      payment_type: paymentTypeMap[invoiceType] || 'Final',
      reference_note: `Payment for invoice ${formData.invoice_number || invoiceId}`,
    };

    const { error } = await supabase
      .from('payment')
      .insert(paymentData);
    if (error) throw error;
  };

  // Upload PDF
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${blOrderName}_${side}_${invoiceType}_${Date.now()}.${fileExt}`;
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

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: formData.currency || "USD",
    }).format(value);
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
                placeholder={`${invoiceType.toUpperCase()}-001`}
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

            {!isNoteType && (
              <>
                <div>
                  <Label className="text-sm">Quantity (MT)</Label>
                  <Input
                    type="number"
                    value={formData.amount_qt_mt || ""}
                    onChange={(e) => handleFieldChange("amount_qt_mt", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label className="text-sm">Unit Price</Label>
                  <Input
                    type="number"
                    value={formData.unit_price || ""}
                    onChange={(e) => handleFieldChange("unit_price", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.00"
                  />
                </div>
              </>
            )}

            {isNoteType && (
              <div>
                <Label className="text-sm">Reason</Label>
                <Select value={formData.note_reason || ""} onValueChange={(v) => handleFieldChange("note_reason", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-sm">Total Amount</Label>
              <Input
                type="number"
                value={formData.total_amount || ""}
                onChange={(e) => handleFieldChange("total_amount", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0.00"
              />
              {!isNoteType && formData.amount_qt_mt && formData.unit_price && (
                <p className="text-xs text-muted-foreground mt-1">
                  Calculated: {formData.amount_qt_mt} MT × {formatCurrency(formData.unit_price)} = {formatCurrency(formData.total_amount)}
                </p>
              )}
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
              <Label className="text-sm">Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleFieldChange("status", v)}>
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

            {isNoteType && (
              <div>
                <Label className="text-sm">Notes</Label>
                <Textarea
                  value={formData.notes || ""}
                  onChange={(e) => handleFieldChange("notes", e.target.value || null)}
                  placeholder="Additional notes..."
                  rows={3}
                />
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
                <iframe 
                  src={getGoogleDocsViewerUrl(formData.file_url)} 
                  className="w-full h-full" 
                  title="Invoice PDF Preview" 
                />
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

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={saveInvoice} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create {INVOICE_TYPE_LABELS[invoiceType]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
