import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { ControlPaymentRow } from "./PaymentsTable";

type AddPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: ControlPaymentRow | null;
  onSuccess?: () => void;
};

export function AddPaymentDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: AddPaymentDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    total_amount_paid: "",
    paid_date: new Date().toISOString().split("T")[0],
    bank_reference: "",
    reference_note: "",
  });

  const outstanding = (invoice?.total_amount || 0) - (invoice?.total_amount_paid || 0);

  const createPaymentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!invoice?.invoice_id) throw new Error("No invoice selected");

      const paymentAmount = parseFloat(data.total_amount_paid);

      // Map invoice_type to valid payment_type_enum values
      const validPaymentTypes = ["Downpayment", "Provisional", "Final", "Credit Note", "Debit Note"] as const;
      const paymentType = validPaymentTypes.includes(invoice.invoice_type as any) 
        ? (invoice.invoice_type as typeof validPaymentTypes[number])
        : "Downpayment";

      // Insert payment
      const { error } = await supabase.from("payment").insert({
        invoice_id: invoice.invoice_id,
        payment_type: paymentType,
        payment_direction: invoice.invoice_direction,
        company_name: invoice.company_name,
        currency: invoice.currency,
        total_amount_paid: paymentAmount,
        paid_date: data.paid_date,
        bank_reference: data.bank_reference || null,
        reference_note: data.reference_note || null,
      });

      if (error) throw error;

      // Check if invoice is now fully paid and update status
      const newTotalPaid = (invoice.total_amount_paid || 0) + paymentAmount;
      const invoiceTotal = invoice.total_amount || 0;
      
      if (invoiceTotal > 0 && newTotalPaid >= invoiceTotal - 0.01) {
        // Update invoice status to "Paid"
        const { error: updateError } = await supabase
          .from("invoice")
          .update({ status: "Paid" })
          .eq("id", invoice.invoice_id);
        
        if (updateError) {
          console.error("Failed to update invoice status:", updateError);
        }
      }
    },
    onSuccess: () => {
      toast.success("Payment added successfully");
      queryClient.invalidateQueries({ queryKey: ["invoice-payments"] });
      queryClient.invalidateQueries({ queryKey: ["control-payments"] });
      queryClient.invalidateQueries({ queryKey: ["downpayment-payments-buy"] });
      queryClient.invalidateQueries({ queryKey: ["downpayment-payments-sell"] });
      queryClient.invalidateQueries({ queryKey: ["downpayment-invoice-buy"] });
      queryClient.invalidateQueries({ queryKey: ["downpayment-invoice-sell"] });
      setFormData({
        total_amount_paid: "",
        paid_date: new Date().toISOString().split("T")[0],
        bank_reference: "",
        reference_note: "",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error("Failed to add payment", { description: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.total_amount_paid || parseFloat(formData.total_amount_paid) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    createPaymentMutation.mutate(formData);
  };

  const formatCurrency = (value: number, currency: string | null) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pre-filled Invoice Info */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Invoice</Label>
              <p className="text-sm font-medium">{invoice.invoice_number || `INV-${invoice.invoice_id}`}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <p className="text-sm font-medium">{invoice.invoice_type || "—"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Company</Label>
              <p className="text-sm font-medium truncate">{invoice.company_name || "—"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Currency</Label>
              <p className="text-sm font-medium">{invoice.currency || "USD"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Total Amount</Label>
              <p className="text-sm font-medium">{formatCurrency(invoice.total_amount || 0, invoice.currency)}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Outstanding</Label>
              <p className="text-sm font-medium text-orange-600">{formatCurrency(outstanding, invoice.currency)}</p>
            </div>
          </div>

          {/* User Input Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.total_amount_paid}
                onChange={(e) => setFormData({ ...formData, total_amount_paid: e.target.value })}
                required
              />
              {outstanding > 0 && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setFormData({ ...formData, total_amount_paid: outstanding.toFixed(2) })}
                >
                  Pay full outstanding: {formatCurrency(outstanding, invoice.currency)}
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paid_date">Payment Date *</Label>
              <Input
                id="paid_date"
                type="date"
                value={formData.paid_date}
                onChange={(e) => setFormData({ ...formData, paid_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_reference">Bank Reference</Label>
              <Input
                id="bank_reference"
                placeholder="e.g., TRF-123456"
                value={formData.bank_reference}
                onChange={(e) => setFormData({ ...formData, bank_reference: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_note">Notes</Label>
              <Textarea
                id="reference_note"
                placeholder="Optional payment notes..."
                value={formData.reference_note}
                onChange={(e) => setFormData({ ...formData, reference_note: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPaymentMutation.isPending}>
              {createPaymentMutation.isPending ? "Adding..." : "Add Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
