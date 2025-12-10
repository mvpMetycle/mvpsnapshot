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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type HedgeRequestBase = Database["public"]["Tables"]["hedge_request"]["Row"];
type HedgeRequest = HedgeRequestBase & {
  request_type?: "open" | "roll" | "fixing_close";
  related_execution_id?: string | null;
};
type HedgeExecution = Database["public"]["Tables"]["hedge_execution"]["Row"];

interface RollExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: HedgeRequest | null;
  onSuccess?: () => void;
}

const CURRENCIES = ["USD", "EUR", "GBP"];

/**
 * Dialog for executing a ROLL request. Creates:
 * 1. A closing execution on the original hedge
 * 2. A new opening execution for the new contract month
 * 3. A hedge_roll record linking both
 */
export function RollExecutionDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: RollExecutionDialogProps) {
  const queryClient = useQueryClient();

  // Fetch the original execution linked to this roll request
  const { data: originalExecution, isLoading: loadingExecution } = useQuery({
    queryKey: ["original-execution", request?.related_execution_id],
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

  // Section 1: Close Existing Contract
  const [closePrice, setClosePrice] = useState<string>("");
  const [closeCurrency, setCloseCurrency] = useState<string>("USD");
  const [closeDate, setCloseDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [closeQuantity, setCloseQuantity] = useState<string>("");
  const [closeNotes, setCloseNotes] = useState<string>("");

  // Section 2: Open New Contract
  const [newPrice, setNewPrice] = useState<string>("");
  const [newCurrency, setNewCurrency] = useState<string>("USD");
  const [newExpiryDate, setNewExpiryDate] = useState<string>("");
  const [newTradeDate, setNewTradeDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [newBroker, setNewBroker] = useState<string>("");
  const [newContractRef, setNewContractRef] = useState<string>("");
  const [newNotes, setNewNotes] = useState<string>("");

  // Prefill from original execution and request
  useEffect(() => {
    if (open && request && originalExecution) {
      setCloseQuantity(request.quantity_mt.toString());
      setCloseCurrency(originalExecution.executed_price_currency || "USD");
      setClosePrice("");
      setCloseDate(new Date().toISOString().split("T")[0]);
      setCloseNotes("");

      setNewBroker(originalExecution.broker_name || "StoneX");
      setNewCurrency(originalExecution.executed_price_currency || "USD");
      setNewPrice("");
      setNewExpiryDate("");
      setNewTradeDate(new Date().toISOString().split("T")[0]);
      setNewContractRef("");
      setNewNotes("");
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

      // Validate
      if (!closePrice || parseFloat(closePrice) <= 0) {
        throw new Error("Please enter a valid close price");
      }
      if (!newPrice || parseFloat(newPrice) <= 0) {
        throw new Error("Please enter a valid new contract price");
      }
      if (!newExpiryDate) {
        throw new Error("Please enter a new expiry date");
      }
      if (closeQty <= 0 || exceedsOpen) {
        throw new Error("Invalid close quantity");
      }

      // 1. Update original execution: reduce open_quantity_mt, set status
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
            ? `${originalExecution.notes}\n\nRolled ${closeQty} MT on ${closeDate} @ ${closePrice}`
            : `Rolled ${closeQty} MT on ${closeDate} @ ${closePrice}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", originalExecution.id);

      if (updateOrigError) throw updateOrigError;

      // 2. Create new opening execution
      const { data: newExecution, error: insertError } = await supabase
        .from("hedge_execution")
        .insert({
          metal: originalExecution.metal,
          direction: originalExecution.direction,
          quantity_mt: closeQty,
          open_quantity_mt: closeQty,
          executed_price: parseFloat(newPrice),
          executed_price_currency: newCurrency,
          execution_date: newTradeDate,
          expiry_date: newExpiryDate,
          broker_name: newBroker || originalExecution.broker_name,
          reference_type: originalExecution.reference_type,
          contract_reference: newContractRef || null,
          exchange: originalExecution.exchange,
          instrument: originalExecution.instrument,
          hedge_request_id: request.id,
          status: "OPEN",
          notes: newNotes
            ? `Rolled from ${originalExecution.id.slice(0, 8)}\n\n${newNotes}`
            : `Rolled from ${originalExecution.id.slice(0, 8)}`,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Create hedge_roll record
      const { error: rollError } = await supabase.from("hedge_roll").insert({
        close_execution_id: originalExecution.id,
        open_execution_id: newExecution.id,
        rolled_qty_mt: closeQty,
        roll_date: closeDate,
        roll_cost: null, // Could calculate spread if needed
        roll_cost_currency: closeCurrency,
        reason: closeNotes || null,
        notes: `Rolled ${closeQty} MT ${originalExecution.metal} from ${originalExecution.expiry_date || "—"} to ${newExpiryDate}`,
      });

      if (rollError) throw rollError;

      // 4. Update hedge_request status to Executed
      const { error: reqUpdateError } = await supabase
        .from("hedge_request")
        .update({
          status: "Executed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (reqUpdateError) throw reqUpdateError;

      return newExecution;
    },
    onSuccess: () => {
      toast.success("Roll executed successfully");
      queryClient.invalidateQueries({ queryKey: ["hedge-executions"] });
      queryClient.invalidateQueries({ queryKey: ["hedge-requests"] });
      queryClient.invalidateQueries({ queryKey: ["hedge-rolls"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to execute roll");
    },
  });

  const handleSubmit = () => {
    executeMutation.mutate();
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Execute Roll</DialogTitle>
          <DialogDescription>
            Close the existing position and open a new contract for a different
            maturity.
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
            {/* SECTION 1: Close Existing Contract */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <h4 className="font-semibold">Close Existing Contract</h4>
              </div>

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
                  <Label className="text-xs text-muted-foreground">Broker</Label>
                  <p className="font-medium">
                    {originalExecution.broker_name || "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Original Trade Date
                  </Label>
                  <p className="font-medium">
                    {format(
                      new Date(originalExecution.execution_date),
                      "MMM d, yyyy"
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Original Maturity
                  </Label>
                  <p className="font-medium">
                    {originalExecution.expiry_date
                      ? format(new Date(originalExecution.expiry_date), "MMM yyyy")
                      : "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Open Qty
                  </Label>
                  <p className="font-medium text-primary">
                    {openQtyOnOriginal.toFixed(2)} MT
                  </p>
                </div>
              </div>

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
                  <Label>Close Price *</Label>
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
                <Label>Close Notes</Label>
                <Textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Optional..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* SECTION 2: Open New Contract */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <h4 className="font-semibold">Open New Contract</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>New Broker</Label>
                  <Input
                    value={newBroker}
                    onChange={(e) => setNewBroker(e.target.value)}
                    placeholder="StoneX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Expiry / Contract Month *</Label>
                  <Input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>New Trade Date *</Label>
                  <Input
                    type="date"
                    value={newTradeDate}
                    onChange={(e) => setNewTradeDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="e.g. 9550.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity (MT)</Label>
                  <Input
                    type="number"
                    value={closeQuantity}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Contract Reference</Label>
                <Input
                  value={newContractRef}
                  onChange={(e) => setNewContractRef(e.target.value)}
                  placeholder="Optional broker ticket ID"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Optional..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* SECTION 3: Summary */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
              <p>
                Rolling{" "}
                <Badge variant="outline" className="mx-1">
                  {originalExecution.direction}
                </Badge>
                <strong>{originalExecution.metal}</strong>{" "}
                <strong>{closeQty.toFixed(2)} MT</strong> from{" "}
                <strong>
                  {originalExecution.expiry_date
                    ? format(new Date(originalExecution.expiry_date), "MMM yyyy")
                    : "—"}
                </strong>{" "}
                →{" "}
                <strong>
                  {newExpiryDate
                    ? format(new Date(newExpiryDate), "MMM yyyy")
                    : "—"}
                </strong>
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                P/L on close will be calculated after execution.
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
            {executeMutation.isPending ? "Executing..." : "Execute Roll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
