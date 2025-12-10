import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  FileText, 
  Upload,
  Eye,
  Loader2,
  Zap,
  Pencil
} from "lucide-react";
import { InvoiceEditDialog } from "./InvoiceEditDialog";
import { InvoiceDetailDrawer } from "./InvoiceDetailDrawer";
import { PdfViewerModal } from "@/components/PdfViewerModal";
import type { ControlPaymentRow } from "./PaymentsTable";

type PaymentsSectionProps = {
  orderId: string;
  loadingDate?: string | null;
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

type TicketData = {
  id: number;
  type: string;
  price: number | null;
  down_payment_amount_percent: number | null;
  downpayment_trigger: string | null;
  client_name: string | null;
  currency: string | null;
  company_id: number | null;
};

export function PaymentsSection({ orderId, loadingDate }: PaymentsSectionProps) {
  const queryClient = useQueryClient();

  // Fetch order with buyer/seller info
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Fetch buy ticket directly using order.buyer as ticket ID
  const { data: buyTicket, isLoading: buyTicketLoading } = useQuery({
    queryKey: ["buy-ticket-downpayment", order?.buyer],
    queryFn: async () => {
      if (!order?.buyer) return null;
      const buyTicketId = parseInt(order.buyer, 10);
      if (isNaN(buyTicketId)) return null;

      const { data, error } = await supabase
        .from("ticket")
        .select("id, type, price, down_payment_amount_percent, downpayment_trigger, client_name, currency, company_id")
        .eq("id", buyTicketId)
        .maybeSingle();
      
      if (error) throw error;
      return data as TicketData | null;
    },
    enabled: !!order?.buyer,
  });

  // Fetch sell ticket directly using order.seller as ticket ID
  const { data: sellTicket, isLoading: sellTicketLoading } = useQuery({
    queryKey: ["sell-ticket-downpayment", order?.seller],
    queryFn: async () => {
      if (!order?.seller) return null;
      const sellTicketId = parseInt(order.seller, 10);
      if (isNaN(sellTicketId)) return null;

      const { data, error } = await supabase
        .from("ticket")
        .select("id, type, price, down_payment_amount_percent, downpayment_trigger, client_name, currency, company_id")
        .eq("id", sellTicketId)
        .maybeSingle();
      
      if (error) throw error;
      return data as TicketData | null;
    },
    enabled: !!order?.seller,
  });

  // Fetch company name for buy ticket
  const { data: buyCompanyName } = useQuery({
    queryKey: ["company-name-buy", buyTicket?.company_id],
    queryFn: async () => {
      if (!buyTicket?.company_id) return null;
      const { data, error } = await supabase
        .from("Company")
        .select("name")
        .eq("id", buyTicket.company_id)
        .maybeSingle();
      if (error) throw error;
      return data?.name || null;
    },
    enabled: !!buyTicket?.company_id,
  });

  // Fetch company name for sell ticket
  const { data: sellCompanyName } = useQuery({
    queryKey: ["company-name-sell", sellTicket?.company_id],
    queryFn: async () => {
      if (!sellTicket?.company_id) return null;
      const { data, error } = await supabase
        .from("Company")
        .select("name")
        .eq("id", sellTicket.company_id)
        .maybeSingle();
      if (error) throw error;
      return data?.name || null;
    },
    enabled: !!sellTicket?.company_id,
  });

  // Fetch downpayment invoices for this order
  const { data: buyInvoice, refetch: refetchBuyInvoice, isLoading: buyInvoiceLoading } = useQuery({
    queryKey: ["downpayment-invoice-buy", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice")
        .select("*")
        .eq("order_id", orderId)
        .eq("invoice_type", "Downpayment")
        .eq("invoice_direction", "payable")
        .is("deleted_at", null)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as InvoiceRow | null;
    },
    enabled: !!orderId,
  });

  const { data: sellInvoice, refetch: refetchSellInvoice, isLoading: sellInvoiceLoading } = useQuery({
    queryKey: ["downpayment-invoice-sell", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice")
        .select("*")
        .eq("order_id", orderId)
        .eq("invoice_type", "Downpayment")
        .eq("invoice_direction", "receivable")
        .is("deleted_at", null)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as InvoiceRow | null;
    },
    enabled: !!orderId,
  });

  const refetchAll = () => {
    refetchBuyInvoice();
    refetchSellInvoice();
    queryClient.invalidateQueries({ queryKey: ["downpayment-payments-buy", orderId] });
    queryClient.invalidateQueries({ queryKey: ["downpayment-payments-sell", orderId] });
  };

  // Determine company names to use
  const buyCompany = buyCompanyName || buyTicket?.client_name || null;
  const sellCompany = sellCompanyName || sellTicket?.client_name || null;

  const isLoading = orderLoading || buyTicketLoading || sellTicketLoading || buyInvoiceLoading || sellInvoiceLoading;

  // Determine which cards to show based on order type
  const isInventory = order?.transaction_type === "Inventory";
  const hasBuy = !!order?.buyer;
  const hasSell = !!order?.seller;
  
  const showBuySide = !isInventory || hasBuy;
  const showSellSide = !isInventory || hasSell;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Downpayments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${showBuySide && showSellSide ? 'lg:grid-cols-2' : ''} gap-6`}>
            {showBuySide && (
              <DownpaymentCard
                side="buy"
                ticket={buyTicket}
                invoice={buyInvoice}
                orderId={orderId}
                companyName={buyCompany}
                allocatedQuantity={order?.allocated_quantity_mt}
                orderPrice={order?.buy_price}
                loadingDate={order?.loading_date || loadingDate}
                onRefresh={refetchAll}
              />
            )}

            {showSellSide && (
              <DownpaymentCard
                side="sell"
                ticket={sellTicket}
                invoice={sellInvoice}
                orderId={orderId}
                companyName={sellCompany}
                allocatedQuantity={order?.allocated_quantity_mt}
                orderPrice={order?.sell_price}
                loadingDate={order?.loading_date || loadingDate}
                onRefresh={refetchAll}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Downpayment Card Component - Shows summary, opens dialog for editing
function DownpaymentCard({
  side,
  ticket,
  invoice,
  orderId,
  companyName,
  allocatedQuantity,
  orderPrice,
  loadingDate,
  onRefresh,
}: {
  side: "buy" | "sell";
  ticket: TicketData | null | undefined;
  invoice: InvoiceRow | null | undefined;
  orderId: string;
  companyName: string | null;
  allocatedQuantity: number | null | undefined;
  orderPrice: number | null | undefined;
  loadingDate?: string | null;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);

  const isBuy = side === "buy";
  const title = isBuy ? "Buy Side (Payable)" : "Sell Side (Receivable)";
  const Icon = isBuy ? ArrowUpRight : ArrowDownLeft;
  const iconColor = isBuy ? "text-orange-500" : "text-green-500";

  // Fetch payments for this invoice
  const { data: payments } = useQuery({
    queryKey: [isBuy ? "downpayment-payments-buy" : "downpayment-payments-sell", orderId, invoice?.id],
    queryFn: async () => {
      if (!invoice?.id) return [];
      const { data, error } = await supabase
        .from("payment")
        .select("*")
        .eq("invoice_id", invoice.id)
        .is("deleted_at", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!invoice?.id,
  });

  // Compute total paid and outstanding
  const totalPaid = useMemo(() => {
    if (!payments || payments.length === 0) return 0;
    return payments.reduce((sum, p) => sum + (p.total_amount_paid || 0), 0);
  }, [payments]);

  // Get latest paid date from payments
  const latestPaidDate = useMemo(() => {
    if (!payments || payments.length === 0) return null;
    const dates = payments
      .map((p) => p.paid_date)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
    return dates[0] || null;
  }, [payments]);

  const outstanding = useMemo(() => {
    const invoiceTotal = invoice?.total_amount || 0;
    return invoiceTotal - totalPaid;
  }, [invoice?.total_amount, totalPaid]);

  // Compute default values from ticket data and order allocated quantity
  const defaultValues = useMemo(() => {
    const ticketPrice = ticket?.price ?? null;
    const effectivePrice = ticketPrice ?? orderPrice ?? 0;
    const storedPercent = ticket?.down_payment_amount_percent ?? null;
    const quantity = allocatedQuantity ?? 0;
    const ticketCurrency = ticket?.currency || "USD";
    
    const expectedAmount = storedPercent != null && effectivePrice > 0 && quantity > 0
      ? quantity * effectivePrice * storedPercent
      : null;

    return {
      invoice_number: "",
      company_name: companyName || "",
      currency: ticketCurrency,
      "amount_%": storedPercent,
      total_amount: expectedAmount,
      issue_date: null as string | null,
      original_due_date: null as string | null,
      actual_due_date: null as string | null,
      status: "Draft",
    };
  }, [ticket?.down_payment_amount_percent, ticket?.price, ticket?.currency, companyName, allocatedQuantity, orderPrice]);

  // Display data - use invoice if exists, otherwise defaults
  const displayData = invoice ? {
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
  } : { ...defaultValues, file_url: null };

  // Auto-update status based on payments
  const effectiveStatus = useMemo(() => {
    if (!invoice) return displayData.status;
    const invoiceTotal = invoice.total_amount || 0;
    if (invoiceTotal > 0 && totalPaid >= invoiceTotal - 0.01) {
      return "Paid";
    }
    return invoice.status;
  }, [invoice, totalPaid, displayData.status]);

  const getStatusVariant = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "paid": return "default";
      case "pending": return "secondary";
      case "overdue": return "destructive";
      case "sent": return "outline";
      case "draft": return "outline";
      default: return "outline";
    }
  };

  const displayValue = (val: any, type: "text" | "number" | "date" | "percent" = "text") => {
    if (val === null || val === undefined || val === "") return "-";
    if (type === "percent") return `${((val as number) * 100).toFixed(1)}%`;
    if (type === "number") return typeof val === "number" ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val;
    if (type === "date") return val;
    return val;
  };

  const formatCurrency = (value: number, currency: string | null) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Map invoice to ControlPaymentRow for the drawer
  const invoiceForDrawer: ControlPaymentRow | null = invoice ? {
    id: invoice.id,
    invoice_id: invoice.id,
    invoice_direction: invoice.invoice_direction,
    order_id: invoice.order_id,
    bl_order_name: null,
    company_name: invoice.company_name,
    currency: invoice.currency,
    total_amount: invoice.total_amount,
    total_amount_paid: totalPaid,
    original_due_date: invoice.original_due_date,
    actual_due_date: invoice.actual_due_date,
    overdue_days: null,
    paid_date: null,
    reference_note: null,
    invoice_type: invoice.invoice_type || "Downpayment",
    invoice_number: invoice.invoice_number || undefined,
    status: effectiveStatus || undefined,
  } : null;

  const handlePaymentAdded = () => {
    queryClient.invalidateQueries({ queryKey: [isBuy ? "downpayment-payments-buy" : "downpayment-payments-sell", orderId] });
    queryClient.invalidateQueries({ queryKey: ["downpayment-invoice-buy", orderId] });
    queryClient.invalidateQueries({ queryKey: ["downpayment-invoice-sell", orderId] });
    onRefresh();
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/30 px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${iconColor}`} />
              <span className="font-semibold text-sm">{title}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(effectiveStatus || null)} className="text-xs">
                {effectiveStatus || "Draft"}
              </Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialogOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Clickable card body */}
        <div 
          className={`p-4 space-y-4 ${invoice ? 'cursor-pointer hover:bg-muted/20 transition-colors' : ''}`}
          onClick={() => invoice && setDrawerOpen(true)}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Invoice Number</span>
              <p className="font-medium">{displayValue(displayData.invoice_number)}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Status</span>
              <p className="font-medium">{displayValue(effectiveStatus)}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground text-xs">Company Name</span>
              <p className="font-medium">{displayValue(displayData.company_name)}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Currency</span>
              <p className="font-medium">{displayValue(displayData.currency)}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Amount %</span>
              <p className="font-medium">{displayValue(displayData["amount_%"], "percent")}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground text-xs">Total Amount</span>
              <p className="font-medium text-lg">
                {displayData.currency} {displayValue(displayData.total_amount, "number")}
              </p>
            </div>

            {/* Show paid/outstanding if invoice exists */}
            {invoice && (
              <>
                <div>
                  <span className="text-muted-foreground text-xs">Paid</span>
                  <p className="font-medium text-green-600">
                    {formatCurrency(totalPaid, displayData.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Outstanding</span>
                  <p className={`font-medium ${outstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatCurrency(outstanding, displayData.currency)}
                  </p>
                </div>
              </>
            )}

            <div>
              <span className="text-muted-foreground text-xs">Issue Date</span>
              <p className="font-medium">{displayValue(displayData.issue_date, "date")}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Original Due Date</span>
              <p className="font-medium">{displayValue(displayData.original_due_date, "date")}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground text-xs">Actual Due Date</span>
              <p className="font-medium">{displayValue(displayData.actual_due_date, "date")}</p>
            </div>
            {latestPaidDate && (
              <div className="col-span-2 bg-green-50 dark:bg-green-950/20 -mx-4 px-4 py-2 border-t border-green-200 dark:border-green-800">
                <span className="text-green-600 text-xs font-medium">Paid Date</span>
                <p className="font-semibold text-green-600">{displayValue(latestPaidDate, "date")}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              {invoice?.file_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPdfViewerOpen(true)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View PDF
                </Button>
              )}
              {invoice && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDrawerOpen(true)}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  View Details
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isBuy && (
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-1" />
                  {invoice?.file_url ? "Edit Invoice" : "Upload Invoice"}
                </Button>
              )}

              {!isBuy && (
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <Zap className="h-4 w-4 mr-1" />
                  {invoice ? "Edit Invoice" : "Generate Invoice"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <InvoiceEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        side={side}
        orderId={orderId}
        invoice={invoice}
        defaultValues={defaultValues}
        onSaved={onRefresh}
      />

      {/* Invoice Detail Drawer */}
      {invoiceForDrawer && (
        <InvoiceDetailDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          invoice={invoiceForDrawer}
          loadingDate={loadingDate}
          onPaymentAdded={handlePaymentAdded}
        />
      )}

      {/* PDF Viewer Modal */}
      {invoice?.file_url && (
        <PdfViewerModal
          isOpen={pdfViewerOpen}
          onClose={() => setPdfViewerOpen(false)}
          pdfUrl={invoice.file_url}
          documentName={`Invoice ${invoice.invoice_number || invoice.id}`}
        />
      )}
    </>
  );
}
