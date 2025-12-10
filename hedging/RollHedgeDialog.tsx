import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

type HedgeExecution = Database["public"]["Tables"]["hedge_execution"]["Row"] & {
  open_quantity_mt?: number | null;
};

interface RollHedgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execution: HedgeExecution | null;
}

export function RollHedgeDialog({
  open,
  onOpenChange,
  execution,
}: RollHedgeDialogProps) {
  const queryClient = useQueryClient();

  const [rollQuantity, setRollQuantity] = useState<string>("");
  const [newMaturity, setNewMaturity] = useState<string>("");
  const [newTradePrice, setNewTradePrice] = useState<string>("");
  const [newContractRef, setNewContractRef] = useState<string>("");
  const [newTradeDate, setNewTradeDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState<string>("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open && execution) {
      const openQty = execution.open_quantity_mt ?? execution.quantity_mt;
      setRollQuantity(openQty.toFixed(2));
      setNewMaturity("");
      setNewTradePrice("");
      setNewContractRef("");
      setNewTradeDate(new Date().toISOString().split("T")[0]);
      setNotes("");
    }
  }, [open, execution]);

  const openQty = execution
    ? (execution.open_quantity_mt ?? execution.quantity_mt)
    : 0;
  const rollQty = parseFloat(rollQuantity) || 0;
  const exceedsOpen = rollQty > openQty;
  const isValidQty = rollQty > 0 && !exceedsOpen;

  const rollMutation = useMutation({
    mutationFn: async () => {
      if (!execution) throw new Error("No execution selected");

      // 1. Reduce original hedge open_quantity_mt
      const newOpenQty = openQty - rollQty;
      const newStatus = newOpenQty <= 0 ? "ROLLED" : "PARTIALLY_ROLLED";

      const { error: updateError } = await supabase
        .from("hedge_execution")
        .update({
          open_quantity_mt: Math.max(0, newOpenQty),
          status: newStatus,
          notes: execution.notes
            ? `${execution.notes}\n\nRolled ${rollQty} MT on ${newTradeDate}`
            : `Rolled ${rollQty} MT on ${newTradeDate}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", execution.id);

      if (updateError) throw updateError;

      // 2. Create new hedge_execution
      const { data: newExecution, error: insertError } = await supabase
        .from("hedge_execution")
        .insert({
          metal: execution.metal,
          direction: execution.direction,
          quantity_mt: rollQty,
          open_quantity_mt: rollQty,
          executed_price: parseFloat(newTradePrice),
          executed_price_currency: execution.executed_price_currency || "USD",
          execution_date: newTradeDate,
          expiry_date: newMaturity || null,
          broker_name: execution.broker_name,
          reference_type: execution.reference_type,
          contract_reference: newContractRef || null,
          exchange: execution.exchange,
          instrument: execution.instrument,
          hedge_request_id: execution.hedge_request_id,
          status: "OPEN",
          notes: notes
            ? `Rolled from ${execution.id.slice(0, 8)}\n\n${notes}`
            : `Rolled from ${execution.id.slice(0, 8)}`,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Create hedge_roll record
      const { error: rollError } = await supabase.from("hedge_roll").insert({
        close_execution_id: execution.id,
        open_execution_id: newExecution.id,
        rolled_qty_mt: rollQty,
        roll_date: newTradeDate,
        roll_cost: null, // Could calculate if needed
        reason: notes || null,
        notes: `Rolled ${rollQty} MT from maturity ${execution.expiry_date || "—"} to ${newMaturity || "—"}`,
      });

      if (rollError) throw rollError;

      return newExecution;
    },
    onSuccess: () => {
      toast.success("Hedge rolled successfully");
      queryClient.invalidateQueries({ queryKey: ["hedge-executions"] });
      queryClient.invalidateQueries({ queryKey: ["hedge-rolls"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to roll hedge: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!isValidQty) {
      toast.error("Please enter a valid roll quantity");
      return;
    }
    if (!newMaturity) {
      toast.error("Please enter a new maturity date");
      return;
    }
    if (!newTradePrice || parseFloat(newTradePrice) <= 0) {
      toast.error("Please enter a valid new trade price");
      return;
    }
    rollMutation.mutate();
  };

  if (!execution) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Roll Hedge {execution.id.slice(0, 8)}</DialogTitle>
          <DialogDescription>
            Close part or all of this hedge position and open a new one with a
            different maturity
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Hedge Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Metal</Label>
              <p className="font-medium">{execution.metal}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Broker</Label>
              <p className="font-medium">{execution.broker_name || "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Direction</Label>
              <Badge
                variant={execution.direction === "Buy" ? "default" : "secondary"}
              >
                {execution.direction}
              </Badge>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Qty</Label>
              <p className="font-medium">{execution.quantity_mt.toFixed(2)} MT</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Open Qty</Label>
              <p className="font-medium text-primary">{openQty.toFixed(2)} MT</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Trade Price</Label>
              <p className="font-medium">
                {execution.executed_price.toLocaleString()}{" "}
                {execution.executed_price_currency || "USD"}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Trade Date</Label>
              <p className="font-medium">
                {format(new Date(execution.execution_date), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Current Maturity
              </Label>
              <p className="font-medium">
                {execution.expiry_date
                  ? format(new Date(execution.expiry_date), "MMM d, yyyy")
                  : "—"}
              </p>
            </div>
          </div>

          {/* Roll Inputs */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Roll Quantity (MT) *</Label>
              <Input
                type="number"
                step="0.01"
                value={rollQuantity}
                onChange={(e) => setRollQuantity(e.target.value)}
                placeholder={`Max: ${openQty.toFixed(2)}`}
              />
              {exceedsOpen && (
                <p className="text-xs text-destructive">
                  Cannot exceed open quantity ({openQty.toFixed(2)} MT)
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>New Maturity Date *</Label>
                <Input
                  type="date"
                  value={newMaturity}
                  onChange={(e) => setNewMaturity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>New Trade Date</Label>
                <Input
                  type="date"
                  value={newTradeDate}
                  onChange={(e) => setNewTradeDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>New Trade Price *</Label>
              <Input
                type="number"
                step="0.01"
                value={newTradePrice}
                onChange={(e) => setNewTradePrice(e.target.value)}
                placeholder="e.g. 9550.00"
              />
            </div>

            <div className="space-y-2">
              <Label>New Contract Reference</Label>
              <Input
                value={newContractRef}
                onChange={(e) => setNewContractRef(e.target.value)}
                placeholder="Optional broker ticket ID"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for roll..."
                rows={2}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
            <p>
              Will close <strong>{rollQty.toFixed(2)} MT</strong> of this hedge
              and open a new hedge for the same quantity with maturity{" "}
              <strong>
                {newMaturity
                  ? format(new Date(newMaturity), "MMM d, yyyy")
                  : "—"}
              </strong>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              rollMutation.isPending ||
              !isValidQty ||
              !newMaturity ||
              !newTradePrice
            }
          >
            {rollMutation.isPending ? "Rolling..." : "Roll Hedge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
