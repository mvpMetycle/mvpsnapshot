import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Loader2, 
  Plus, 
  Search, 
  MoreHorizontal, 
  RefreshCw, 
  CalendarIcon, 
  Eye, 
  PlusCircle, 
  Edit, 
  Trash2,
  Link as LinkIcon,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { HedgeExecutionDrawer } from "./HedgeExecutionDrawer";
import { HedgeExecutionDialog } from "./HedgeExecutionDialog";
import { RequestRollDialog } from "./RequestRollDialog";
import Fuse from "fuse.js";
import type { Database } from "@/integrations/supabase/types";

type HedgeExecution = Database["public"]["Tables"]["hedge_execution"]["Row"];

// Helper functions for formatting
const formatQty = (value: number | null | undefined): string =>
  value == null ? "—" : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatPrice = (value: number | null | undefined, currency?: string): string =>
  value == null
    ? "—"
    : `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency ?? "USD"}`;

export function HedgeLedgerTab() {
  const [selectedExecution, setSelectedExecution] = useState<HedgeExecution | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [rollDialogOpen, setRollDialogOpen] = useState(false);
  const [executionToRoll, setExecutionToRoll] = useState<HedgeExecution | null>(null);
  
  // Filters
  const [metalFilter, setMetalFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [brokerFilter, setBrokerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 3));
  const [endDate, setEndDate] = useState<Date | undefined>(addMonths(new Date(), 3));

  const { data: executions, isLoading } = useQuery({
    queryKey: ["hedge-executions", metalFilter, directionFilter, brokerFilter, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("hedge_execution")
        .select("*")
        .is("deleted_at", null)
        .order("execution_date", { ascending: false });

      if (metalFilter !== "all") {
        query = query.eq("metal", metalFilter as Database["public"]["Enums"]["commodity_type_enum"]);
      }
      if (directionFilter !== "all") {
        query = query.eq("direction", directionFilter as Database["public"]["Enums"]["hedge_direction"]);
      }
      if (brokerFilter !== "all") {
        query = query.eq("broker_name", brokerFilter);
      }
      if (startDate) {
        query = query.gte("execution_date", format(startDate, "yyyy-MM-dd"));
      }
      if (endDate) {
        query = query.lte("execution_date", format(endDate, "yyyy-MM-dd"));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as HedgeExecution[];
    },
  });

  // Get unique brokers for filter dropdown
  const { data: allBrokers } = useQuery({
    queryKey: ["hedge-brokers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hedge_execution")
        .select("broker_name")
        .is("deleted_at", null)
        .not("broker_name", "is", null);
      
      if (error) throw error;
      const uniqueBrokers = [...new Set(data.map((d) => d.broker_name).filter(Boolean))] as string[];
      return uniqueBrokers.sort();
    },
  });

  // Fuzzy search
  const filteredExecutions = useMemo(() => {
    if (!executions) return [];
    if (!searchQuery.trim()) return executions;

    const fuse = new Fuse(executions, {
      keys: ["id", "metal", "direction", "broker_name", "contract_reference", "instrument", "notes", "exchange"],
      threshold: 0.3,
    });

    return fuse.search(searchQuery).map((result) => result.item);
  }, [executions, searchQuery]);

  // Fetch link counts for each execution
  const { data: linkCounts } = useQuery({
    queryKey: ["hedge-link-counts", executions?.map((e) => e.id)],
    queryFn: async () => {
      if (!executions?.length) return {};
      
      const { data, error } = await supabase
        .from("hedge_link")
        .select("hedge_execution_id")
        .in("hedge_execution_id", executions.map((e) => e.id));
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach((link) => {
        counts[link.hedge_execution_id] = (counts[link.hedge_execution_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!executions?.length,
  });

  const handleRowClick = (execution: HedgeExecution) => {
    setSelectedExecution(execution);
    setDrawerOpen(true);
  };

  const handleRollClick = (execution: HedgeExecution, e: React.MouseEvent) => {
    e.stopPropagation();
    setExecutionToRoll(execution);
    setRollDialogOpen(true);
  };

  const canRoll = (execution: HedgeExecution) => {
    const status = execution.status || "OPEN";
    return status === "OPEN" || status === "PARTIALLY_CLOSED";
  };

  // Calculate summary metrics - using quantity_mt only, not open_quantity_mt
  const summaryMetrics = useMemo(() => {
    if (!filteredExecutions.length) return { totalContracts: 0, netQty: 0, openExposure: 0 };
    
    const totalContracts = filteredExecutions.length;
    
    // Net Qty = sum of direction-signed quantities across all contracts
    const netQty = filteredExecutions.reduce((acc, exec) => {
      const qty = exec.quantity_mt || 0;
      return acc + (exec.direction === "Sell" ? -qty : qty);
    }, 0);
    
    // Open Exposure = sum of quantities for OPEN status contracts with same sign convention
    const openExposure = filteredExecutions.reduce((acc, exec) => {
      const status = exec.status || "OPEN";
      if (status !== "OPEN") return acc;
      const qty = exec.quantity_mt || 0;
      return acc + (exec.direction === "Sell" ? -qty : qty);
    }, 0);
    
    return { totalContracts, netQty, openExposure };
  }, [filteredExecutions]);

  // Exposure bar calculation
  const exposureBarWidth = Math.min(100, Math.abs(summaryMetrics.netQty) * 0.5);
  const isNetShort = summaryMetrics.netQty < 0;
  const isNetLong = summaryMetrics.netQty > 0;

  const getQtyColorClass = (value: number) => {
    if (value < 0) return "text-red-600 dark:text-red-400";
    if (value > 0) return "text-emerald-600 dark:text-emerald-400";
    return "text-muted-foreground";
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case "OPEN":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "CLOSED":
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
      case "PARTIALLY_CLOSED":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "ROLLED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-foreground">Hedge Ledger</h3>
            <Button onClick={() => setAddDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Contract
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            View and manage all executed and open hedge contracts
          </p>
        </div>

        {/* Date Range Pickers */}
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-[150px] justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {startDate ? format(startDate, "MMM d, yyyy") : "Start"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-sm">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-[150px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {endDate ? format(endDate, "MMM d, yyyy") : "End"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Contracts</p>
          </div>
          <p className="text-3xl font-bold text-right mt-1">
            {summaryMetrics.totalContracts}
          </p>
        </Card>

        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Net Qty (MT)</p>
            {isNetLong && <TrendingUp className="h-4 w-4 text-emerald-500" />}
            {isNetShort && <TrendingDown className="h-4 w-4 text-red-500" />}
          </div>
          <p className={cn("text-3xl font-bold text-right mt-1", getQtyColorClass(summaryMetrics.netQty))}>
            {summaryMetrics.netQty >= 0 ? "+" : ""}{formatQty(summaryMetrics.netQty)}
          </p>
          {/* Exposure Bar */}
          <div className="mt-3 space-y-1">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  isNetShort ? "bg-red-500" : isNetLong ? "bg-emerald-500" : "bg-muted"
                )}
                style={{ width: `${exposureBarWidth}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {isNetShort ? "Net Short" : isNetLong ? "Net Long" : "Flat"}
            </p>
          </div>
        </Card>

        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Open Exposure (MT)</p>
          </div>
          <p className={cn("text-3xl font-bold text-right mt-1", getQtyColorClass(summaryMetrics.openExposure))}>
            {summaryMetrics.openExposure >= 0 ? "+" : ""}{formatQty(summaryMetrics.openExposure)}
          </p>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap py-3 border-y border-border/50">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ledger..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={metalFilter} onValueChange={setMetalFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Metal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Metals</SelectItem>
            <SelectItem value="Copper">Copper</SelectItem>
            <SelectItem value="Aluminium">Aluminium</SelectItem>
            <SelectItem value="Zinc">Zinc</SelectItem>
            <SelectItem value="Nickel">Nickel</SelectItem>
            <SelectItem value="Lead">Lead</SelectItem>
            <SelectItem value="Tin">Tin</SelectItem>
          </SelectContent>
        </Select>

        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            <SelectItem value="Buy">Buy</SelectItem>
            <SelectItem value="Sell">Sell</SelectItem>
          </SelectContent>
        </Select>

        <Select value={brokerFilter} onValueChange={setBrokerFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Broker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brokers</SelectItem>
            {allBrokers?.map((broker) => (
              <SelectItem key={broker} value={broker}>
                {broker}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredExecutions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
          {searchQuery ? "No matching executions found" : "No hedge executions found"}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky left-0 z-20 bg-muted/30 min-w-[100px]">Hedge ID</TableHead>
                  <TableHead className="min-w-[100px]">Broker</TableHead>
                  <TableHead className="min-w-[120px]">Instrument</TableHead>
                  <TableHead className="min-w-[90px]">Metal</TableHead>
                  <TableHead className="min-w-[90px]">Direction</TableHead>
                  <TableHead className="min-w-[110px] text-right">Qty (MT)</TableHead>
                  <TableHead className="min-w-[130px] text-right">Trade Price</TableHead>
                  <TableHead className="min-w-[110px]">Trade Date</TableHead>
                  <TableHead className="min-w-[110px]">Maturity</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[70px] text-center">Links</TableHead>
                  <TableHead className="w-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExecutions.map((execution) => {
                  const status = execution.status || "OPEN";
                  
                  return (
                    <TableRow 
                      key={execution.id} 
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => handleRowClick(execution)}
                    >
                      <TableCell className="sticky left-0 z-10 bg-background font-mono text-sm font-medium">
                        {execution.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-sm">{execution.broker_name || "—"}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span>{execution.instrument}</span>
                          {execution.contract_reference && (
                            <span className="text-xs text-muted-foreground">{execution.contract_reference}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{execution.metal}</TableCell>
                      <TableCell>
                        <Badge 
                          className={cn(
                            "text-xs font-medium",
                            execution.direction === "Buy" 
                              ? "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" 
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          )}
                        >
                          {execution.direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatQty(execution.quantity_mt)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatPrice(execution.executed_price, execution.executed_price_currency || undefined)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(execution.execution_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {execution.expiry_date
                          ? format(new Date(execution.expiry_date), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", getStatusBadgeVariant(status))}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {linkCounts?.[execution.id] ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <LinkIcon className="h-3 w-3" />
                            {linkCounts[execution.id]}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(execution);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Add Closing Trade
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!canRoll(execution)}
                              onClick={(e) => handleRollClick(execution, e as any)}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Roll Contract
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Trade
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled className="text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <HedgeExecutionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        execution={selectedExecution}
      />

      <HedgeExecutionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      <RequestRollDialog
        open={rollDialogOpen}
        onOpenChange={setRollDialogOpen}
        execution={executionToRoll}
      />
    </div>
  );
}