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

interface RequestRollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execution: HedgeExecution | null;
}

/**
 * Dialog to create a ROLL REQUEST (not execute the roll).
 * This creates a hedge_request with request_type='roll' and related_execution_id
 * pointing to the original execution.
 */
export function RequestRollDialog({
  open,
  onOpenChange,
  execution,
}: RequestRollDialogProps) {
  const queryClient = useQueryClient();

  const [rollQuantity, setRollQuantity] = useState<string>("");
  const [desiredExpiry, setDesiredExpiry] = useState<string>("");
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open && execution) {
      const openQty = execution.open_quantity_mt ?? execution.quantity_mt;
      setRollQuantity(openQty.toFixed(2));
      setDesiredExpiry("");
      setTargetPrice("");
      setNotes("");
    }
  }, [open, execution]);

  const openQty = execution
    ? (execution.open_quantity_mt ?? execution.quantity_mt)
    : 0;
  const rollQty = parseFloat(rollQuantity) || 0;
  const exceedsOpen = rollQty > openQty;
  const isValidQty = rollQty > 0 && !exceedsOpen;

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      if (!execution) throw new Error("No execution selected");

      // Fetch original hedge request to inherit ticket details
      let ticketId: number | null = null;
      let orderId: string | null = null;
      let blOrderId: number | null = null;
      let pricingType: string | null = null;
      let formulaPercent: number | null = null;
      let hedgeMetal: string | null = null;
      let instrumentType: string | null = null;

      if (execution.hedge_request_id) {
        const { data: originalRequest } = await supabase
          .from("hedge_request")
          .select("ticket_id, order_id, bl_order_id, pricing_type, formula_percent, hedge_metal, instrument_type")
          .eq("id", execution.hedge_request_id)
          .single();

        if (originalRequest) {
          ticketId = originalRequest.ticket_id;
          orderId = originalRequest.order_id;
          blOrderId = originalRequest.bl_order_id;
          pricingType = originalRequest.pricing_type;
          formulaPercent = originalRequest.formula_percent;
          hedgeMetal = originalRequest.hedge_metal;
          instrumentType = originalRequest.instrument_type;
        }
      }

      // Create a hedge_request linked to the execution being rolled
      const { error } = await supabase.from("hedge_request").insert({
        metal: execution.metal,
        direction: execution.direction,
        quantity_mt: rollQty,
        target_price: targetPrice ? parseFloat(targetPrice) : null,
        target_price_currency: execution.executed_price_currency || "USD",
        reference: execution.reference_type || "LME_CASH",
        source: "Roll" as "Manual",
        status: "Approved" as "Draft",
        linked_execution_id: execution.id,
        // Inherit ticket-related fields from original request
        ticket_id: ticketId,
        order_id: orderId,
        bl_order_id: blOrderId,
        pricing_type: pricingType,
        formula_percent: formulaPercent,
        hedge_metal: hedgeMetal as any,
        instrument_type: instrumentType as any,
        reason: "ROLL" as any,
        notes: notes
          ? `[ROLL] ${execution.metal} ${rollQty} MT from ${execution.expiry_date || "—"} to ${desiredExpiry || "new month"}\n\n${notes}`
          : `[ROLL] ${execution.metal} ${rollQty} MT from ${execution.expiry_date || "—"} to ${desiredExpiry || "new month"}`,
        broker_preference: execution.broker_name,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Roll request created");
      queryClient.invalidateQueries({ queryKey: ["hedge-requests"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to create roll request: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!isValidQty) {
      toast.error("Please enter a valid roll quantity");
      return;
    }
    createRequestMutation.mutate();
  };

  if (!execution) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Roll</DialogTitle>
          <DialogDescription>
            Create a roll request for hedge {execution.id.slice(0, 8)}. This will
            create a request that needs to be priced before execution.
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
              <Label className="text-xs text-muted-foreground">Direction</Label>
              <Badge
                variant={execution.direction === "Buy" ? "default" : "secondary"}
              >
                {execution.direction}
              </Badge>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Open Qty</Label>
              <p className="font-medium text-primary">{openQty.toFixed(2)} MT</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Current Maturity
              </Label>
              <p className="font-medium">
                {execution.expiry_date
                  ? format(new Date(execution.expiry_date), "MMM yyyy")
                  : "—"}
              </p>
            </div>
          </div>

          {/* Roll Request Inputs */}
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

            <div className="space-y-2">
              <Label>Desired New Expiry (e.g., April 2026)</Label>
              <Input
                type="month"
                value={desiredExpiry}
                onChange={(e) => setDesiredExpiry(e.target.value)}
                placeholder="Select month..."
              />
            </div>

            <div className="space-y-2">
              <Label>Target Price (Optional)</Label>
              <Input
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="e.g. 9550.00"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createRequestMutation.isPending || !isValidQty}
          >
            {createRequestMutation.isPending ? "Creating..." : "Create Roll Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
