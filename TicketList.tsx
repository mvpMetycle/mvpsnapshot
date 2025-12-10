import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, XCircle, AlertCircle, Clock, Trash2, Pencil, Search, ArrowUpDown, ArrowUp, ArrowDown, LayoutGrid, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Fuse from "fuse.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { CreateTicketDialog } from "./CreateTicketDialog";
import { SmartTicketWizard } from "./SmartTicketWizard";
import { UnifiedTicketDialog } from "./UnifiedTicketDialog";
import { TicketDetailDialog } from "./TicketDetailDialog";
import { EditTicketDialog } from "./EditTicketDialog";
import { DeleteWithReasonDialog } from "./DeleteWithReasonDialog";
import { checkTicketDeletable, softDeleteTicket } from "@/hooks/useDeleteEntity";
import { TicketsKanbanBoard } from "./TicketsKanbanBoard";
import { ManualMatching } from "./ManualMatching";

export const TicketList = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [initialTicketData, setInitialTicketData] = useState<any>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [editTicketId, setEditTicketId] = useState<number | null>(null);
  const [deleteTicketId, setDeleteTicketId] = useState<number | null>(null);
  const [commodityFilter, setCommodityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [traderFilter, setTraderFilter] = useState("");
  const [counterpartyFilter, setCounterpartyFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "board">("table");
  const [showMatchingDialog, setShowMatchingDialog] = useState(false);
  const [matchingBuyTicketId, setMatchingBuyTicketId] = useState<number | null>(null);
  const [matchingSellTicketId, setMatchingSellTicketId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleVoiceCreateTicket = (parsedData: any, photos: string[]) => {
    setInitialTicketData({ ...parsedData, photos });
    setIsCreateDialogOpen(true);
  };

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket")
        .select(`
          *,
          traders (
            name
          )
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const calculatePrice = (ticket: any) => {
    if (ticket.pricing_type === "Fixed") {
      return ticket.signed_price ? `${formatNumber(ticket.signed_price)}` : "-";
    } else if (ticket.pricing_type === "Formula") {
      if (ticket.lme_price && ticket.payable_percent) {
        const price = ticket.lme_price * ticket.payable_percent;
        return `${formatNumber(price)}*`;
      }
      return "-";
    } else if (ticket.pricing_type === "Index") {
      if (ticket.lme_price && ticket.premium_discount) {
        const price = ticket.lme_price + ticket.premium_discount;
        return `${formatNumber(price)}*`;
      }
      return "-";
    }
    return "-";
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const handleDeleteTicket = async (reason: string) => {
    if (!deleteTicketId) return;

    setIsDeleting(true);

    try {
      // Check referential integrity
      const { canDelete, reason: blockReason } = await checkTicketDeletable(deleteTicketId);

      if (!canDelete) {
        toast({
          title: "Cannot delete ticket",
          description: blockReason,
          variant: "destructive",
        });
        return;
      }

      // Perform soft delete with reason
      await softDeleteTicket(deleteTicketId, reason);

      toast({
        title: "Success",
        description: "Ticket deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete ticket",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteTicketId(null);
    }
  };

  const getStatusVariant = (status: string | null) => {
    if (status === "Approved") return "success";
    if (status === "Rejected") return "destructive";
    if (status === "Pending Approval") return "secondary";
    return "outline";
  };

  const commodityOptions = [
    { value: "", label: "All Commodities" },
    { value: "Aluminium", label: "Aluminium" },
    { value: "Copper", label: "Copper" },
    { value: "Lead", label: "Lead" },
    { value: "Nickel", label: "Nickel" },
    { value: "Tin", label: "Tin" },
    { value: "Zinc", label: "Zinc" },
    { value: "Iron", label: "Iron" },
  ];

  const traderOptions = useMemo(() => {
    const uniqueTraders = Array.from(
      new Set(tickets?.map((t) => t.traders?.name).filter(Boolean))
    );
    return [
      { value: "", label: "All Traders" },
      ...uniqueTraders.map((name) => ({ value: name as string, label: name as string })),
    ];
  }, [tickets]);

  const counterpartyOptions = useMemo(() => {
    const uniqueCounterparties = Array.from(
      new Set(tickets?.map((t) => t.client_name).filter(Boolean))
    );
    return [
      { value: "", label: "All Counterparties" },
      ...uniqueCounterparties.map((name) => ({ value: name as string, label: name as string })),
    ];
  }, [tickets]);

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "Draft", label: "Draft" },
    { value: "Pending Approval", label: "Pending Approval" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
  ];

  const fuse = useMemo(() => {
    if (!tickets) return null;
    return new Fuse(tickets, {
      keys: ["id", "client_name", "commodity_type", "traders.name"],
      threshold: 0.3,
    });
  }, [tickets]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const filteredAndSortedTickets = useMemo(() => {
    let result = tickets || [];

    // Apply search
    if (searchQuery.trim()) {
      result = fuse?.search(searchQuery).map((r) => r.item) || [];
    }

    // Apply filters
    result = result.filter((ticket) => {
      const matchesCommodity = commodityFilter ? ticket.commodity_type === commodityFilter : true;
      const matchesType = typeFilter ? ticket.type === typeFilter : true;
      const matchesStatus = statusFilter ? ticket.status === statusFilter : true;
      const matchesTrader = traderFilter ? ticket.traders?.name === traderFilter : true;
      const matchesCounterparty = counterpartyFilter ? ticket.client_name === counterpartyFilter : true;
      return matchesCommodity && matchesType && matchesStatus && matchesTrader && matchesCounterparty;
    });

    // Apply sorting
    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortColumn) {
          case "status":
            aValue = a.status || "Draft";
            bValue = b.status || "Draft";
            break;
          case "price":
            aValue = a.pricing_type === "Fixed" ? a.signed_price :
                     a.pricing_type === "Formula" && a.lme_price && a.payable_percent ? a.lme_price * a.payable_percent :
                     a.pricing_type === "Index" && a.lme_price && a.premium_discount ? a.lme_price + a.premium_discount : 0;
            bValue = b.pricing_type === "Fixed" ? b.signed_price :
                     b.pricing_type === "Formula" && b.lme_price && b.payable_percent ? b.lme_price * b.payable_percent :
                     b.pricing_type === "Index" && b.lme_price && b.premium_discount ? b.lme_price + b.premium_discount : 0;
            break;
          case "quantity":
            aValue = a.quantity || 0;
            bValue = b.quantity || 0;
            break;
          case "created":
            aValue = new Date(a.created_at || 0).getTime();
            bValue = new Date(b.created_at || 0).getTime();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [tickets, commodityFilter, typeFilter, statusFilter, traderFilter, counterpartyFilter, searchQuery, sortColumn, sortDirection, fuse]);

  if (isLoading) {
    return <div className="text-muted-foreground">Loading tickets...</div>;
  }

  const handleMatchSelected = (buyTicketId: number, sellTicketId: number) => {
    setMatchingBuyTicketId(buyTicketId);
    setMatchingSellTicketId(sellTicketId);
    setShowMatchingDialog(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Tickets</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button 
              variant={viewMode === "table" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setViewMode("table")}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === "board" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setViewMode("board")}
              className="rounded-l-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => { setInitialTicketData(null); setIsCreateDialogOpen(true); }} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Trade Ticket
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, counterparty, commodity, trader..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-end gap-4 flex-wrap">
          <div className="w-48 space-y-2">
            <Label>Status</Label>
            <SearchableSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={statusOptions}
              placeholder="All Statuses"
              searchPlaceholder="Search status..."
            />
          </div>
          {viewMode === "table" && (
            <div className="w-48 space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter || "all"} onValueChange={(value) => setTypeFilter(value === "all" ? "" : value)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Buy">Buy</SelectItem>
                  <SelectItem value="Sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="w-48 space-y-2">
            <Label>Commodity</Label>
            <SearchableSelect
              value={commodityFilter}
              onValueChange={setCommodityFilter}
              options={commodityOptions}
              placeholder="All Commodities"
              searchPlaceholder="Search commodities..."
            />
          </div>
          <div className="w-48 space-y-2">
            <Label>Trader</Label>
            <SearchableSelect
              value={traderFilter}
              onValueChange={setTraderFilter}
              options={traderOptions}
              placeholder="All Traders"
              searchPlaceholder="Search traders..."
            />
          </div>
          <div className="w-48 space-y-2">
            <Label>Counterparty</Label>
            <SearchableSelect
              value={counterpartyFilter}
              onValueChange={setCounterpartyFilter}
              options={counterpartyOptions}
              placeholder="All Counterparties"
              searchPlaceholder="Search counterparties..."
            />
          </div>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    Status
                    <SortIcon column="status" />
                  </div>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Transaction Type</TableHead>
                <TableHead>Commodity</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("quantity")}
                >
                  <div className="flex items-center">
                    Quantity MT
                    <SortIcon column="quantity" />
                  </div>
                </TableHead>
                <TableHead>Transaction Volume</TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("price")}
                >
                  <div className="flex items-center">
                    Price
                    <SortIcon column="price" />
                  </div>
                </TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Pricing Type</TableHead>
                <TableHead>Trader</TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("created")}
                >
                  <div className="flex items-center">
                    Created
                    <SortIcon column="created" />
                  </div>
                </TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTickets?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center text-muted-foreground">
                    {searchQuery || commodityFilter || typeFilter || statusFilter || traderFilter || counterpartyFilter
                      ? "No tickets found for selected filters."
                      : "No tickets found. Create your first trade ticket."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedTickets?.map((ticket) => {
                  const statusIcon = 
                    ticket.status === "Approved" ? <CheckCircle className="h-3 w-3" /> :
                    ticket.status === "Rejected" ? <XCircle className="h-3 w-3" /> :
                    ticket.status === "Pending Approval" ? <AlertCircle className="h-3 w-3" /> :
                    <Clock className="h-3 w-3" />;

                  return (
                    <ContextMenu key={ticket.id}>
                      <ContextMenuTrigger asChild>
                        <TableRow 
                          className="cursor-pointer hover:bg-muted/50"
                          onDoubleClick={() => setSelectedTicketId(ticket.id)}
                        >
                          <TableCell className="font-medium">{ticket.id}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(ticket.status)} className="flex items-center gap-1 w-fit">
                              {statusIcon}
                              {ticket.status || "Draft"}
                            </Badge>
                          </TableCell>
                          <TableCell>{ticket.type}</TableCell>
                          <TableCell>{ticket.transaction_type || "-"}</TableCell>
                          <TableCell>{ticket.commodity_type || "-"}</TableCell>
                          <TableCell>{ticket.client_name || "-"}</TableCell>
                          <TableCell>{formatNumber(ticket.quantity)}</TableCell>
                          <TableCell>{formatNumber(ticket.signed_volume)}</TableCell>
                          <TableCell>{calculatePrice(ticket)}</TableCell>
                          <TableCell>{ticket.currency || "-"}</TableCell>
                          <TableCell>{ticket.pricing_type || "-"}</TableCell>
                          <TableCell>{ticket.traders?.name || "-"}</TableCell>
                          <TableCell>
                            {ticket.created_at
                              ? new Date(ticket.created_at).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditTicketId(ticket.id);
                                }}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTicketId(ticket.id);
                                }}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => setEditTicketId(ticket.id)}>
                          Edit Ticket
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => setSelectedTicketId(ticket.id)}>
                          View Details
                        </ContextMenuItem>
                        <ContextMenuItem 
                          onClick={() => setDeleteTicketId(ticket.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Ticket
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })
              )}
            </TableBody>
          </Table>
          {filteredAndSortedTickets && filteredAndSortedTickets.length > 0 && filteredAndSortedTickets.some(t => t.pricing_type === "Formula" || t.pricing_type === "Index") && (
            <div className="px-4 py-3 text-xs text-muted-foreground border-t">
              * Indicative pricing
            </div>
          )}
        </div>
      ) : (
        <TicketsKanbanBoard 
          tickets={filteredAndSortedTickets || []} 
          onMatchSelected={handleMatchSelected}
        />
      )}

      <UnifiedTicketDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        initialData={initialTicketData}
      />

      <Dialog open={selectedTicketId !== null} onOpenChange={() => setSelectedTicketId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {selectedTicketId && <TicketDetailDialog ticketId={selectedTicketId} />}
        </DialogContent>
      </Dialog>

      <EditTicketDialog
        ticketId={editTicketId}
        open={editTicketId !== null}
        onOpenChange={(open) => !open && setEditTicketId(null)}
      />

      <DeleteWithReasonDialog
        entityLabel="Ticket"
        open={deleteTicketId !== null}
        onOpenChange={(open) => !open && setDeleteTicketId(null)}
        onConfirm={handleDeleteTicket}
        isDeleting={isDeleting}
      />

      <Dialog open={showMatchingDialog} onOpenChange={setShowMatchingDialog}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden p-0">
          <ManualMatching
            onBack={() => setShowMatchingDialog(false)}
            onClose={() => {
              setShowMatchingDialog(false);
              setMatchingBuyTicketId(null);
              setMatchingSellTicketId(null);
            }}
            initialBuyTicketId={matchingBuyTicketId}
            initialSellTicketId={matchingSellTicketId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
