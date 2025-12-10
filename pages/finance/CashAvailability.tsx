import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Plus, ArrowRight, Minus, Equal, Landmark, Package, Receipt, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CashInBankDialog } from "@/components/finance/CashInBankDialog";
import { InventoryDetailsDialog } from "@/components/finance/InventoryDetailsDialog";
import { ReceivablesDetailsDialog } from "@/components/finance/ReceivablesDetailsDialog";
import { ClaimsDetailsDialog } from "@/components/finance/ClaimsDetailsDialog";

interface CashBankBalance {
  id: string;
  as_of_date: string;
  amount: number;
  currency: string;
  notes: string | null;
  account_name: string | null;
}

interface Invoice {
  id: number;
  order_id: string | null;
  bl_order_name: string | null;
  invoice_type: string | null;
  invoice_direction: string | null;
  total_amount: number | null;
  currency: string | null;
  issue_date: string | null;
  original_due_date: string | null;
  status: string | null;
}

interface Payment {
  id: number;
  invoice_id: number | null;
  paid_date: string | null;
  total_amount_paid: number | null;
}

interface Claim {
  id: string;
  order_id: string | null;
  bl_order_name: string | null;
  claimed_value_amount: number | null;
  status: string;
  claim_reference: string | null;
}

interface Order {
  id: string;
  commodity_type: string | null;
  buyer: string | null;
  seller: string | null;
}

interface Ticket {
  id: number;
  company_id: number | null;
}

interface Company {
  id: number;
  name: string;
}

interface BlOrder {
  id: number;
  bl_order_name: string | null;
}

