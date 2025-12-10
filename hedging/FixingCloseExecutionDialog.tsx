import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type HedgeRequestBase = Database["public"]["Tables"]["hedge_request"]["Row"];
type HedgeRequest = HedgeRequestBase & {
  request_type?: "open" | "roll" | "fixing_close";
  related_execution_id?: string | null;
};
type HedgeExecution = Database["public"]["Tables"]["hedge_execution"]["Row"];

interface FixingCloseExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: HedgeRequest | null;
  onSuccess?: () => void;
}

const CURRENCIES = ["USD", "EUR", "GBP"];

/**
 * Dialog for executing a FIXING_CLOSE request.
 * Creates a closing execution that reduces hedge exposure.
 * No new opening hedge is created.
 */
export function FixingCloseExecutionDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: FixingCloseExecutionDialogProps) {
  const queryClient = useQueryClient();

  // Fetch the original execution linked to this request
  const { data: originalExecution, isLoading: loadingExecution } = useQuery({
    queryKey: ["original-execution-fixing", request?.related_execution_id],
    queryFn: async () => {
      if (!request?.related_execution_id) return null;
      const { data, error } = await supabase
        .from("hedge_execution")
        .select("*")
        .eq("id", request.related_execution_id)
        .single();
      if (error) throw error;
      return data as HedgeExecution;
    },
    enabled: !!request?.related_execution_id && open,
  });

  const [closePrice, setClosePrice] = useState<string>("");
  const [closeCurrency, setCloseCurrency] = useState<string>("USD");
  const [closeDate, setCloseDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [closeQuantity, setCloseQuantity] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Prefill from request and original execution
  useEffect(() => {
    if (open && request && originalExecution) {
      setCloseQuantity(request.quantity_mt.toString());
      setCloseCurrency(originalExecution.executed_price_currency || "USD");
      setClosePrice("");
      setCloseDate(new Date().toISOString().split("T")[0]);
      setNotes("");
    }
  }, [open, request, originalExecution]);

  const openQtyOnOriginal = originalExecution
    ? (originalExecution.open_quantity_mt ?? originalExecution.quantity_mt)
    : 0;
  const closeQty = parseFloat(closeQuantity) || 0;
  const exceedsOpen = closeQty > openQtyOnOriginal;

  const executeMutation = useMutation({
    mutationFn: async () => {
      if (!request || !originalExecution) {
        throw new Error("Missing request or original execution");
      }

      if (!closePrice || parseFloat(closePrice) <= 0) {
        throw new Error("Please enter a valid close price");
      }
      if (closeQty <= 0 || exceedsOpen) {
        throw new Error("Invalid close quantity");
      }

      // 1. Update original execution: reduce open_quantity_mt
      const newOpenQty = openQtyOnOriginal - closeQty;
      const newStatus = newOpenQty <= 0 ? "CLOSED" : "PARTIALLY_CLOSED";

      const { error: updateOrigError } = await supabase
        .from("hedge_execution")
        .update({
          open_quantity_mt: Math.max(0, newOpenQty),
          status: newStatus,
          closed_price: parseFloat(closePrice),
          closed_at: newStatus === "CLOSED" ? new Date().toISOString() : null,
          notes: originalExecution.notes
            ? `${originalExecution.notes}\n\nFixed close ${closeQty} MT on ${closeDate} @ ${closePrice}`
            : `Fixed close ${closeQty} MT on ${closeDate} @ ${closePrice}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", originalExecution.id);

      if (updateOrigError) throw updateOrigError;

      // 2. Create hedge_link record linking to BL or Order (from request)
      if (request.order_id) {
        const { error: linkError } = await supabase.from("hedge_link").insert({
          hedge_execution_id: originalExecution.id,
          link_id: request.order_id,
          link_level: "Order",
          allocated_quantity_mt: closeQty,
          exec_price: originalExecution.executed_price,
          fixing_price: parseFloat(closePrice),
          side: originalExecution.direction === "Buy" ? "BUY" : "SELL",
          metal: originalExecution.metal,
          direction: originalExecution.direction,
          notes: notes || `Fixing close for ${closeQty} MT`,
        });
        if (linkError) throw linkError;
      }

      // 3. Update hedge_request status to Executed
      const { error: reqUpdateError } = await supabase
        .from("hedge_request")
        .update({
          status: "Executed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (reqUpdateError) throw reqUpdateError;
    },
    onSuccess: () => {
      toast.success("Fixing close executed");
      queryClient.invalidateQueries({ queryKey: ["hedge-executions"] });
      queryClient.invalidateQueries({ queryKey: ["hedge-requests"] });
      queryClient.invalidateQueries({ queryKey: ["hedge-links-matching"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to execute fixing close");
    },
  });

  const handleSubmit = () => {
    executeMutation.mutate();
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Execute Fixing Close</DialogTitle>
          <DialogDescription>
            Close part or all of this hedge position to match a pricing fix.
          </DialogDescription>
        </DialogHeader>

        {loadingExecution ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading original execution...
          </div>
        ) : !originalExecution ? (
          <div className="py-8 text-center text-destructive">
            Original execution not found
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Original Hedge Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Metal</Label>
                <p className="font-medium">{originalExecution.metal}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Direction
                </Label>
                <Badge
                  variant={
                    originalExecution.direction === "Buy"
                      ? "default"
                      : "secondary"
                  }
                >
                  {originalExecution.direction}
                </Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Open Qty</Label>
                <p className="font-medium text-primary">
                  {openQtyOnOriginal.toFixed(2)} MT
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Execution Price
                </Label>
                <p className="font-medium">
                  {originalExecution.executed_price.toLocaleString()}{" "}
                  {originalExecution.executed_price_currency || "USD"}
                </p>
              </div>
            </div>

            {/* Close Inputs */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Close Quantity (MT) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={closeQuantity}
                    onChange={(e) => setCloseQuantity(e.target.value)}
                  />
                  {exceedsOpen && (
                    <p className="text-xs text-destructive">
                      Cannot exceed {openQtyOnOriginal.toFixed(2)} MT
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Close Date *</Label>
                  <Input
                    type="date"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Close / Fixing Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={closePrice}
                    onChange={(e) => setClosePrice(e.target.value)}
                    placeholder="e.g. 9500.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={closeCurrency}
                    onChange={(e) => setCloseCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional..."
                  rows={2}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
              <p>
                Will close <strong>{closeQty.toFixed(2)} MT</strong> of the hedge
                at fixing price <strong>{closePrice || "—"}</strong>. No new
                hedge will be opened.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              executeMutation.isPending ||
              loadingExecution ||
              !originalExecution ||
              exceedsOpen
            }
          >
            {executeMutation.isPending ? "Executing..." : "Execute Fixing Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
