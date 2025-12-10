import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FileText, Calendar, DollarSign, Building2, Info, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AddPaymentDialog } from "./AddPaymentDialog";
import { DeleteWithReasonDialog } from "@/components/DeleteWithReasonDialog";
import { softDeletePayment } from "@/hooks/useDeleteEntity";
import type { ControlPaymentRow } from "./PaymentsTable";

type InvoiceDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: ControlPaymentRow | null;
  loadingDate?: string | null;
  eta?: string | null;
  ata?: string | null;
  onPaymentAdded?: () => void;
};

export function InvoiceDetailDrawer({
  open,
  onOpenChange,
  invoice,
  loadingDate,
  eta,
  ata,
  onPaymentAdded,
}: InvoiceDetailDrawerProps) {
  const queryClient = useQueryClient();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);

  // Fetch full invoice details
  const { data: invoiceDetails } = useQuery({
    queryKey: ["invoice-details", invoice?.invoice_id],
    queryFn: async () => {
      if (!invoice?.invoice_id) return null;
      const { data, error } = await supabase
        .from("invoice")
        .select("*")
        .eq("id", invoice.invoice_id)
        .is("deleted_at", null)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!invoice?.invoice_id && open,
  });

  // Fetch payments for this invoice
  const { data: payments, refetch: refetchPayments } = useQuery({
    queryKey: ["invoice-payments", invoice?.invoice_id],
    queryFn: async () => {
      if (!invoice?.invoice_id) return [];
      const { data, error } = await supabase
        .from("payment")
        .select("*")
        .eq("invoice_id", invoice.invoice_id)
        .is("deleted_at", null)
        .order("paid_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!invoice?.invoice_id && open,
  });

  const formatCurrency = (value: number | null, currency: string | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDueDateExplanation = () => {
    if (!invoiceDetails) return null;
    const invoiceType = invoiceDetails.invoice_type?.toLowerCase();
    
    if (invoiceType === "downpayment") {
      return `Due date calculated: Loading Date (${formatDate(loadingDate)}) + payment terms offset`;
    } else if (invoiceType === "final" || invoiceType === "provisional") {
      const triggerDate = ata || eta;
      const triggerLabel = ata ? "ATA" : "ETA";
      return `Due date calculated: ${triggerLabel} (${formatDate(triggerDate)}) + offset days = ${formatDate(invoiceDetails.actual_due_date)}`;
    }
    return null;
  };

  const outstanding = (invoice?.total_amount || 0) - (invoice?.total_amount_paid || 0);

  // Handle payment deletion
  const handleDeletePayment = async (reason: string) => {
    if (!deletePaymentId || !invoice?.invoice_id) return;
    
    setIsDeletingPayment(true);
    try {
      await softDeletePayment(deletePaymentId, reason);
      
      toast.success("Payment deleted successfully");
      
      // Refetch payments
      refetchPayments();
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["invoice-payments"] });
      queryClient.invalidateQueries({ queryKey: ["control-payments"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      
      onPaymentAdded?.();
    } catch (error: any) {
      toast.error("Failed to delete payment: " + error.message);
    } finally {
      setIsDeletingPayment(false);
      setDeletePaymentId(null);
    }
  };

  if (!invoice) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Details
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6">
            {/* Invoice Information Block */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Invoice Information
                </h3>
                <Badge variant="outline">{invoiceDetails?.status || invoice.status || "—"}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Invoice Number</Label>
                  <p className="font-medium">{invoiceDetails?.invoice_number || invoice.invoice_number || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Invoice Type</Label>
                  <p className="font-medium">{invoiceDetails?.invoice_type || invoice.invoice_type || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Direction</Label>
                  <p className="font-medium">{invoiceDetails?.invoice_direction || invoice.invoice_direction || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Order ID</Label>
                  <p className="font-medium">{invoiceDetails?.order_id || invoice.order_id || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">BL Order</Label>
                  <p className="font-medium">{invoiceDetails?.bl_order_name || invoice.bl_order_name || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Company</Label>
                  <p className="font-medium">{invoiceDetails?.company_name || invoice.company_name || "—"}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Currency</Label>
                  <p className="font-medium">{invoiceDetails?.currency || invoice.currency || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Amount %</Label>
                  <p className="font-medium">{invoiceDetails?.["amount_%"] ? `${invoiceDetails["amount_%"]}%` : "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Amount (MT)</Label>
                  <p className="font-medium">{invoiceDetails?.amount_qt_mt ? `${invoiceDetails.amount_qt_mt} MT` : "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Total Amount</Label>
                  <p className="font-bold text-lg">{formatCurrency(invoiceDetails?.total_amount || invoice.total_amount, invoice.currency)}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Issue Date</Label>
                  <p className="font-medium">{formatDate(invoiceDetails?.issue_date)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Original Due Date</Label>
                  <p className="font-medium">{formatDate(invoiceDetails?.original_due_date || invoice.original_due_date)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Actual Due Date</Label>
                  <p className="font-medium">{formatDate(invoiceDetails?.actual_due_date || invoice.actual_due_date)}</p>
                </div>
              </div>

              {/* Due Date Explanation */}
              {getDueDateExplanation() && (
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">{getDueDateExplanation()}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Payments Block */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Payments
                </h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600">
                    Paid: {formatCurrency(invoice.total_amount_paid, invoice.currency)}
                  </span>
                  <span className="text-orange-600">
                    Outstanding: {formatCurrency(outstanding, invoice.currency)}
                  </span>
                </div>
              </div>

              {payments && payments.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Type</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Paid Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Bank Ref</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.payment_type || "—"}</TableCell>
                          <TableCell>{payment.payment_direction || "—"}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(payment.total_amount_paid, payment.currency)}
                          </TableCell>
                          <TableCell>{formatDate(payment.paid_date)}</TableCell>
                          <TableCell className="max-w-[100px] truncate">{payment.reference_note || "—"}</TableCell>
                          <TableCell className="max-w-[100px] truncate">{payment.bank_reference || "—"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeletePaymentId(payment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground border rounded-lg">
                  <DollarSign className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No payments recorded</p>
                </div>
              )}

              {/* Add Payment Button */}
              <Button onClick={() => setPaymentDialogOpen(true)} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Payment Dialog */}
      <AddPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={invoice}
        onSuccess={() => {
          setPaymentDialogOpen(false);
          refetchPayments();
          onPaymentAdded?.();
        }}
      />

      {/* Delete Payment Confirmation */}
      <DeleteWithReasonDialog
        entityLabel="Payment"
        open={deletePaymentId !== null}
        onOpenChange={(open) => !open && setDeletePaymentId(null)}
        onConfirm={handleDeletePayment}
        isDeleting={isDeletingPayment}
      />
    </>
  );
}