const formatCurrency = (amount: number, currency?: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function CashAvailability() {
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [cashInBankOpen, setCashInBankOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [receivablesOpen, setReceivablesOpen] = useState(false);
  const [claimsOpen, setClaimsOpen] = useState(false);

  const formattedDate = format(asOfDate, "yyyy-MM-dd");

  // Fetch all cash in bank entries to get latest per account as of selected date
  const { data: allCashBalances = [] } = useQuery({
    queryKey: ['cash-bank-balance', formattedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_bank_balance')
        .select('*')
        .lte('as_of_date', formattedDate)
        .order('as_of_date', { ascending: false });
      
      if (error) throw error;
      return data as CashBankBalance[];
    }
  });

  // Get latest balance per account and sum them up
  const latestBalancesByAccount = allCashBalances.reduce((acc, balance) => {
    const accountKey = balance.account_name || '__default__';
    if (!acc[accountKey]) {
      acc[accountKey] = balance;
    }
    return acc;
  }, {} as Record<string, CashBankBalance>);

  const cashInBankEntries = Object.values(latestBalancesByAccount);
  const cashInBankAmount = cashInBankEntries.reduce((sum, b) => sum + (b.amount || 0), 0);
  const latestCashDate = cashInBankEntries.length > 0 
    ? cashInBankEntries.reduce((latest, b) => 
        new Date(b.as_of_date) > new Date(latest.as_of_date) ? b : latest
      ).as_of_date
    : null;

  // Fetch all invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice')
        .select('*')
        .is('deleted_at', null);
      
      if (error) throw error;
      return data as Invoice[];
    }
  });

  // Fetch all payments
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', formattedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment')
        .select('*')
        .is('deleted_at', null)
        .lte('paid_date', formattedDate);
      
      if (error) throw error;
      return data as Payment[];
    }
  });

  // Fetch claims
  const { data: claims = [] } = useQuery({
    queryKey: ['claims', formattedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('claims')
        .select('*')
        .is('deleted_at', null)
        .neq('status', 'closed');
      
      if (error) throw error;
      return data as Claim[];
    }
  });

  // Fetch orders for client name and commodity info
  const { data: orders = [] } = useQuery({
    queryKey: ['orders-finance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order')
        .select('id, commodity_type, buyer, seller')
        .is('deleted_at', null);
      
      if (error) throw error;
      return data as Order[];
    }
  });

  // Fetch tickets for company_id lookup
  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets-finance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket')
        .select('id, company_id')
        .is('deleted_at', null);
      
      if (error) throw error;
      return data as Ticket[];
    }
  });

  // Fetch companies for name lookup
  const { data: companies = [] } = useQuery({
    queryKey: ['companies-finance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Company')
        .select('id, name');
      
      if (error) throw error;
      return data as Company[];
    }
  });

  // Fetch BL orders for navigation
  const { data: blOrders = [] } = useQuery({
    queryKey: ['bl-orders-finance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bl_order')
        .select('id, bl_order_name')
        .is('deleted_at', null);
      
      if (error) throw error;
      return data as BlOrder[];
    }
  });

  // Build enriched order info with buyer/seller company names
  const getCompanyNameFromTicketId = (ticketId: string | null) => {
    if (!ticketId) return null;
    const ticket = tickets.find(t => String(t.id) === ticketId);
    if (!ticket?.company_id) return null;
    const company = companies.find(c => c.id === ticket.company_id);
    return company?.name || null;
  };

  const enrichedOrders = orders.map(order => ({
    id: order.id,
    commodity_type: order.commodity_type,
    buyer_company_name: getCompanyNameFromTicketId(order.buyer),
    seller_company_name: getCompanyNameFromTicketId(order.seller),
  }));

  // Helper to check if invoice type is Final (handles variations like "Final", "Final Invoice")
  const isFinalInvoice = (invoiceType: string | null) => {
    if (!invoiceType) return false;
    const normalized = invoiceType.toLowerCase();
    return normalized === 'final' || normalized === 'final invoice';
  };

  // Calculate Inventory: Payables paid but no Final Receivable issued yet
  const inventoryInvoices = invoices.filter(inv => {
    if (inv.invoice_direction?.toUpperCase() !== 'PAYABLE') return false;
    if (inv.invoice_type === 'Credit Note' || inv.invoice_type === 'Debit Note') return false;
    
    // Check if invoice is paid - either has payment record or status is 'Paid'
    const hasPayment = payments.some(p => String(p.invoice_id) === String(inv.id));
    const isPaidStatus = inv.status?.toLowerCase() === 'paid';
    if (!hasPayment && !isPaidStatus) return false;
    
    // Check if there's a receivable Final invoice for the same order
    const orderKey = inv.order_id || inv.bl_order_name;
    if (!orderKey) return true;
    
    const hasFinalReceivable = invoices.some(other => 
      (other.order_id === inv.order_id || other.bl_order_name === inv.bl_order_name) &&
      other.invoice_direction?.toUpperCase() === 'RECEIVABLE' &&
      isFinalInvoice(other.invoice_type)
    );
    
    return !hasFinalReceivable;
  });

  const inventoryAmount = inventoryInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  // Calculate Receivables: Receivable Final invoices where payable is fully paid
  const receivableInvoices = invoices.filter(inv => {
    if (inv.invoice_direction?.toUpperCase() !== 'RECEIVABLE') return false;
    if (!isFinalInvoice(inv.invoice_type)) return false;
    
    // Find payable invoices for the same order
    const orderKey = inv.order_id || inv.bl_order_name;
    if (!orderKey) return false;
    
    const payableInvoices = invoices.filter(other =>
      (other.order_id === inv.order_id || other.bl_order_name === inv.bl_order_name) &&
      other.invoice_direction?.toUpperCase() === 'PAYABLE'
    );
    
    if (payableInvoices.length === 0) return false;
    
    // Check if all payables are fully paid (either via payment records or status='Paid')
    const allPaid = payableInvoices.every(payable => {
      const payablePaid = payments
        .filter(p => String(p.invoice_id) === String(payable.id))
        .reduce((sum, p) => sum + (p.total_amount_paid || 0), 0);
      const isPaidStatus = payable.status?.toLowerCase() === 'paid';
      return payablePaid >= (payable.total_amount || 0) || isPaidStatus;
    });
    
    return allPaid;
  });

  const receivablesAmount = receivableInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  // Calculate Claims
  const claimsAmount = claims.reduce((sum, claim) => sum + (claim.claimed_value_amount || 0), 0);

  // Total calculation
  const totalCashEquivalents = cashInBankAmount + inventoryAmount + receivablesAmount - claimsAmount;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cash & Equivalents</h1>
          <p className="text-muted-foreground mt-1">View and manage your total cash and equivalents</p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">As of Date:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[200px] justify-start text-left font-normal",
                  !asOfDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(asOfDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={asOfDate}
                onSelect={(date) => date && setAsOfDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Flow Diagram */}
      <div className="flex flex-col items-center gap-8">
        {/* Main flow boxes */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {/* Cash in Bank */}
          <div 
            onClick={() => setCashInBankOpen(true)}
            className="flex flex-col items-center p-6 bg-card border-2 border-primary/20 rounded-xl cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all min-w-[180px]"
          >
            <div className="p-3 bg-primary/10 rounded-full mb-3">
              <Landmark className="h-8 w-8 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground mb-1">Cash in Bank</span>
            <span className="text-2xl font-bold text-foreground">{formatCurrency(cashInBankAmount)}</span>
            {cashInBankEntries.length > 0 && (
              <span className="text-xs text-muted-foreground mt-1">
                {cashInBankEntries.length} account{cashInBankEntries.length > 1 ? 's' : ''}
                {latestCashDate && ` • As of ${format(new Date(latestCashDate), "MMM d")}`}
              </span>
            )}
          </div>

          <div className="flex items-center justify-center w-10 h-10 bg-accent rounded-full">
            <Plus className="h-5 w-5 text-accent-foreground" />
          </div>

          {/* Inventory */}
          <div 
            onClick={() => setInventoryOpen(true)}
            className="flex flex-col items-center p-6 bg-card border-2 border-secondary/30 rounded-xl cursor-pointer hover:border-secondary/60 hover:shadow-lg transition-all min-w-[180px]"
          >
            <div className="p-3 bg-secondary/20 rounded-full mb-3">
              <Package className="h-8 w-8 text-secondary-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground mb-1">Inventory</span>
            <span className="text-2xl font-bold text-foreground">{formatCurrency(inventoryAmount)}</span>
            <span className="text-xs text-muted-foreground mt-1">
              {inventoryInvoices.length} invoices
            </span>
          </div>

          <div className="flex items-center justify-center w-10 h-10 bg-accent rounded-full">
            <Plus className="h-5 w-5 text-accent-foreground" />
          </div>

          {/* Receivables */}
          <div 
            onClick={() => setReceivablesOpen(true)}
            className="flex flex-col items-center p-6 bg-card border-2 border-green-500/20 rounded-xl cursor-pointer hover:border-green-500/50 hover:shadow-lg transition-all min-w-[180px]"
          >
            <div className="p-3 bg-green-500/10 rounded-full mb-3">
              <Receipt className="h-8 w-8 text-green-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground mb-1">Receivables</span>
            <span className="text-2xl font-bold text-foreground">{formatCurrency(receivablesAmount)}</span>
            <span className="text-xs text-muted-foreground mt-1">
              {receivableInvoices.length} invoices
            </span>
          </div>

          <div className="flex items-center justify-center w-10 h-10 bg-destructive/20 rounded-full">
            <Minus className="h-5 w-5 text-destructive" />
          </div>

          {/* Claims */}
          <div 
            onClick={() => setClaimsOpen(true)}
            className="flex flex-col items-center p-6 bg-card border-2 border-destructive/20 rounded-xl cursor-pointer hover:border-destructive/50 hover:shadow-lg transition-all min-w-[180px]"
          >
            <div className="p-3 bg-destructive/10 rounded-full mb-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <span className="text-sm font-medium text-muted-foreground mb-1">Claims</span>
            <span className="text-2xl font-bold text-foreground">{formatCurrency(claimsAmount)}</span>
            <span className="text-xs text-muted-foreground mt-1">
              {claims.length} active claims
            </span>
          </div>
        </div>

        {/* Arrow down */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-px h-8 bg-border" />
          <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-full">
            <Equal className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="w-px h-8 bg-border" />
        </div>

        {/* Total */}
        <div className="flex flex-col items-center p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary rounded-2xl min-w-[300px]">
          <span className="text-lg font-semibold text-muted-foreground mb-2">Total Cash & Equivalents</span>
          <span className={cn(
            "text-4xl font-bold",
            totalCashEquivalents >= 0 ? "text-green-600" : "text-destructive"
          )}>
            {formatCurrency(totalCashEquivalents)}
          </span>
          <span className="text-sm text-muted-foreground mt-3">
            = {formatCurrency(cashInBankAmount)} + {formatCurrency(inventoryAmount)} + {formatCurrency(receivablesAmount)} − {formatCurrency(claimsAmount)}
          </span>
        </div>
      </div>

      {/* Dialogs */}
      <CashInBankDialog 
        open={cashInBankOpen} 
        onOpenChange={setCashInBankOpen}
        asOfDate={formattedDate}
      />
      <InventoryDetailsDialog 
        open={inventoryOpen} 
        onOpenChange={setInventoryOpen}
        invoices={inventoryInvoices}
        payments={payments}
        orders={enrichedOrders}
      />
      <ReceivablesDetailsDialog 
        open={receivablesOpen} 
        onOpenChange={setReceivablesOpen}
        invoices={receivableInvoices}
        orders={enrichedOrders}
        blOrders={blOrders}
      />
      <ClaimsDetailsDialog 
        open={claimsOpen} 
        onOpenChange={setClaimsOpen}
        claims={claims}
      />
    </div>
  );
}