import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  CreditCard, 
  Pencil, 
  ArrowDownLeft, 
  ArrowUpRight, 
  FileText, 
  Upload,
  Link2,
  Calendar,
  DollarSign,
  Hash,
  Clock,
  Plus,
  Building2,
  Package,
  TrendingDown,
  TrendingUp,
  Receipt,
  Trash2,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { InvoiceDetailDrawer } from "./InvoiceDetailDrawer";
import { AddPaymentDialog } from "./AddPaymentDialog";
import { BLInvoiceCreateDialog, BLInvoiceType } from "./BLInvoiceCreateDialog";
import { BLInvoiceEditDialog } from "./BLInvoiceEditDialog";
type BLPaymentsSectionProps = {
  blOrderName: string;
  blOrderId: number;
  orderId: string | null;
  eta?: string | null;
  ata?: string | null;
  loadedQuantityMt?: number | null;
  totalQuantityMt?: number | null;
  orderAllocatedQuantityMt?: number | null;
};

type InvoiceRow = {
  id: number;
  invoice_type: string | null;
  invoice_number: string | null;
  "amount_%": number | null;
  amount_qt_mt: number | null;
  total_amount: number | null;
  applied_downpayment_amount: number | null;
  issue_date: string | null;
  original_due_date: string | null;
  actual_due_date: string | null;
  invoice_direction: string | null;
  company_name: string | null;
  currency: string | null;
  bl_order_name: string | null;
  order_id: string | null;
  status: string | null;
  file_url: string | null;
  note_reason: string | null;
  adjusts_invoice_id: number | null;
};

type PaymentRow = {
  id: number;
  invoice_id: number | null;
  total_amount_paid: number | null;
  paid_date: string | null;
};

type TicketData = {
  id: number;
  payment_trigger_event: string | null;
  payment_trigger_timing: string | null;
  payment_offset_days: number | null;
  price: number | null;
  signed_price: number | null;
  lme_price: number | null;
  payable_percent: number | null;
  premium_discount: number | null;
  pricing_type: string | null;
  currency: string | null;
  company_id: number | null;
};

type OrderData = {
  id: string;
  buyer: string | null;
  seller: string | null;
  buy_price: number | null;
  sell_price: number | null;
  allocated_quantity_mt: number | null;
};

