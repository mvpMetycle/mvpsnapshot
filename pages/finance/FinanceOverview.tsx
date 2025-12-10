import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, startOfQuarter, startOfYear, subMonths, parseISO, isWithinInterval } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, DollarSign, BarChart3, ArrowRight, Filter, Target, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";

// Helper functions
const formatCurrency = (amount: number, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
};

interface DateRange {
  from: Date;
  to: Date;
}

interface Revenue {
  id: string;
  bl_order_id: number | null;
  bl_order_name: string | null;
  recognition_date: string;
  final_invoice_amount: number;
  allocated_downpayment_amount: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
}

interface Ticket {
  id: number;
  type: string;
  status: string;
  commodity_type: string | null;
  quantity: number | null;
  price: number | null;
  signed_volume: number | null;
  company_id: number | null;
  trader_id: number | null;
  transaction_type: string | null;
  created_at: string | null;
}

interface Order {
  id: string;
  commodity_type: string | null;
  margin: number | null;
  buyer: string | null;
  seller: string | null;
  transaction_type: string | null;
  allocated_quantity_mt: number | null;
  buy_price: number | null;
  sell_price: number | null;
}

interface BlOrder {
  id: number;
  bl_order_name: string | null;
  order_id: string | null;
  loaded_quantity_mt: number | null;
}

interface Invoice {
  id: number;
  order_id: string | null;
  bl_order_name: string | null;
  invoice_type: string | null;
  invoice_direction: string | null;
  total_amount: number | null;
  issue_date: string | null;
  status: string | null;
  company_name: string | null;
}

interface Company {
  id: number;
  name: string;
}

interface Trader {
  id: number;
  name: string;
}

