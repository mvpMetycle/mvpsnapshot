import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, AlertTriangle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type HedgeExecution = Database["public"]["Tables"]["hedge_execution"]["Row"] & {
  open_quantity_mt?: number | null;
};

type CommodityType = Database["public"]["Enums"]["commodity_type_enum"];

interface PriceFixingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: "ORDER" | "BL_ORDER";
  orderId?: string;
  blOrderId?: number;
  blOrderName?: string;
  metal?: string;
  qpStart?: string | null;
  qpEnd?: string | null;
  physicalQuantity?: number;
  side?: "buy" | "sell";
}

export function PriceFixingDialog({
  open,
  onOpenChange,
  level,
  orderId,
  blOrderId,
  blOrderName,
  metal,
  qpStart,
  qpEnd,
  physicalQuantity = 0,
  side = "sell",
}: PriceFixingDialogProps) {
  const queryClient = useQueryClient();
  
  const [selectedHedges, setSelectedHedges] = useState<Record<string, boolean>>({});
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [fixingPrice, setFixingPrice] = useState<string>("");
  const [fixingDate, setFixingDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [showAllHedges, setShowAllHedges] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedHedges({});
      setAllocations({});
      setFixingPrice("");
      setFixingDate(new Date().toISOString().split("T")[0]);
      setShowAllHedges(false);
    }
  }, [open]);

  // Fetch already fixed quantity for this physical reference
  const { data: existingFixings } = useQuery({
    queryKey: ["existing-fixings", level, orderId, blOrderId],
    queryFn: async () => {
      let query = supabase
        .from("pricing_fixing")
        .select("quantity_mt")
        .is("deleted_at", null);
      
      if (level === "ORDER" && orderId) {
        query = query.eq("order_id", orderId);
      } else if (level === "BL_ORDER" && blOrderId) {
        query = query.eq("bl_order_id", blOrderId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const alreadyFixedQty = existingFixings?.reduce(
    (sum, f) => sum + (f.quantity_mt || 0),
    0
  ) || 0;
  
  const availableUnfixedQty = Math.max(0, physicalQuantity - alreadyFixedQty);

  // Fetch eligible hedge executions
  const { data: hedges, isLoading: hedgesLoading } = useQuery({
    queryKey: ["eligible-hedges", metal, side, orderId, showAllHedges],
    queryFn: async () => {
      // Map side to hedge direction: buy-side physical => Sell hedge, sell-side physical => Buy hedge
      const hedgeDirection = side === "buy" ? "Sell" : "Buy";
      
      let query = supabase
        .from("hedge_execution")
        .select("*, hedge_request(order_id)")
        .is("deleted_at", null)
        .in("status", ["OPEN", "PARTIALLY_CLOSED"])
        .eq("direction", hedgeDirection);
      
      if (metal) {
        query = query.eq("metal", metal as CommodityType);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      // Filter by order_id if not showing all
      let filtered = data || [];
      if (!showAllHedges && orderId) {
        filtered = filtered.filter(
          (h) => h.hedge_request?.order_id === orderId
        );
      }
      
      return filtered as (HedgeExecution & { hedge_request?: { order_id: string | null } })[];
    },
    enabled: open && !!metal,
  });

  // Calculate open quantity for each hedge
  const hedgesWithOpenQty = useMemo(() => {
    return (hedges || []).map((h) => ({
      ...h,
      openQty: h.open_quantity_mt ?? h.quantity_mt,
    }));
  }, [hedges]);

  // Auto-fill first selected hedge allocation
  useEffect(() => {
    const selectedIds = Object.keys(selectedHedges).filter(
      (id) => selectedHedges[id]
    );
    if (selectedIds.length === 1) {
      const hedge = hedgesWithOpenQty.find((h) => h.id === selectedIds[0]);
      if (hedge && !allocations[selectedIds[0]]) {
        const autoAlloc = Math.min(availableUnfixedQty, hedge.openQty);
        setAllocations({ [selectedIds[0]]: autoAlloc.toFixed(2) });
      }
    }
  }, [selectedHedges, hedgesWithOpenQty, availableUnfixedQty, allocations]);

  const totalAllocation = Object.entries(allocations)
    .filter(([id]) => selectedHedges[id])
    .reduce((sum, [, val]) => sum + (parseFloat(val) || 0), 0);

  const exceedsPhysical = totalAllocation > availableUnfixedQty;
  const hasValidAllocation = totalAllocation > 0;

  // Check if any allocation exceeds hedge open qty
  const allocationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    Object.entries(allocations).forEach(([id, val]) => {
      if (!selectedHedges[id]) return;
      const hedge = hedgesWithOpenQty.find((h) => h.id === id);
      const alloc = parseFloat(val) || 0;
      if (hedge && alloc > hedge.openQty) {
        errors[id] = `Exceeds open qty (${hedge.openQty.toFixed(2)} MT)`;
      }
    });
    return errors;
  }, [allocations, selectedHedges, hedgesWithOpenQty]);

  const hasAllocationErrors = Object.keys(allocationErrors).length > 0;

  const fixingMutation = useMutation({
    mutationFn: async () => {
      const selectedIds = Object.keys(selectedHedges).filter(
        (id) => selectedHedges[id]
      );

      // 1. Create pricing_fixing record
      const { data: fixingData, error: fixingError } = await supabase
        .from("pricing_fixing")
        .insert({
          level: level as string,
          order_id: level === "ORDER" ? orderId : null,
          bl_order_id: level === "BL_ORDER" ? blOrderId : null,
          metal: metal as CommodityType,
          quantity_mt: totalAllocation,
          final_price: parseFloat(fixingPrice),
          final_price_currency: "USD",
          fixed_at: fixingDate,
        })
        .select()
        .single();

      if (fixingError) throw fixingError;

      // 2. For each selected hedge, create hedge_link and update execution
      for (const hedgeId of selectedIds) {
        const allocQty = parseFloat(allocations[hedgeId]) || 0;
        if (allocQty <= 0) continue;

        const hedge = hedgesWithOpenQty.find((h) => h.id === hedgeId);
        if (!hedge) continue;

        // Create hedge_link
        const { error: linkError } = await supabase.from("hedge_link").insert({
          hedge_execution_id: hedgeId,
          link_id: level === "ORDER" ? orderId! : blOrderId!.toString(),
          link_level: level === "ORDER" ? "Order" : "Bl_order",
          allocated_quantity_mt: allocQty,
          side: side.toUpperCase(),
          exec_price: hedge.executed_price,
          fixing_price: parseFloat(fixingPrice),
          fixing_id: fixingData.id,
          metal: metal,
          direction: hedge.direction,
        });

        if (linkError) throw linkError;

        // Update hedge_execution
        const newOpenQty = hedge.openQty - allocQty;
        const newStatus =
          newOpenQty <= 0 ? "CLOSED" : "PARTIALLY_CLOSED";

        const { error: updateError } = await supabase
          .from("hedge_execution")
          .update({
            open_quantity_mt: Math.max(0, newOpenQty),
            status: newStatus,
            closed_price: newOpenQty <= 0 ? parseFloat(fixingPrice) : null,
            closed_at: newOpenQty <= 0 ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", hedgeId);

        if (updateError) throw updateError;
      }

      return fixingData;
    },
    onSuccess: () => {
      toast.success("Price fixing created successfully");
      queryClient.invalidateQueries({ queryKey: ["pricing-fixings"] });
      queryClient.invalidateQueries({ queryKey: ["hedge-executions"] });
      queryClient.invalidateQueries({ queryKey: ["hedge-links"] });
      queryClient.invalidateQueries({ queryKey: ["hedge-link-counts"] });
      queryClient.invalidateQueries({ queryKey: ["existing-fixings"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to create price fixing: " + error.message);
    },
  });

  const handleToggleHedge = (id: string, checked: boolean) => {
    setSelectedHedges((prev) => ({ ...prev, [id]: checked }));
    if (!checked) {
      setAllocations((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleAllocationChange = (id: string, value: string) => {
    setAllocations((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = () => {
    if (!hasValidAllocation) {
      toast.error("Please allocate quantity to at least one hedge");
      return;
    }
    if (exceedsPhysical) {
      toast.error("Total allocation exceeds available unfixed quantity");
      return;
    }
    if (hasAllocationErrors) {
      toast.error("Some allocations exceed hedge open quantity");
      return;
    }
    if (!fixingPrice || parseFloat(fixingPrice) <= 0) {
      toast.error("Please enter a valid fixing price");
      return;
    }
    fixingMutation.mutate();
  };

  const formatQpPeriod = (start?: string | null, end?: string | null) => {
    if (!start && !end) return "—";
    const s = start ? format(new Date(start), "MMM d, yyyy") : "—";
    const e = end ? format(new Date(end), "MMM d, yyyy") : "—";
    return `${s} – ${e}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Price Fix {level === "BL_ORDER" ? "BL" : "Order"}
          </DialogTitle>
          <DialogDescription>
            Fix the price for physical exposure by allocating to hedge executions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Context Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">Level</Label>
              <p className="font-medium">
                {level === "BL_ORDER" ? "BL Order" : "Order"}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Reference</Label>
              <p className="font-medium">
                {level === "BL_ORDER" ? blOrderName || blOrderId : orderId}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Metal</Label>
              <p className="font-medium">{metal || "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">QP Window</Label>
              <p className="font-medium text-sm">{formatQpPeriod(qpStart, qpEnd)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Physical Qty</Label>
              <p className="font-medium">{physicalQuantity.toFixed(2)} MT</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Already Fixed</Label>
              <p className="font-medium">{alreadyFixedQty.toFixed(2)} MT</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Available Unfixed</Label>
              <p className="font-medium text-primary">
                {availableUnfixedQty.toFixed(2)} MT
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Side</Label>
              <Badge variant={side === "buy" ? "default" : "secondary"}>
                {side === "buy" ? "Buy Side" : "Sell Side"}
              </Badge>
            </div>
          </div>

          {/* Hedge Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Select Hedge Execution(s)</h4>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">
                  Show all hedges
                </Label>
                <Switch
                  checked={showAllHedges}
                  onCheckedChange={setShowAllHedges}
                />
              </div>
            </div>

            {hedgesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : hedgesWithOpenQty.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                No eligible hedges found for this metal and side
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Hedge ID</TableHead>
                      <TableHead>Broker</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Open Qty (MT)</TableHead>
                      <TableHead>Trade Price</TableHead>
                      <TableHead>Trade Date</TableHead>
                      <TableHead>Maturity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Allocate (MT)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hedgesWithOpenQty.map((hedge) => (
                      <TableRow key={hedge.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedHedges[hedge.id] || false}
                            onCheckedChange={(checked) =>
                              handleToggleHedge(hedge.id, !!checked)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {hedge.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{hedge.broker_name || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              hedge.direction === "Buy" ? "default" : "secondary"
                            }
                          >
                            {hedge.direction}
                          </Badge>
                        </TableCell>
                        <TableCell>{hedge.openQty.toFixed(2)}</TableCell>
                        <TableCell>
                          {hedge.executed_price.toLocaleString()}{" "}
                          {hedge.executed_price_currency || "USD"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(hedge.execution_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {hedge.expiry_date
                            ? format(new Date(hedge.expiry_date), "MMM d, yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{hedge.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {selectedHedges[hedge.id] && (
                            <div className="space-y-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={allocations[hedge.id] || ""}
                                onChange={(e) =>
                                  handleAllocationChange(hedge.id, e.target.value)
                                }
                                className="w-24"
                                placeholder="0.00"
                              />
                              {allocationErrors[hedge.id] && (
                                <p className="text-xs text-destructive">
                                  {allocationErrors[hedge.id]}
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Total Allocation Summary */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="font-medium">Total quantity to fix:</span>
              <span
                className={`font-bold ${
                  exceedsPhysical ? "text-destructive" : "text-primary"
                }`}
              >
                {totalAllocation.toFixed(2)} MT
              </span>
            </div>
            {exceedsPhysical && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" />
                Total allocation exceeds available unfixed quantity
              </div>
            )}
          </div>

          {/* Fixing Details */}
          <div className="space-y-3">
            <h4 className="font-semibold">Fixing Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fixing Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={fixingPrice}
                  onChange={(e) => setFixingPrice(e.target.value)}
                  placeholder="e.g. 9500.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Fixing Date *</Label>
                <Input
                  type="date"
                  value={fixingDate}
                  onChange={(e) => setFixingDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              fixingMutation.isPending ||
              !hasValidAllocation ||
              exceedsPhysical ||
              hasAllocationErrors
            }
          >
            {fixingMutation.isPending ? "Creating..." : "Create Fixing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
