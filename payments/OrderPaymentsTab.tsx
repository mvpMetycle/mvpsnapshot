import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText } from "lucide-react";
import { PaymentsSummaryBar } from "./PaymentsSummaryBar";
import { PaymentsTable, type ControlPaymentRow } from "./PaymentsTable";

type OrderPaymentsTabProps = {
  orderId: string;
  loadingDate?: string | null;
};

export function OrderPaymentsTab({ orderId, loadingDate }: OrderPaymentsTabProps) {
  // Fetch downpayment invoices from control_payments
  const { data: downpayments, refetch: refetchDownpayments } = useQuery({
    queryKey: ["control-payments", "downpayment", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("control_payments")
        .select("*")
        .eq("order_id", orderId);

      if (error) throw error;

      // Also fetch invoice details to get invoice_type
      const invoiceIds = data?.map((d) => d.invoice_id).filter(Boolean) as number[];
      let invoiceMap: Record<number, any> = {};
      
      if (invoiceIds.length > 0) {
        const { data: invoices } = await supabase
          .from("invoice")
          .select("id, invoice_number, invoice_type, status")
          .in("id", invoiceIds);
        
        invoiceMap = (invoices || []).reduce((acc, inv) => {
          acc[inv.id] = inv;
          return acc;
        }, {} as Record<number, any>);
      }

      // Merge invoice details
      return (data || []).map((row) => ({
        ...row,
        invoice_number: invoiceMap[row.invoice_id || 0]?.invoice_number,
        invoice_type: invoiceMap[row.invoice_id || 0]?.invoice_type,
        status: invoiceMap[row.invoice_id || 0]?.status,
      })) as ControlPaymentRow[];
    },
    enabled: !!orderId,
  });

  // Fetch payments to get paid dates
  const invoiceIds = downpayments?.map((d) => d.invoice_id).filter(Boolean) as number[] || [];
  const { data: payments } = useQuery({
    queryKey: ["payments-for-order", invoiceIds],
    queryFn: async () => {
      if (invoiceIds.length === 0) return [];
      const { data, error } = await supabase
        .from("payment")
        .select("invoice_id, paid_date, total_amount_paid")
        .in("invoice_id", invoiceIds)
        .is("deleted_at", null);
      if (error) throw error;
      return data || [];
    },
    enabled: invoiceIds.length > 0,
  });

  // Get latest paid date from payments
  const getLatestPaidDate = () => {
    if (!payments || payments.length === 0) return null;
    const dates = payments
      .map((p) => p.paid_date)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
    return dates[0] || null;
  };

  // Filter downpayments vs other invoices
  const downpaymentInvoices = downpayments?.filter(
    (d) => d.invoice_type?.toLowerCase() === "downpayment"
  ) || [];
  
  const otherInvoices = downpayments?.filter(
    (d) => d.invoice_type?.toLowerCase() !== "downpayment"
  ) || [];

  // Calculate summary values for downpayments
  const downpaymentSummary = {
    totalRequired: downpaymentInvoices.reduce((sum, d) => sum + (d.total_amount || 0), 0),
    totalPaid: downpaymentInvoices.reduce((sum, d) => sum + (d.total_amount_paid || 0), 0),
    outstanding: downpaymentInvoices.reduce(
      (sum, d) => sum + ((d.total_amount || 0) - (d.total_amount_paid || 0)),
      0
    ),
    overdueAmount: downpaymentInvoices
      .filter((d) => d.overdue_days && d.overdue_days > 0)
      .reduce((sum, d) => sum + ((d.total_amount || 0) - (d.total_amount_paid || 0)), 0),
    currency: downpaymentInvoices[0]?.currency || "USD",
  };

  return (
    <div className="space-y-6">
      {/* Downpayments Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Downpayments</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {downpaymentInvoices.length > 0 ? (
            <>
              <PaymentsSummaryBar
                totalRequired={downpaymentSummary.totalRequired}
                totalPaid={downpaymentSummary.totalPaid}
                outstanding={downpaymentSummary.outstanding}
                overdueAmount={downpaymentSummary.overdueAmount}
                currency={downpaymentSummary.currency}
                variant="order"
                paidDate={getLatestPaidDate()}
              />
              <PaymentsTable
                data={downpaymentInvoices}
                loadingDate={loadingDate}
                variant="order"
                onRefresh={refetchDownpayments}
              />
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No downpayment invoices for this order</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Invoices Section (if any) */}
      {otherInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Other Invoices</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <PaymentsTable
              data={otherInvoices}
              loadingDate={loadingDate}
              variant="order"
              onRefresh={refetchDownpayments}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