export default function FinanceOverview() {
  const queryClient = useQueryClient();
  
  // State for filters
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date()
  });
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedTrader, setSelectedTrader] = useState<string>("");
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  
  // State for drill-down modals
  const [revenueModalOpen, setRevenueModalOpen] = useState(false);
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [signedPipelineModalOpen, setSignedPipelineModalOpen] = useState(false);
  const [chartBreakdownBy, setChartBreakdownBy] = useState<"company" | "trader" | "commodity">("commodity");

  // Fetch revenue data
  const { data: revenues = [] } = useQuery({
    queryKey: ["revenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue")
        .select("*");
      if (error) throw error;
      return data as Revenue[];
    }
  });

  // Fetch tickets (for pipeline)
  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket")
        .select("id, type, status, commodity_type, quantity, price, signed_volume, company_id, trader_id, transaction_type, created_at")
        .is("deleted_at", null);
      if (error) throw error;
      return data as Ticket[];
    }
  });

  // Fetch orders (for margin)
  const { data: orders = [] } = useQuery({
    queryKey: ["orders-finance-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order")
        .select("id, commodity_type, margin, buyer, seller, transaction_type, allocated_quantity_mt, buy_price, sell_price")
        .is("deleted_at", null);
      if (error) throw error;
      return data as Order[];
    }
  });

  // Fetch BL orders (for linking)
  const { data: blOrders = [] } = useQuery({
    queryKey: ["bl-orders-finance-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bl_order")
        .select("id, bl_order_name, order_id, loaded_quantity_mt")
        .is("deleted_at", null);
      if (error) throw error;
      return data as BlOrder[];
    }
  });

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-finance-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice")
        .select("id, order_id, bl_order_name, invoice_type, invoice_direction, total_amount, issue_date, status, company_name")
        .is("deleted_at", null);
      if (error) throw error;
      return data as Invoice[];
    }
  });

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ["companies-finance-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Company")
        .select("id, name");
      if (error) throw error;
      return data as Company[];
    }
  });

  // Fetch traders
  const { data: traders = [] } = useQuery({
    queryKey: ["traders-finance-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("traders")
        .select("id, name");
      if (error) throw error;
      return data as Trader[];
    }
  });

  // Helper to check if invoice is a final invoice
  const isFinalInvoice = (invoiceType: string | null) => {
    if (!invoiceType) return false;
    const normalized = invoiceType.toLowerCase().trim();
    return normalized === "final" || normalized === "final invoice";
  };

  // Helper to check if invoice is receivable
  const isReceivable = (direction: string | null) => {
    if (!direction) return false;
    return direction.toLowerCase().trim() === "receivable";
  };

  // Mutation to sync revenue table - fetches fresh data directly from Supabase
  const syncRevenueMutation = useMutation({
    mutationFn: async () => {
      // Fetch fresh data directly from Supabase to avoid stale cache issues
      const { data: freshInvoices, error: invoicesError } = await supabase
        .from("invoice")
        .select("id, order_id, bl_order_name, invoice_type, invoice_direction, total_amount, issue_date, status, company_name")
        .is("deleted_at", null);
      
      if (invoicesError) throw invoicesError;

      const { data: freshBlOrders, error: blError } = await supabase
        .from("bl_order")
        .select("id, bl_order_name, order_id, loaded_quantity_mt")
        .is("deleted_at", null);
      
      if (blError) throw blError;

      const { data: freshOrders, error: ordersError } = await supabase
        .from("order")
        .select("id, commodity_type, margin, buyer, seller, transaction_type, allocated_quantity_mt, buy_price, sell_price")
        .is("deleted_at", null);
      
      if (ordersError) throw ordersError;

      // Find all final receivable invoices at BL level using fresh data
      const finalInvoices = (freshInvoices || []).filter(
        (inv) =>
          isReceivable(inv.invoice_direction) &&
          isFinalInvoice(inv.invoice_type) &&
          inv.bl_order_name
      );

      console.log("Found final invoices:", finalInvoices.length, finalInvoices);

      let processedCount = 0;

      for (const inv of finalInvoices) {
        const blOrder = (freshBlOrders || []).find((bl) => bl.bl_order_name === inv.bl_order_name);
        console.log("BL Order for", inv.bl_order_name, ":", blOrder);
        
        if (!blOrder) {
          console.log("No BL order found for", inv.bl_order_name);
          continue;
        }

        const order = blOrder.order_id 
          ? (freshOrders || []).find((o) => o.id === blOrder.order_id) 
          : null;
        console.log("Order for", blOrder.order_id, ":", order);

        // Calculate downpayment allocation
        const orderDownpayments = (freshInvoices || []).filter(
          (dpInv) =>
            dpInv.order_id === blOrder.order_id &&
            isReceivable(dpInv.invoice_direction) &&
            dpInv.invoice_type?.toLowerCase().includes("downpayment")
        );

        const totalOrderDownpayment = orderDownpayments.reduce(
          (sum, dp) => sum + (dp.total_amount || 0),
          0
        );

        const totalOrderQty = order?.allocated_quantity_mt || 1;
        const blQty = blOrder.loaded_quantity_mt || 0;
        const allocationRatio = totalOrderQty > 0 ? blQty / totalOrderQty : 0;
        const allocatedDownpayment = allocationRatio * totalOrderDownpayment;

        const totalRevenue = (inv.total_amount || 0) + allocatedDownpayment;

        console.log("Processing revenue for", inv.bl_order_name, {
          bl_order_id: blOrder.id,
          recognition_date: inv.issue_date,
          final_invoice_amount: inv.total_amount,
          allocated_downpayment_amount: allocatedDownpayment,
          total_revenue: totalRevenue,
        });

        // First check if record exists
        const { data: existing } = await supabase
          .from("revenue")
          .select("id")
          .eq("bl_order_name", inv.bl_order_name)
          .maybeSingle();

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from("revenue")
            .update({
              bl_order_id: blOrder.id,
              recognition_date: inv.issue_date || format(new Date(), "yyyy-MM-dd"),
              final_invoice_amount: inv.total_amount || 0,
              allocated_downpayment_amount: allocatedDownpayment,
              total_revenue: totalRevenue,
            })
            .eq("id", existing.id);

          if (error) {
            console.error("Error updating revenue:", error);
          } else {
            processedCount++;
          }
        } else {
          // Insert new
          const { error } = await supabase.from("revenue").insert({
            bl_order_id: blOrder.id,
            bl_order_name: inv.bl_order_name,
            recognition_date: inv.issue_date || format(new Date(), "yyyy-MM-dd"),
            final_invoice_amount: inv.total_amount || 0,
            allocated_downpayment_amount: allocatedDownpayment,
            total_revenue: totalRevenue,
          });

          if (error) {
            console.error("Error inserting revenue:", error);
          } else {
            processedCount++;
          }
        }
      }

      return processedCount;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
      toast.success(`Revenue data synchronized: ${count} records processed`);
    },
    onError: (error) => {
      toast.error("Failed to sync revenue");
      console.error(error);
    },
  });

  // Computed values based on filters
  const filteredRevenues = useMemo(() => {
    return revenues.filter((rev) => {
      if (!rev.recognition_date) return false;
      const recDate = parseISO(rev.recognition_date);
      const inDateRange = isWithinInterval(recDate, { start: dateRange.from, end: dateRange.to });
      if (!inDateRange) return false;

      // Get related BL order and order for filtering
      const blOrder = blOrders.find((bl) => bl.bl_order_name === rev.bl_order_name);
      const order = blOrder ? orders.find((o) => o.id === blOrder.order_id) : null;

      if (selectedCommodities.length > 0 && order) {
        if (!order.commodity_type || !selectedCommodities.includes(order.commodity_type)) {
          return false;
        }
      }

      if (selectedTransactionType && order) {
        if (order.transaction_type !== selectedTransactionType) {
          return false;
        }
      }

      return true;
    });
  }, [revenues, dateRange, blOrders, orders, selectedCommodities, selectedTransactionType]);

  const totalRevenue = filteredRevenues.reduce((sum, r) => sum + r.total_revenue, 0);

  // MTD, QTD, YTD calculations
  const today = new Date();
  const mtdStart = startOfMonth(today);
  const qtdStart = startOfQuarter(today);
  const ytdStart = startOfYear(today);

  const mtdRevenue = revenues
    .filter((r) => {
      if (!r.recognition_date) return false;
      const d = parseISO(r.recognition_date);
      return isWithinInterval(d, { start: mtdStart, end: today });
    })
    .reduce((sum, r) => sum + r.total_revenue, 0);

  const qtdRevenue = revenues
    .filter((r) => {
      if (!r.recognition_date) return false;
      const d = parseISO(r.recognition_date);
      return isWithinInterval(d, { start: qtdStart, end: today });
    })
    .reduce((sum, r) => sum + r.total_revenue, 0);

  const ytdRevenue = revenues
    .filter((r) => {
      if (!r.recognition_date) return false;
      const d = parseISO(r.recognition_date);
      return isWithinInterval(d, { start: ytdStart, end: today });
    })
    .reduce((sum, r) => sum + r.total_revenue, 0);

  // Pipeline calculations from tickets
  const totalPipelineValue = tickets.reduce((sum, t) => sum + (t.signed_volume || 0), 0);
  const signedPipelineValue = tickets
    .filter((t) => t.status === "Approved" || t.status === "Signed")
    .reduce((sum, t) => sum + (t.signed_volume || 0), 0);

  const conversionRate = totalPipelineValue > 0 ? signedPipelineValue / totalPipelineValue : 0;
  const takeRate = signedPipelineValue > 0 ? totalRevenue / signedPipelineValue : 0;

  // Revenue by month for chart - Trailing 12 months from all revenues
  const revenueByMonth = useMemo(() => {
    const monthMap: Record<string, number> = {};
    const twelveMonthsAgo = subMonths(new Date(), 12);
    
    revenues.forEach((r) => {
      if (!r.recognition_date) return;
      const recDate = parseISO(r.recognition_date);
      if (recDate < twelveMonthsAgo) return;
      
      const monthKey = format(recDate, "MMM yyyy");
      monthMap[monthKey] = (monthMap[monthKey] || 0) + r.total_revenue;
    });
    return Object.entries(monthMap)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });
  }, [revenues]);

  // Revenue breakdown by dimension
  const revenueBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    
    filteredRevenues.forEach((r) => {
      const blOrder = blOrders.find((bl) => bl.bl_order_name === r.bl_order_name);
      const order = blOrder ? orders.find((o) => o.id === blOrder.order_id) : null;
      
      let key = "Unknown";
      if (chartBreakdownBy === "commodity" && order?.commodity_type) {
        key = order.commodity_type;
      } else if (chartBreakdownBy === "company") {
        // Get company from invoice
        const invoice = invoices.find(
          (inv) => inv.bl_order_name === r.bl_order_name && inv.invoice_type?.toLowerCase().includes("final")
        );
        key = invoice?.company_name || "Unknown";
      } else if (chartBreakdownBy === "trader") {
        key = "Trader"; // Would need trader mapping
      }
      
      breakdown[key] = (breakdown[key] || 0) + r.total_revenue;
    });

    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredRevenues, blOrders, orders, invoices, chartBreakdownBy]);

  // Unique values for filters
  const commodityTypes = [...new Set(orders.map((o) => o.commodity_type).filter(Boolean))] as string[];
  const transactionTypes = ["b2b", "inventory", "warehouse"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Finance Overview</h1>
          <p className="text-muted-foreground mt-1">
            Monitor revenue and pipeline performance
          </p>
        </div>
        <Button 
          onClick={() => syncRevenueMutation.mutate()} 
          variant="outline" 
          size="sm"
          disabled={syncRevenueMutation.isPending}
        >
          {syncRevenueMutation.isPending ? "Syncing..." : "Sync Revenue Data"}
        </Button>
      </div>

      {/* Global Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Filters:</span>
            </div>

            {/* Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[240px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Commodity Filter */}
            <Select
              value={selectedCommodities.join(",") || "all"}
              onValueChange={(v) => setSelectedCommodities(v === "all" ? [] : [v])}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Commodity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Commodities</SelectItem>
                {commodityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Transaction Type Filter */}
            <Select
              value={selectedTransactionType || "all"}
              onValueChange={(v) => setSelectedTransactionType(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {transactionTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards - Revenue Only */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onDoubleClick={() => setRevenueModalOpen(true)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue (USD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Double-click for details</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MTD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(mtdRevenue)}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">QTD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(qtdRevenue)}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">YTD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(ytdRevenue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Time Series Chart - Trailing 12 Months */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue by Month (Trailing 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis 
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Revenue Breakdown</CardTitle>
              <Select value={chartBreakdownBy} onValueChange={(v: "company" | "trader" | "commodity") => setChartBreakdownBy(v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commodity">Commodity</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="trader">Trader</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number"
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  className="text-xs"
                />
                <YAxis type="category" dataKey="name" className="text-xs" width={100} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="value" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Funnel Section */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Funnel Bars */}
            <div className="space-y-3">
              {/* Total Pipeline */}
              <div
                className="flex items-center gap-4 cursor-pointer hover:opacity-80"
                onDoubleClick={() => setPipelineModalOpen(true)}
              >
                <div className="w-32 text-sm font-medium text-muted-foreground">Total Pipeline</div>
                <div className="flex-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg h-12 relative overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-lg flex items-center justify-end pr-4"
                    style={{ width: "100%" }}
                  >
                    <span className="text-white font-bold">{formatCurrency(totalPipelineValue)}</span>
                  </div>
                </div>
              </div>

              {/* Signed Pipeline with Conversion Rate */}
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-muted-foreground">Signed Pipeline</div>
                <div className="flex-1 flex items-center gap-4">
                  <div
                    className="flex-1 bg-green-100 dark:bg-green-900/30 rounded-lg h-12 relative overflow-hidden cursor-pointer hover:opacity-80"
                    style={{ maxWidth: `${Math.max(conversionRate * 100, 20)}%` }}
                    onDoubleClick={() => setSignedPipelineModalOpen(true)}
                  >
                    <div className="h-full bg-green-500 rounded-lg flex items-center justify-end pr-4 w-full">
                      <span className="text-white font-bold text-sm">{formatCurrency(signedPipelineValue)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      {formatPercent(conversionRate)} Conversion
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Revenue with Take Rate */}
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-muted-foreground">Revenue</div>
                <div className="flex-1 flex items-center gap-4">
                  <div
                    className="flex-1 bg-red-100 dark:bg-red-900/30 rounded-lg h-12 relative overflow-hidden cursor-pointer hover:opacity-80"
                    style={{ maxWidth: `${Math.max((totalRevenue / totalPipelineValue) * 100, 15)}%` }}
                    onDoubleClick={() => setRevenueModalOpen(true)}
                  >
                    <div className="h-full bg-red-500 rounded-lg flex items-center justify-end pr-4 w-full">
                      <span className="text-white font-bold text-sm">{formatCurrency(totalRevenue)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                      {formatPercent(takeRate)} Take Rate
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Drill-Down Modal */}
      <Dialog open={revenueModalOpen} onOpenChange={setRevenueModalOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revenue Details</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recognition Date</TableHead>
                <TableHead>BL Order</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Commodity</TableHead>
                <TableHead className="text-right">Final Invoice</TableHead>
                <TableHead className="text-right">Downpayment</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRevenues.map((rev) => {
                const blOrder = blOrders.find((bl) => bl.bl_order_name === rev.bl_order_name);
                const order = blOrder ? orders.find((o) => o.id === blOrder.order_id) : null;
                const invoice = invoices.find(
                  (inv) => inv.bl_order_name === rev.bl_order_name && inv.invoice_type?.toLowerCase().includes("final")
                );
                
                return (
                  <TableRow key={rev.id}>
                    <TableCell>{format(parseISO(rev.recognition_date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-medium">{rev.bl_order_name}</TableCell>
                    <TableCell>{blOrder?.order_id || "-"}</TableCell>
                    <TableCell>{invoice?.company_name || "-"}</TableCell>
                    <TableCell>
                      {order?.commodity_type ? (
                        <Badge variant="secondary">{order.commodity_type}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(rev.final_invoice_amount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(rev.allocated_downpayment_amount)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(rev.total_revenue)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>


      {/* Pipeline Drill-Down Modal */}
      <Dialog open={pipelineModalOpen} onOpenChange={setPipelineModalOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Total Pipeline Details</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Commodity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Deal Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => {
                const company = companies.find((c) => c.id === ticket.company_id);
                return (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">#{ticket.id}</TableCell>
                    <TableCell>
                      <Badge variant={ticket.type === "Buy" ? "default" : "secondary"}>
                        {ticket.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{company?.name || "-"}</TableCell>
                    <TableCell>
                      {ticket.commodity_type ? (
                        <Badge variant="outline">{ticket.commodity_type}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={ticket.status === "Approved" || ticket.status === "Signed" ? "default" : "secondary"}
                      >
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(ticket.signed_volume || 0)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Signed Pipeline Drill-Down Modal */}
      <Dialog open={signedPipelineModalOpen} onOpenChange={setSignedPipelineModalOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Signed Pipeline Details</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Commodity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Deal Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets
                .filter((t) => t.status === "Approved" || t.status === "Signed")
                .map((ticket) => {
                  const company = companies.find((c) => c.id === ticket.company_id);
                  return (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">#{ticket.id}</TableCell>
                      <TableCell>
                        <Badge variant={ticket.type === "Buy" ? "default" : "secondary"}>
                          {ticket.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{company?.name || "-"}</TableCell>
                      <TableCell>
                        {ticket.commodity_type ? (
                          <Badge variant="outline">{ticket.commodity_type}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{ticket.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(ticket.signed_volume || 0)}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