export function BLPaymentsSection({ 
  blOrderName, 
  blOrderId,
  orderId,
  eta, 
  ata,
  loadedQuantityMt,
  totalQuantityMt,
  orderAllocatedQuantityMt 
}: BLPaymentsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<BLInvoiceType>("provisional");
  const [createDialogSide, setCreateDialogSide] = useState<"buy" | "sell">("buy");

  // Fetch order data
  const { data: orderData } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from("order")
        .select("id, buyer, seller, buy_price, sell_price, allocated_quantity_mt")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data as OrderData | null;
    },
    enabled: !!orderId,
  });

  // Fetch buy ticket directly using order.buyer as ticket ID
  const { data: buyTicket } = useQuery({
    queryKey: ["buy-ticket-bl", orderData?.buyer],
    queryFn: async () => {
      if (!orderData?.buyer) return null;
      const buyTicketId = parseInt(orderData.buyer, 10);
      if (isNaN(buyTicketId)) return null;

      const { data, error } = await supabase
        .from("ticket")
        .select("id, payment_trigger_event, payment_trigger_timing, payment_offset_days, price, signed_price, lme_price, payable_percent, premium_discount, pricing_type, currency, company_id")
        .eq("id", buyTicketId)
        .maybeSingle();
      
      if (error) throw error;
      return data as TicketData | null;
    },
    enabled: !!orderData?.buyer,
  });

  // Fetch sell ticket directly using order.seller as ticket ID
  const { data: sellTicket } = useQuery({
    queryKey: ["sell-ticket-bl", orderData?.seller],
    queryFn: async () => {
      if (!orderData?.seller) return null;
      const sellTicketId = parseInt(orderData.seller, 10);
      if (isNaN(sellTicketId)) return null;

      const { data, error } = await supabase
        .from("ticket")
        .select("id, payment_trigger_event, payment_trigger_timing, payment_offset_days, price, signed_price, lme_price, payable_percent, premium_discount, pricing_type, currency, company_id")
        .eq("id", sellTicketId)
        .maybeSingle();
      
      if (error) throw error;
      return data as TicketData | null;
    },
    enabled: !!orderData?.seller,
  });

  // Fetch company name for buy ticket
  const { data: buyCompanyName } = useQuery({
    queryKey: ["company-name-buy-bl", buyTicket?.company_id],
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
    queryKey: ["company-name-sell-bl", sellTicket?.company_id],
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

  // Fetch invoices for this BL
  const { data: invoices, refetch: refetchInvoices } = useQuery({
    queryKey: ["invoices", "bl", blOrderName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice")
        .select("*")
        .eq("bl_order_name", blOrderName);

      if (error) throw error;
      return data as InvoiceRow[];
    },
    enabled: !!blOrderName,
  });

  // Fetch payments linked to these invoices
  const invoiceIds = invoices?.map((inv) => inv.id) || [];
  const { data: payments, refetch: refetchPayments } = useQuery({
    queryKey: ["payments", "invoices", invoiceIds],
    queryFn: async () => {
      if (invoiceIds.length === 0) return [];
      const { data, error } = await supabase
        .from("payment")
        .select("*")
        .in("invoice_id", invoiceIds);

      if (error) throw error;
      return data as PaymentRow[];
    },
    enabled: invoiceIds.length > 0,
  });

  const refetch = () => {
    refetchInvoices();
    refetchPayments();
  };

  // Group payments by invoice_id
  const paymentsByInvoice = (payments || []).reduce((acc, p) => {
    if (p.invoice_id) {
      if (!acc[p.invoice_id]) acc[p.invoice_id] = [];
      acc[p.invoice_id].push(p);
    }
    return acc;
  }, {} as Record<number, PaymentRow[]>);

  // Split invoices by direction
  const buyInvoices = invoices?.filter(
    (inv) => inv.invoice_direction?.toLowerCase() === "payable" || inv.invoice_direction?.toLowerCase() === "buy"
  ) || [];
  
  const sellInvoices = invoices?.filter(
    (inv) => inv.invoice_direction?.toLowerCase() === "receivable" || inv.invoice_direction?.toLowerCase() === "sell"
  ) || [];

  // Calculate totals
  const getTotalPaid = (invoiceId: number) => {
    const invoicePayments = paymentsByInvoice[invoiceId] || [];
    return invoicePayments.reduce((sum, p) => sum + (p.total_amount_paid || 0), 0);
  };

  const getLatestPaidDate = (invoiceId: number) => {
    const invoicePayments = paymentsByInvoice[invoiceId] || [];
    if (invoicePayments.length === 0) return null;
    const dates = invoicePayments
      .map((p) => p.paid_date)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
    return dates[0] || null;
  };

  // Calculate unit price from ticket data
  const getUnitPrice = (ticket: TicketData | null): number | null => {
    if (!ticket) return null;
    if (ticket.pricing_type === "Fixed") return ticket.signed_price;
    if (ticket.pricing_type === "Formula" && ticket.lme_price && ticket.payable_percent) {
      return ticket.lme_price * (ticket.payable_percent / 100);
    }
    if (ticket.pricing_type === "Index" && ticket.lme_price) {
      return ticket.lme_price + (ticket.premium_discount || 0);
    }
    return ticket.price;
  };

  // Calculate current due date
  const calculateCurrentDueDate = (originalDueDate: string | null, ticket: TicketData | null) => {
    if (!ticket) return originalDueDate;
    
    const baseDate = ata || eta;
    if (!baseDate || !ticket.payment_offset_days) return originalDueDate;
    
    const date = new Date(baseDate);
    const offset = ticket.payment_trigger_timing?.toLowerCase() === "before" 
      ? -ticket.payment_offset_days 
      : ticket.payment_offset_days;
    
    date.setDate(date.getDate() + offset);
    return date.toISOString().split('T')[0];
  };

  // BL quantity
  const blQuantity = loadedQuantityMt || totalQuantityMt || 0;
  
  // Order allocated quantity for contract amount calculation
  const orderQuantity = orderAllocatedQuantityMt || orderData?.allocated_quantity_mt || 0;

  // Calculate summaries for each side
  const calculateSideSummary = (sideInvoices: InvoiceRow[], ticket: TicketData | null) => {
    const unitPrice = getUnitPrice(ticket);
    
    // BL expected amount = BL Quantity × Unit Price (not full order quantity)
    const blExpectedAmount = unitPrice && blQuantity ? blQuantity * unitPrice : null;
    
    // Contract amount still uses order.allocated_quantity_mt for reference display
    const contractAmount = unitPrice && orderQuantity ? orderQuantity * unitPrice : null;
    
    // Calculate proportional downpayment allocation for this BL
    // Downpayment share = (BL Quantity / Order Quantity) × applied downpayment from invoices
    const downpaymentShareRatio = orderQuantity > 0 ? blQuantity / orderQuantity : 0;
    
    // Get downpayment applied from final/provisional invoices (new field)
    const finalProvisionalInvoices = sideInvoices.filter(i => 
      i.invoice_type?.toLowerCase().includes("final") || 
      i.invoice_type?.toLowerCase().includes("provisional")
    );
    const appliedDownpaymentFromInvoices = finalProvisionalInvoices.reduce(
      (sum, i) => sum + (i.applied_downpayment_amount || 0), 
      0
    );
    
    // Use proportional share of applied downpayment
    const downpaymentApplied = appliedDownpaymentFromInvoices * downpaymentShareRatio;
    
    // Calculate invoiced amounts excluding notes (notes are adjustments)
    const mainInvoices = sideInvoices.filter(i => 
      !i.invoice_type?.toLowerCase().includes("credit") && 
      !i.invoice_type?.toLowerCase().includes("debit")
    );
    const creditNotes = sideInvoices.filter(i => i.invoice_type?.toLowerCase().includes("credit"));
    const debitNotes = sideInvoices.filter(i => i.invoice_type?.toLowerCase().includes("debit"));
    
    const totalMainInvoiced = mainInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
    const totalCredits = creditNotes.reduce((sum, i) => sum + (i.total_amount || 0), 0);
    const totalDebits = debitNotes.reduce((sum, i) => sum + (i.total_amount || 0), 0);
    
    const totalInvoiced = totalMainInvoiced - totalCredits + totalDebits;
    const totalPaid = sideInvoices.reduce((sum, i) => sum + getTotalPaid(i.id), 0);
    
    // Outstanding = BL Expected Amount - Downpayment Applied - Total Paid
    const outstanding = blExpectedAmount 
      ? blExpectedAmount - downpaymentApplied - totalPaid
      : totalInvoiced - totalPaid;

    return {
      unitPrice,
      blExpectedAmount,
      contractAmount,
      contractQuantity: blQuantity, // Now shows BL quantity, not order quantity
      downpaymentApplied,
      totalInvoiced,
      totalPaid,
      outstanding,
    };
  };

  const buySummary = calculateSideSummary(buyInvoices, buyTicket || null);
  const sellSummary = calculateSideSummary(sellInvoices, sellTicket || null);

  const openCreateDialog = (type: BLInvoiceType, side: "buy" | "sell") => {
    setCreateDialogType(type);
    setCreateDialogSide(side);
    setCreateDialogOpen(true);
  };

  const getPrefillData = (side: "buy" | "sell") => {
    const ticket = side === "buy" ? buyTicket : sellTicket;
    const companyName = side === "buy" ? buyCompanyName : sellCompanyName;
    
    return {
      company_name: companyName || null,
      currency: ticket?.currency || "USD",
      amount_qt_mt: blQuantity,
      unit_price: getUnitPrice(ticket || null),
      total_amount: blQuantity && getUnitPrice(ticket || null) ? blQuantity * getUnitPrice(ticket || null)! : null,
    };
  };

  const effectiveAllocatedQuantity = orderAllocatedQuantityMt || orderData?.allocated_quantity_mt || null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Payments & Invoices</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            {isEditing ? "Done" : "Edit"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Buy Side (Payable) */}
          <BLPaymentsSide
            side="buy"
            companyName={buyCompanyName || null}
            currency={buyTicket?.currency || "USD"}
            blQuantity={blQuantity}
            summary={buySummary}
            invoices={buyInvoices}
            paymentsByInvoice={paymentsByInvoice}
            ticketData={buyTicket || null}
            eta={eta}
            ata={ata}
            isEditing={isEditing}
            onRefresh={refetch}
            getTotalPaid={getTotalPaid}
            getLatestPaidDate={getLatestPaidDate}
            calculateCurrentDueDate={calculateCurrentDueDate}
            onCreateInvoice={(type) => openCreateDialog(type, "buy")}
          />

          {/* Sell Side (Receivable) */}
          <BLPaymentsSide
            side="sell"
            companyName={sellCompanyName || null}
            currency={sellTicket?.currency || "USD"}
            blQuantity={blQuantity}
            summary={sellSummary}
            invoices={sellInvoices}
            paymentsByInvoice={paymentsByInvoice}
            ticketData={sellTicket || null}
            eta={eta}
            ata={ata}
            isEditing={isEditing}
            onRefresh={refetch}
            getTotalPaid={getTotalPaid}
            getLatestPaidDate={getLatestPaidDate}
            calculateCurrentDueDate={calculateCurrentDueDate}
            onCreateInvoice={(type) => openCreateDialog(type, "sell")}
          />
        </div>
      </CardContent>

      {/* Create Invoice Dialog */}
      <BLInvoiceCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        invoiceType={createDialogType}
        side={createDialogSide}
        blOrderId={blOrderId}
        blOrderName={blOrderName}
        orderId={orderId}
        prefillData={getPrefillData(createDialogSide)}
        orderAllocatedQuantityMt={effectiveAllocatedQuantity}
        onSaved={refetch}
      />
    </Card>
  );
}

