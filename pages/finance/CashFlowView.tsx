import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, getWeek, eachWeekOfInterval, eachDayOfInterval, isSameDay, isWithinInterval } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, ArrowDownCircle, ArrowUpCircle, Wallet, ChevronDown, ChevronRight, ExternalLink, Landmark, FileText, FileMinus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { OverduesTab } from "@/components/finance/OverduesTab";
interface Invoice {
  id: number;
  invoice_number: string | null;
  total_amount: number | null;
  company_name: string | null;
  bl_order_name: string | null;
  order_id: string | null;
  invoice_direction: string | null;
  invoice_type: string | null;
  actual_due_date: string | null;
  original_due_date: string | null;
  status: string | null;
  currency: string | null;
}

interface WeekData {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  receivables: number;
  payables: number;
  invoices: Invoice[];
}

interface DayData {
  date: Date;
  receivables: number;
  payables: number;
  invoices: Invoice[];
}

interface CashBankBalance {
  id: string;
  as_of_date: string;
  amount: number;
  currency: string;
  notes: string | null;
  account_name: string | null;
}

export default function CashFlowView() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 60));
  const [useCashInBank, setUseCashInBank] = useState<boolean>(true);
  const [manualCashBalance, setManualCashBalance] = useState<string>("0");
  const [cashAsOfDate, setCashAsOfDate] = useState<Date>(new Date());
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedNoteWeek, setExpandedNoteWeek] = useState<number | null>(null);
  const [expandedNoteDay, setExpandedNoteDay] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("forecast");

  // Fetch cash in bank data
  const { data: allCashBalances = [] } = useQuery({
    queryKey: ['cash-bank-balance-cashflow', format(cashAsOfDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_bank_balance')
        .select('*')
        .lte('as_of_date', format(cashAsOfDate, "yyyy-MM-dd"))
        .order('as_of_date', { ascending: false });
      
      if (error) throw error;
      return data as CashBankBalance[];
    },
    enabled: useCashInBank,
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

  // Calculate the effective beginning cash balance
  const beginningCashBalance = useCashInBank ? cashInBankAmount : (parseFloat(manualCashBalance) || 0);

  // Fetch all unpaid invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["cashflow-invoices", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice")
        .select("*")
        .is("deleted_at", null)
        .neq("status", "Paid");

      if (error) throw error;
      return (data || []) as Invoice[];
    },
  });

  // Get effective due date for an invoice
  const getEffectiveDueDate = (invoice: Invoice): Date | null => {
    const dateStr = invoice.actual_due_date || invoice.original_due_date;
    if (!dateStr) return null;
    return new Date(dateStr);
  };

  // Filter invoices within date range
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const dueDate = getEffectiveDueDate(inv);
      if (!dueDate) return false;
      return isWithinInterval(dueDate, { start: startOfDay(startDate), end: endOfDay(endDate) });
    });
  }, [invoices, startDate, endDate]);

  // Helper to check if invoice is a credit or debit note
  const isCreditDebitNote = (inv: Invoice): boolean => {
    const type = (inv.invoice_type || "").toLowerCase();
    return type === "credit note" || type === "debit note";
  };

  // Calculate totals (excluding credit/debit notes from receivables/payables)
  const totals = useMemo(() => {
    let receivables = 0;
    let payables = 0;
    let creditNotes = 0;
    let debitNotes = 0;

    filteredInvoices.forEach((inv) => {
      const amount = inv.total_amount || 0;
      const type = (inv.invoice_type || "").toLowerCase();
      
      if (type === "credit note") {
        creditNotes += amount;
      } else if (type === "debit note") {
        debitNotes += amount;
      } else if (inv.invoice_direction === "receivable") {
        receivables += amount;
      } else if (inv.invoice_direction === "payable") {
        payables += amount;
      }
    });

    const expectedEndCash = beginningCashBalance + receivables - payables;

    return { receivables, payables, expectedEndCash, beginningCash: beginningCashBalance, creditNotes, debitNotes };
  }, [filteredInvoices, beginningCashBalance]);

  // Group invoices by week
  const weeklyData = useMemo(() => {
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
    
    return weeks.map((weekStart): WeekData => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekNumber = getWeek(weekStart, { weekStartsOn: 1 });
      
      const weekInvoices = filteredInvoices.filter((inv) => {
        const dueDate = getEffectiveDueDate(inv);
        if (!dueDate) return false;
        return isWithinInterval(dueDate, { start: startOfDay(weekStart), end: endOfDay(weekEnd) });
      });

      let receivables = 0;
      let payables = 0;
      weekInvoices.forEach((inv) => {
        const amount = inv.total_amount || 0;
        // Exclude credit/debit notes from receivables/payables
        if (isCreditDebitNote(inv)) return;
        
        if (inv.invoice_direction === "receivable") {
          receivables += amount;
        } else if (inv.invoice_direction === "payable") {
          payables += amount;
        }
      });

      return { weekNumber, weekStart, weekEnd, receivables, payables, invoices: weekInvoices };
    }).filter(w => w.invoices.length > 0 || w.receivables > 0 || w.payables > 0);
  }, [filteredInvoices, startDate, endDate]);

  // Get daily data for a specific week
  const getDailyData = (weekStart: Date, weekEnd: Date): DayData[] => {
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    return days.map((day): DayData => {
      const dayInvoices = filteredInvoices.filter((inv) => {
        const dueDate = getEffectiveDueDate(inv);
        if (!dueDate) return false;
        return isSameDay(dueDate, day);
      });

      let receivables = 0;
      let payables = 0;
      dayInvoices.forEach((inv) => {
        const amount = inv.total_amount || 0;
        // Exclude credit/debit notes from receivables/payables
        if (isCreditDebitNote(inv)) return;
        
        if (inv.invoice_direction === "receivable") {
          receivables += amount;
        } else if (inv.invoice_direction === "payable") {
          payables += amount;
        }
      });

      return { date: day, receivables, payables, invoices: dayInvoices };
    }).filter(d => d.invoices.length > 0);
  };

  // Credit/Debit Notes weekly data
  const notesWeeklyData = useMemo(() => {
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
    
    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekNumber = getWeek(weekStart, { weekStartsOn: 1 });
      
      const weekInvoices = filteredInvoices.filter((inv) => {
        const dueDate = getEffectiveDueDate(inv);
        if (!dueDate) return false;
        if (!isCreditDebitNote(inv)) return false;
        return isWithinInterval(dueDate, { start: startOfDay(weekStart), end: endOfDay(weekEnd) });
      });

      let creditNotes = 0;
      let debitNotes = 0;
      weekInvoices.forEach((inv) => {
        const amount = inv.total_amount || 0;
        const type = (inv.invoice_type || "").toLowerCase();
        if (type === "credit note") {
          creditNotes += amount;
        } else if (type === "debit note") {
          debitNotes += amount;
        }
      });

      return { weekNumber, weekStart, weekEnd, creditNotes, debitNotes, invoices: weekInvoices };
    }).filter(w => w.invoices.length > 0);
  }, [filteredInvoices, startDate, endDate]);

  // Get daily credit/debit notes data for a specific week
  const getNotesDailyData = (weekStart: Date, weekEnd: Date) => {
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    return days.map((day) => {
      const dayInvoices = filteredInvoices.filter((inv) => {
        const dueDate = getEffectiveDueDate(inv);
        if (!dueDate) return false;
        if (!isCreditDebitNote(inv)) return false;
        return isSameDay(dueDate, day);
      });

      let creditNotes = 0;
      let debitNotes = 0;
      dayInvoices.forEach((inv) => {
        const amount = inv.total_amount || 0;
        const type = (inv.invoice_type || "").toLowerCase();
        if (type === "credit note") {
          creditNotes += amount;
        } else if (type === "debit note") {
          debitNotes += amount;
        }
      });

      return { date: day, creditNotes, debitNotes, invoices: dayInvoices };
    }).filter(d => d.invoices.length > 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleViewDeal = (invoice: Invoice) => {
    if (invoice.bl_order_name) {
      // Navigate to BL order - need to fetch bl_order_id first
      navigate(`/bl-level`);
    } else if (invoice.order_id) {
      navigate(`/inventory/${invoice.order_id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cash Flow View</h1>
          <p className="text-muted-foreground mt-1">
            {activeTab === "forecast" 
              ? "Forward-looking cash flow forecast based on upcoming receivables and payables"
              : "Amount of cash overdue from unpaid Receivables and Payables"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="forecast">CF Forecast</TabsTrigger>
          <TabsTrigger value="overdues">Overdues</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-6 mt-6">
          {/* Filters */}
          <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* Date Range */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Period Range:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">→</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Beginning Cash Balance */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="use-cash-in-bank"
                  checked={useCashInBank}
                  onCheckedChange={setUseCashInBank}
                />
                <Label htmlFor="use-cash-in-bank" className="text-sm text-muted-foreground cursor-pointer">
                  Use Cash in Bank
                </Label>
              </div>

              {useCashInBank ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
                    <Landmark className="h-4 w-4 text-primary" />
                    <span className="font-medium">{formatCurrency(cashInBankAmount)}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">as of</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(cashAsOfDate, "MMM d, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={cashAsOfDate}
                        onSelect={(date) => date && setCashAsOfDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Manual Balance:</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={manualCashBalance}
                      onChange={(e) => setManualCashBalance(e.target.value)}
                      className="w-[150px] pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Bubbles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Receivables */}
        <Card className="border-2 border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <ArrowDownCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receivables</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.receivables)}</p>
                <p className="text-xs text-muted-foreground">Expected inflows</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payables */}
        <Card className="border-2 border-red-500/30 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <ArrowUpCircle className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payables</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.payables)}</p>
                <p className="text-xs text-muted-foreground">Expected outflows</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expected End Cash */}
        <Card className="border-2 border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Wallet className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expected End Cash</p>
                <p className={cn("text-2xl font-bold", totals.expectedEndCash >= 0 ? "text-blue-600" : "text-red-600")}>
                  {formatCurrency(totals.expectedEndCash)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(totals.beginningCash)} + {formatCurrency(totals.receivables)} - {formatCurrency(totals.payables)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit & Debit Notes - Independent Boxes */}
      <div className="flex flex-wrap justify-center gap-4">
        {/* Credit Notes */}
        <Card className="border border-border bg-muted/30 min-w-[180px]">
          <CardContent className="py-4 px-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Credit Notes</p>
                <p className="text-lg font-semibold">{formatCurrency(totals.creditNotes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debit Notes */}
        <Card className="border border-border bg-muted/30 min-w-[180px]">
          <CardContent className="py-4 px-6">
            <div className="flex items-center gap-3">
              <FileMinus className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Debit Notes</p>
                <p className="text-lg font-semibold">{formatCurrency(totals.debitNotes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receivables and Payables Detail */}
      <Card>
        <CardHeader>
          <CardTitle>Receivables and Payables Detail</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : weeklyData.length === 0 ? (
            <p className="text-muted-foreground">No invoices found in the selected period.</p>
          ) : (
            <div className="space-y-2">
              {weeklyData.map((week) => (
                <div key={week.weekNumber} className="border rounded-lg overflow-hidden">
                  {/* Week Row */}
                  <div
                    className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => setExpandedWeek(expandedWeek === week.weekNumber ? null : week.weekNumber)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedWeek === week.weekNumber ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">Week {week.weekNumber}</span>
                      <span className="text-sm text-muted-foreground">
                        ({format(week.weekStart, "MMM d")} - {format(week.weekEnd, "MMM d")})
                      </span>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Inflows</p>
                        <p className="font-medium text-green-600">{formatCurrency(week.receivables)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Outflows</p>
                        <p className="font-medium text-red-600">{formatCurrency(week.payables)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Daily Breakdown */}
                  {expandedWeek === week.weekNumber && (
                    <div className="border-t">
                      {getDailyData(week.weekStart, week.weekEnd).map((day) => (
                        <div key={day.date.toISOString()} className="border-b last:border-b-0">
                          {/* Day Row */}
                          <div
                            className="flex items-center justify-between p-3 pl-12 bg-background cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => setExpandedDay(expandedDay === day.date.toISOString() ? null : day.date.toISOString())}
                          >
                            <div className="flex items-center gap-3">
                              {expandedDay === day.date.toISOString() ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-medium">{format(day.date, "EEEE, MMM d")}</span>
                              <Badge variant="secondary">{day.invoices.length} invoice(s)</Badge>
                            </div>
                            <div className="flex items-center gap-8">
                              <div className="text-right">
                                <p className="font-medium text-green-600">{formatCurrency(day.receivables)}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-red-600">{formatCurrency(day.payables)}</p>
                              </div>
                            </div>
                          </div>

                          {/* Invoice Tables - Split by Payables, Receivables, and Credit/Debit Notes */}
                          {expandedDay === day.date.toISOString() && (
                            <div className="pl-16 pr-4 pb-4 space-y-6">
                              {/* Payables Table (excluding credit/debit notes) */}
                              {day.invoices.filter(inv => inv.invoice_direction === "payable" && !isCreditDebitNote(inv)).length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
                                    <ArrowUpCircle className="h-4 w-4" />
                                    Payables ({day.invoices.filter(inv => inv.invoice_direction === "payable" && !isCreditDebitNote(inv)).length})
                                  </h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Order / BL</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {day.invoices
                                        .filter(inv => inv.invoice_direction === "payable" && !isCreditDebitNote(inv))
                                        .map((invoice) => (
                                          <TableRow key={invoice.id}>
                                            <TableCell className="font-medium">{invoice.invoice_number || "-"}</TableCell>
                                            <TableCell>
                                              <Badge variant="secondary">{invoice.invoice_type || "Invoice"}</Badge>
                                            </TableCell>
                                            <TableCell>{invoice.company_name || "-"}</TableCell>
                                            <TableCell>
                                              {invoice.bl_order_name || invoice.order_id || "-"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <span className="text-red-600">
                                                {formatCurrency(invoice.total_amount || 0)}
                                              </span>
                                            </TableCell>
                                            <TableCell>
                                              {invoice.actual_due_date 
                                                ? format(new Date(invoice.actual_due_date), "MMM d, yyyy")
                                                : invoice.original_due_date
                                                ? format(new Date(invoice.original_due_date), "MMM d, yyyy")
                                                : "-"}
                                            </TableCell>
                                            <TableCell>
                                              <Badge variant="outline">{invoice.status || "Draft"}</Badge>
                                            </TableCell>
                                            <TableCell>
                                              {(invoice.order_id || invoice.bl_order_name) && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleViewDeal(invoice)}
                                                >
                                                  <ExternalLink className="h-4 w-4 mr-1" />
                                                  View Deal
                                                </Button>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}

                              {/* Receivables Table (excluding credit/debit notes) */}
                              {day.invoices.filter(inv => inv.invoice_direction === "receivable" && !isCreditDebitNote(inv)).length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-2">
                                    <ArrowDownCircle className="h-4 w-4" />
                                    Receivables ({day.invoices.filter(inv => inv.invoice_direction === "receivable" && !isCreditDebitNote(inv)).length})
                                  </h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Order / BL</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {day.invoices
                                        .filter(inv => inv.invoice_direction === "receivable" && !isCreditDebitNote(inv))
                                        .map((invoice) => (
                                          <TableRow key={invoice.id}>
                                            <TableCell className="font-medium">{invoice.invoice_number || "-"}</TableCell>
                                            <TableCell>
                                              <Badge variant="default">{invoice.invoice_type || "Invoice"}</Badge>
                                            </TableCell>
                                            <TableCell>{invoice.company_name || "-"}</TableCell>
                                            <TableCell>
                                              {invoice.bl_order_name || invoice.order_id || "-"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <span className="text-green-600">
                                                {formatCurrency(invoice.total_amount || 0)}
                                              </span>
                                            </TableCell>
                                            <TableCell>
                                              {invoice.actual_due_date 
                                                ? format(new Date(invoice.actual_due_date), "MMM d, yyyy")
                                                : invoice.original_due_date
                                                ? format(new Date(invoice.original_due_date), "MMM d, yyyy")
                                                : "-"}
                                            </TableCell>
                                            <TableCell>
                                              <Badge variant="outline">{invoice.status || "Draft"}</Badge>
                                            </TableCell>
                                            <TableCell>
                                              {(invoice.order_id || invoice.bl_order_name) && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleViewDeal(invoice)}
                                                >
                                                  <ExternalLink className="h-4 w-4 mr-1" />
                                                  View Deal
                                                </Button>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}

                              {/* Credit/Debit Notes Table */}
                              {day.invoices.filter(inv => isCreditDebitNote(inv)).length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Credit & Debit Notes ({day.invoices.filter(inv => isCreditDebitNote(inv)).length})
                                  </h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Order / BL</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {day.invoices
                                        .filter(inv => isCreditDebitNote(inv))
                                        .map((invoice) => (
                                          <TableRow key={invoice.id}>
                                            <TableCell className="font-medium">{invoice.invoice_number || "-"}</TableCell>
                                            <TableCell>
                                              <Badge variant="outline">{invoice.invoice_type || "Invoice"}</Badge>
                                            </TableCell>
                                            <TableCell>{invoice.company_name || "-"}</TableCell>
                                            <TableCell>
                                              {invoice.bl_order_name || invoice.order_id || "-"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {formatCurrency(invoice.total_amount || 0)}
                                            </TableCell>
                                            <TableCell>
                                              {invoice.actual_due_date 
                                                ? format(new Date(invoice.actual_due_date), "MMM d, yyyy")
                                                : invoice.original_due_date
                                                ? format(new Date(invoice.original_due_date), "MMM d, yyyy")
                                                : "-"}
                                            </TableCell>
                                            <TableCell>
                                              <Badge variant="outline">{invoice.status || "Draft"}</Badge>
                                            </TableCell>
                                            <TableCell>
                                              {(invoice.order_id || invoice.bl_order_name) && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleViewDeal(invoice)}
                                                >
                                                  <ExternalLink className="h-4 w-4 mr-1" />
                                                  View Deal
                                                </Button>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit and Debit Notes Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Credit and Debit Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : notesWeeklyData.length === 0 ? (
            <p className="text-muted-foreground">No credit or debit notes found in the selected period.</p>
          ) : (
            <div className="space-y-2">
              {notesWeeklyData.map((week) => (
                <div key={`notes-${week.weekNumber}`} className="border rounded-lg overflow-hidden">
                  {/* Week Row */}
                  <div
                    className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => setExpandedNoteWeek(expandedNoteWeek === week.weekNumber ? null : week.weekNumber)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedNoteWeek === week.weekNumber ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">Week {week.weekNumber}</span>
                      <span className="text-sm text-muted-foreground">
                        ({format(week.weekStart, "MMM d")} - {format(week.weekEnd, "MMM d")})
                      </span>
                      <Badge variant="secondary">{week.invoices.length} note(s)</Badge>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Credit Notes</p>
                        <p className="font-medium">{formatCurrency(week.creditNotes)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Debit Notes</p>
                        <p className="font-medium">{formatCurrency(week.debitNotes)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Daily Breakdown */}
                  {expandedNoteWeek === week.weekNumber && (
                    <div className="border-t">
                      {getNotesDailyData(week.weekStart, week.weekEnd).map((day) => (
                        <div key={day.date.toISOString()} className="border-b last:border-b-0">
                          {/* Day Row */}
                          <div
                            className="flex items-center justify-between p-3 pl-12 bg-background cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => setExpandedNoteDay(expandedNoteDay === day.date.toISOString() ? null : day.date.toISOString())}
                          >
                            <div className="flex items-center gap-3">
                              {expandedNoteDay === day.date.toISOString() ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-medium">{format(day.date, "EEEE, MMM d")}</span>
                              <Badge variant="secondary">{day.invoices.length} note(s)</Badge>
                            </div>
                            <div className="flex items-center gap-8">
                              <div className="text-right">
                                <p className="font-medium">{formatCurrency(day.creditNotes)}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{formatCurrency(day.debitNotes)}</p>
                              </div>
                            </div>
                          </div>

                          {/* Notes Table */}
                          {expandedNoteDay === day.date.toISOString() && (
                            <div className="pl-16 pr-4 pb-4">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Order / BL</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {day.invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                      <TableCell className="font-medium">{invoice.invoice_number || "-"}</TableCell>
                                      <TableCell>
                                        <Badge variant={(invoice.invoice_type || "").toLowerCase() === "credit note" ? "default" : "secondary"}>
                                          {invoice.invoice_type || "Note"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{invoice.company_name || "-"}</TableCell>
                                      <TableCell>
                                        {invoice.bl_order_name || invoice.order_id || "-"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatCurrency(invoice.total_amount || 0)}
                                      </TableCell>
                                      <TableCell>
                                        {invoice.actual_due_date 
                                          ? format(new Date(invoice.actual_due_date), "MMM d, yyyy")
                                          : invoice.original_due_date
                                          ? format(new Date(invoice.original_due_date), "MMM d, yyyy")
                                          : "-"}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline">{invoice.status || "Draft"}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        {(invoice.order_id || invoice.bl_order_name) && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleViewDeal(invoice)}
                                          >
                                            <ExternalLink className="h-4 w-4 mr-1" />
                                            View Deal
                                          </Button>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="overdues" className="mt-6">
          <OverduesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
