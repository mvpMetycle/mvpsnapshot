import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Fuse from "fuse.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, LayoutGrid, List, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { OrdersKanbanBoard } from "./OrdersKanbanBoard";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InventoryManagementDialog } from "./InventoryManagementDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EditOrderDialog } from "./EditOrderDialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useToast } from "@/hooks/use-toast";
import { DeleteWithReasonDialog } from "./DeleteWithReasonDialog";
import { checkOrderDeletable, softDeleteOrder } from "@/hooks/useDeleteEntity";

export const OrdersList = () => {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [commodityFilter, setCommodityFilter] = useState("");
  const [traderFilter, setTraderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch currency and trader info for buy and sell tickets
      const enrichedOrders = await Promise.all(
        (data || []).map(async (order) => {
          const buyTicketIds = order.buyer?.split(",").map((id: string) => parseInt(id.trim())).filter(Boolean) || [];
          const sellTicketIds = order.seller?.split(",").map((id: string) => parseInt(id.trim())).filter(Boolean) || [];

          let buyCurrencies: string[] = [];
          let sellCurrencies: string[] = [];
          let buyTraderNames: string[] = [];
          let sellTraderNames: string[] = [];
          let buyCompanyNames: string[] = [];
          let sellCompanyNames: string[] = [];

          if (buyTicketIds.length > 0) {
            const { data: buyTickets } = await supabase
              .from("ticket")
              .select("currency, trader_id, traders(name), client_name")
              .in("id", buyTicketIds);
            buyCurrencies = buyTickets?.map(t => t.currency).filter(Boolean) || [];
            buyTraderNames = buyTickets?.map(t => (t.traders as any)?.name).filter(Boolean) || [];
            buyCompanyNames = buyTickets?.map(t => t.client_name).filter(Boolean) || [];
          }

          if (sellTicketIds.length > 0) {
            const { data: sellTickets } = await supabase
              .from("ticket")
              .select("currency, trader_id, traders(name), client_name")
              .in("id", sellTicketIds);
            sellCurrencies = sellTickets?.map(t => t.currency).filter(Boolean) || [];
            sellTraderNames = sellTickets?.map(t => (t.traders as any)?.name).filter(Boolean) || [];
            sellCompanyNames = sellTickets?.map(t => t.client_name).filter(Boolean) || [];
          }

          const allCurrencies = [...buyCurrencies, ...sellCurrencies];
          const uniqueCurrencies = [...new Set(allCurrencies)];
          const hasCurrencyMismatch = uniqueCurrencies.length > 1;

          return {
            ...order,
            hasCurrencyMismatch,
            buyTraders: [...new Set(buyTraderNames)].join(", "),
            sellTraders: [...new Set(sellTraderNames)].join(", "),
            buyCompany: [...new Set(buyCompanyNames)].join(", "),
            sellCompany: [...new Set(sellCompanyNames)].join(", "),
          };
        })
      );

      return enrichedOrders;
    },
  });

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteOrder = async (reason: string) => {
    if (!orderToDelete) return;

    setIsDeleting(true);
    try {
      // Check referential integrity first
      const { canDelete, reason: blockReason } = await checkOrderDeletable(orderToDelete);
      
      if (!canDelete) {
        toast({
          title: "Cannot delete order",
          description: blockReason,
          variant: "destructive",
        });
        return;
      }

      // Perform soft delete with reason
      await softDeleteOrder(orderToDelete, reason);
      
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Order deleted",
        description: "The order has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Cannot delete order",
        description: error.message || "Failed to delete order. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting order:", error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  const formatMargin = (margin: number | null | undefined) => {
    if (margin === null || margin === undefined) return "—";
    return `${(margin * 100).toFixed(2)}%`;
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  };

  // Build dynamic filter options from orders data
  const commodityOptions = [
    { value: "", label: "All Commodities" },
    ...(orders
      ? [...new Set(orders.map(o => o.commodity_type).filter(Boolean))]
          .sort()
          .map(commodity => ({ value: commodity, label: commodity }))
      : [])
  ];

  const traderOptions = [
    { value: "", label: "All Traders" },
    ...(orders
      ? [...new Set([
          ...orders.flatMap(o => o.buyTraders?.split(", ").filter(Boolean) || []),
          ...orders.flatMap(o => o.sellTraders?.split(", ").filter(Boolean) || [])
        ])]
          .sort()
          .map(trader => ({ value: trader, label: trader }))
      : [])
  ];

  const statusOptions = [
    { value: "", label: "All Types" },
    ...(orders
      ? [...new Set(orders.map(o => o.transaction_type).filter(Boolean))]
          .sort()
          .map(type => ({ value: type, label: type }))
      : [])
  ];

  // Set up fuzzy search with Fuse.js
  const fuse = useMemo(() => {
    if (!orders) return null;
    return new Fuse(orders, {
      keys: [
        "id",
        "commodity_type",
        "transaction_type",
        "buyer",
        "seller",
        "buyTraders",
        "sellTraders",
        "ship_to",
        "ship_from",
        "isri_grade",
        "product_details",
      ],
      threshold: 0.3,
      ignoreLocation: true,
      includeScore: true,
    });
  }, [orders]);

  // Filter orders based on fuzzy search and dropdown filters
  const filteredOrders = useMemo(() => {
    let results = orders || [];

    // Apply fuzzy search if query exists
    if (searchQuery && fuse) {
      const searchResults = fuse.search(searchQuery);
      results = searchResults.map(result => result.item);
    }

    // Apply dropdown filters
    return results.filter((order) => {
      const product = order.commodity_type || "";
      const transactionType = order.transaction_type || "";
      const buyTraders = (order.buyTraders || "").toLowerCase();
      const sellTraders = (order.sellTraders || "").toLowerCase();
      
      const matchesCommodity = !commodityFilter || product === commodityFilter;
      const matchesStatus = !statusFilter || transactionType === statusFilter;
      const matchesTrader = !traderFilter || 
        buyTraders.includes(traderFilter.toLowerCase()) || 
        sellTraders.includes(traderFilter.toLowerCase());
      
      return matchesCommodity && matchesStatus && matchesTrader;
    });
  }, [orders, searchQuery, fuse, commodityFilter, statusFilter, traderFilter]);

  // Sort filtered orders
  const sortedOrders = filteredOrders?.sort((a, b) => {
    if (!sortColumn) return 0;

    let aVal: any;
    let bVal: any;

    switch (sortColumn) {
      case "id":
        aVal = a.id || "";
        bVal = b.id || "";
        break;
      case "transaction_type":
        aVal = a.transaction_type || "";
        bVal = b.transaction_type || "";
        break;
      case "commodity_type":
        aVal = a.commodity_type || "";
        bVal = b.commodity_type || "";
        break;
      case "quantity":
        aVal = a.allocated_quantity_mt || 0;
        bVal = b.allocated_quantity_mt || 0;
        break;
      case "margin":
        aVal = a.margin || 0;
        bVal = b.margin || 0;
        break;
      default:
        return 0;
    }

    if (typeof aVal === "string") {
      return sortDirection === "asc" 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    }
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Orders</h2>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "list" | "kanban")}>
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" aria-label="Kanban view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Match Tickets
          </Button>
        </div>
      </div>

      <div className="flex items-end gap-4 flex-wrap">
        <div className="w-72 space-y-2">
          <Label>Search Orders</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, commodity, trader..."
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-64 space-y-2">
          <Label>Filter by Commodity</Label>
          <SearchableSelect
            value={commodityFilter}
            onValueChange={setCommodityFilter}
            options={commodityOptions}
            placeholder="All Commodities"
            searchPlaceholder="Search commodities..."
          />
        </div>
        <div className="w-64 space-y-2">
          <Label>Filter by Trader</Label>
          <SearchableSelect
            value={traderFilter}
            onValueChange={setTraderFilter}
            options={traderOptions}
            placeholder="All Traders"
            searchPlaceholder="Search traders..."
          />
        </div>
        <div className="w-64 space-y-2">
          <Label>Filter by Order Type</Label>
          <SearchableSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={statusOptions}
            placeholder="All Types"
            searchPlaceholder="Search types..."
          />
        </div>
      </div>

        {viewMode === "kanban" ? (
          <OrdersKanbanBoard 
            orders={filteredOrders || []} 
            onOrderClick={(orderId) => navigate(`/inventory/${orderId}`)}
          />
        ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("id")}>
                <div className="flex items-center">Order ID<SortIcon column="id" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("transaction_type")}>
                <div className="flex items-center">Order Type<SortIcon column="transaction_type" /></div>
              </TableHead>
              <TableHead>Counterparties</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("commodity_type")}>
                <div className="flex items-center">Commodity<SortIcon column="commodity_type" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 text-right" onClick={() => handleSort("quantity")}>
                <div className="flex items-center justify-end">Quantity (MT)<SortIcon column="quantity" /></div>
              </TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Traders</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 text-right" onClick={() => handleSort("margin")}>
                <div className="flex items-center justify-end">Margin %<SortIcon column="margin" /></div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders && sortedOrders.length > 0 ? (
              sortedOrders.map((order) => (
                <ContextMenu key={order.id}>
                  <ContextMenuTrigger asChild>
                     <TableRow>
                      <TableCell 
                        className="font-medium cursor-pointer hover:underline"
                        onDoubleClick={() => navigate(`/inventory/${order.id}`)}
                      >
                        <div className="flex items-center gap-2">
                          {order.id}
                          {order.hasCurrencyMismatch && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Different currencies</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          order.transaction_type === "B2B" 
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : order.transaction_type === "Inventory" || order.transaction_type === "INVENTORY"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }`}>
                          {order.transaction_type || "B2B"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {order.buyCompany || "—"} → {order.sellCompany || "—"}
                        </span>
                      </TableCell>
                      <TableCell>{order.commodity_type || "—"}</TableCell>
                      <TableCell className="text-right">{order.allocated_quantity_mt || "—"}</TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {order.ship_from || "—"} → {order.ship_to || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {order.buyTraders || "—"} / {order.sellTraders || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatMargin(order.margin)}</TableCell>
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => navigate(`/inventory/${order.id}`)}>
                      View Details
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Order
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        setOrderToDelete(order.id);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Order
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {(searchQuery || commodityFilter || traderFilter || statusFilter)
                    ? "No orders match your search criteria."
                    : "No orders found. Create your first order using the Inventory Management button."
                  }
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      )}

      <InventoryManagementDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
      />

      {selectedOrderId && (
        <EditOrderDialog
          orderId={selectedOrderId}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}

      <DeleteWithReasonDialog
        entityLabel="Order"
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteOrder}
        isDeleting={isDeleting}
      />
    </div>
  );
};