// Side Component
type BLPaymentsSideProps = {
  side: "buy" | "sell";
  companyName: string | null;
  currency: string;
  blQuantity: number;
  summary: {
    unitPrice: number | null;
    blExpectedAmount: number | null;
    contractAmount: number | null;
    contractQuantity: number;
    downpaymentApplied: number;
    totalInvoiced: number;
    totalPaid: number;
    outstanding: number;
  };
  invoices: InvoiceRow[];
  paymentsByInvoice: Record<number, PaymentRow[]>;
  ticketData: TicketData | null;
  eta?: string | null;
  ata?: string | null;
  isEditing: boolean;
  onRefresh: () => void;
  getTotalPaid: (id: number) => number;
  getLatestPaidDate: (id: number) => string | null;
  calculateCurrentDueDate: (originalDueDate: string | null, ticket: TicketData | null) => string | null;
  onCreateInvoice: (type: BLInvoiceType) => void;
};

function BLPaymentsSide({
  side,
  companyName,
  currency,
  blQuantity,
  summary,
  invoices,
  paymentsByInvoice,
  ticketData,
  eta,
  ata,
  isEditing,
  onRefresh,
  getTotalPaid,
  getLatestPaidDate,
  calculateCurrentDueDate,
  onCreateInvoice,
}: BLPaymentsSideProps) {
  const isBuy = side === "buy";
  const Icon = isBuy ? ArrowUpRight : ArrowDownLeft;
  const iconColor = isBuy ? "text-orange-500" : "text-green-500";
  const title = isBuy ? "Buy Side (Payable)" : "Sell Side (Receivable)";

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(value);
  };

  // Group invoices by type for display
  const downpaymentInvoices = invoices.filter(i => i.invoice_type?.toLowerCase() === "downpayment");
  const provisionalInvoices = invoices.filter(i => i.invoice_type?.toLowerCase().includes("provisional"));
  const finalInvoices = invoices.filter(i => i.invoice_type?.toLowerCase().includes("final"));
  const creditNotes = invoices.filter(i => i.invoice_type?.toLowerCase().includes("credit"));
  const debitNotes = invoices.filter(i => i.invoice_type?.toLowerCase().includes("debit"));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <h4 className="font-semibold">{title}</h4>
        <Badge variant="outline" className="ml-auto">
          {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Summary Card */}
      <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span>{companyName || "—"}</span>
          <Badge variant="outline" className="ml-auto">{currency}</Badge>
        </div>
        
        <Separator />
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">BL Quantity:</span>
            <span className="font-medium ml-auto">{blQuantity.toFixed(2)} MT</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Unit Price:</span>
            <span className="font-medium ml-auto">{summary.unitPrice ? formatCurrency(summary.unitPrice) : "Not fixed yet"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Contract Qty:</span>
            <span className="font-medium ml-auto">
              {summary.contractQuantity ? `${summary.contractQuantity.toFixed(2)} MT` : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Contract Amt:</span>
            <span className="font-medium ml-auto">{formatCurrency(summary.contractAmount)}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Downpmt Applied:</span>
            <span className="font-medium ml-auto">{formatCurrency(summary.downpaymentApplied)}</span>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Outstanding:</span>
          <span className={`font-semibold ${summary.outstanding > 0 ? (isBuy ? "text-orange-600" : "text-green-600") : ""}`}>
            {formatCurrency(summary.outstanding)}
          </span>
        </div>

        {/* Show paid date if there are any payments */}
        {(() => {
          const paidDates = invoices
            .map((inv) => getLatestPaidDate(inv.id))
            .filter(Boolean)
            .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
          const latestPaidDate = paidDates[0];
          
          if (latestPaidDate) {
            return (
              <div className="flex items-center justify-between text-sm pt-2 border-t border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 -mx-4 -mb-4 px-4 py-2 rounded-b-lg">
                <span className="text-green-600 font-medium">Paid Date:</span>
                <span className="font-semibold text-green-600">
                  {new Date(latestPaidDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Invoice List */}
      {invoices.length > 0 ? (
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <BLInvoiceCard
              key={invoice.id}
              invoice={invoice}
              totalPaid={getTotalPaid(invoice.id)}
              paidDate={getLatestPaidDate(invoice.id)}
              isEditing={isEditing}
              onRefresh={onRefresh}
              ticketData={ticketData}
              eta={eta}
              ata={ata}
              calculateCurrentDueDate={(origDate) => calculateCurrentDueDate(origDate, ticketData)}
              isSellSide={!isBuy}
              currency={currency}
            />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-muted/10 text-center">
          <p className="text-sm text-muted-foreground">No invoices yet</p>
        </div>
      )}

      {/* Create Invoice Buttons - always visible */}
      <div className="grid grid-cols-2 gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1 h-8 text-xs"
          onClick={() => onCreateInvoice("provisional")}
        >
          <Plus className="h-3 w-3" />
          Provisional
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1 h-8 text-xs"
          onClick={() => onCreateInvoice("final")}
        >
          <Plus className="h-3 w-3" />
          Final
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1 h-8 text-xs text-green-600 border-green-200 hover:bg-green-50"
          onClick={() => onCreateInvoice("credit_note")}
        >
          <Plus className="h-3 w-3" />
          Credit Note
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => onCreateInvoice("debit_note")}
        >
          <Plus className="h-3 w-3" />
          Debit Note
        </Button>
      </div>

      {/* EasyBill for Sell Side */}
      {!isBuy && isEditing && (
        <Button variant="outline" className="w-full gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
          <Link2 className="h-4 w-4" />
          Connect to EasyBill
        </Button>
      )}
    </div>
  );
}

// Invoice Card Component
function BLInvoiceCard({ 
  invoice,
  totalPaid,
  paidDate,
  isEditing, 
  onRefresh,
  ticketData,
  eta,
  ata,
  calculateCurrentDueDate,
  isSellSide,
  currency
}: { 
  invoice: InvoiceRow;
  totalPaid: number;
  paidDate: string | null;
  isEditing: boolean;
  onRefresh: () => void;
  ticketData: TicketData | null;
  eta?: string | null;
  ata?: string | null;
  calculateCurrentDueDate: (originalDueDate: string | null) => string | null;
  isSellSide: boolean;
  currency: string;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const finalAmount = invoice.total_amount || 0;
  const outstanding = finalAmount - totalPaid;
  const currentDueDate = calculateCurrentDueDate(invoice.original_due_date);

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string | null) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower === "paid") return <Badge className="bg-green-500/10 text-green-600 border-green-200">Paid</Badge>;
    if (statusLower === "overdue") return <Badge variant="destructive">Overdue</Badge>;
    if (statusLower === "sent") return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Sent</Badge>;
    if (statusLower === "pending") return <Badge variant="secondary">Pending</Badge>;
    return <Badge variant="outline">{status || "Draft"}</Badge>;
  };

  const getTypeBadge = (type: string | null) => {
    const typeLower = type?.toLowerCase() || "";
    if (typeLower.includes("final")) return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200">Final</Badge>;
    if (typeLower.includes("provisional")) return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">Provisional</Badge>;
    if (typeLower.includes("credit")) return <Badge className="bg-green-500/10 text-green-600 border-green-200">Credit Note</Badge>;
    if (typeLower.includes("debit")) return <Badge className="bg-red-500/10 text-red-600 border-red-200">Debit Note</Badge>;
    if (typeLower.includes("downpayment")) return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Downpayment</Badge>;
    return <Badge variant="outline">{type || "—"}</Badge>;
  };

  // Build invoice data for drawer compatibility
  const invoiceForDrawer = {
    id: invoice.id,
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    invoice_type: invoice.invoice_type,
    invoice_direction: invoice.invoice_direction,
    company_name: invoice.company_name,
    currency: invoice.currency,
    total_amount: invoice.total_amount,
    total_amount_paid: totalPaid,
    original_due_date: invoice.original_due_date,
    actual_due_date: currentDueDate,
    order_id: invoice.order_id,
    bl_order_name: invoice.bl_order_name,
    overdue_days: null,
    paid_date: paidDate,
    reference_note: null,
  };

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Check for linked payments first
      const { data: linkedPayments } = await supabase
        .from("payment")
        .select("id")
        .eq("invoice_id", invoice.id)
        .limit(1);
      
      if (linkedPayments && linkedPayments.length > 0) {
        toast.error("Cannot delete invoice with associated payments. Delete payments first.");
        setDeleteDialogOpen(false);
        return;
      }
      
      // Delete PDF from storage if exists
      if (invoice.file_url) {
        try {
          const url = new URL(invoice.file_url);
          const pathParts = url.pathname.split("/storage/v1/object/public/bl-documents/");
          if (pathParts.length > 1) {
            await supabase.storage.from("bl-documents").remove([pathParts[1]]);
          }
        } catch (e) {
          // Ignore PDF deletion errors, continue with invoice deletion
        }
      }
      
      // Delete invoice record
      const { error } = await supabase.from("invoice").delete().eq("id", invoice.id);
      if (error) throw error;
      
      toast.success("Invoice deleted successfully");
      setDeleteDialogOpen(false);
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div 
        className="border rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setDrawerOpen(true)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getTypeBadge(invoice.invoice_type)}
            <span className="text-sm font-medium">{invoice.invoice_number || "No number"}</span>
          </div>
          {getStatusBadge(invoice.status)}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">{formatCurrency(invoice.total_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Issue Date:</span>
            <span>{formatDate(invoice.issue_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Due Date:</span>
            <span>{formatDate(invoice.original_due_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid:</span>
            <span className={totalPaid > 0 ? "text-green-600 font-medium" : ""}>{formatCurrency(totalPaid)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid Date:</span>
            <span className={paidDate ? "text-green-600" : ""}>{formatDate(paidDate)}</span>
          </div>
        </div>

        {outstanding > 0 && (
          <div className="flex justify-end mt-2">
            <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs">
              {formatCurrency(outstanding)} outstanding
            </Badge>
          </div>
        )}
        
        {isEditing && (
          <div className="flex gap-2 mt-2 pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setEditDialogOpen(true);
              }}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setPaymentDialogOpen(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Payment
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <InvoiceDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        invoice={invoiceForDrawer}
        onPaymentAdded={onRefresh}
      />

      <AddPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={invoiceForDrawer}
        onSuccess={() => {
          setPaymentDialogOpen(false);
          onRefresh();
        }}
      />

      <BLInvoiceEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        invoiceId={invoice.id}
        onSaved={onRefresh}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment/invoice record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
