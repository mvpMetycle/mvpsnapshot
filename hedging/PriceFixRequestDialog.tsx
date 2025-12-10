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

type HedgeExecution = Database["public"]["Tables"]["hedge_execution"]["Row"];

interface PriceFixRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hedgeExecution: HedgeExecution | null;
  orderId: string;
  blOrderId?: number | null;
}

export function PriceFixRequestDialog({
  open,
  onOpenChange,
  hedgeExecution,
  orderId,
  blOrderId,
}: PriceFixRequestDialogProps) {
  const queryClient = useQueryClient();

  const [fixingQty, setFixingQty] = useState("");
  const [fixingDate, setFixingDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  // Reset form when dialog opens with new hedge
  useEffect(() => {
    if (open && hedgeExecution) {
      // Prefill with open quantity or full quantity
      const openQty = hedgeExecution.open_quantity_mt ?? hedgeExecution.quantity_mt;
      setFixingQty(openQty.toFixed(2));
      setFixingDate(new Date().toISOString().split("T")[0]);
      // Prefill expiry date from original hedge if available
      setExpiryDate(hedgeExecution.expiry_date || "");
      setNotes("");
    }
  }, [open, hedgeExecution]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!hedgeExecution) throw new Error("No hedge execution selected");

      // Opposite direction: if original is Sell → request is Buy, and vice versa
      const oppositeDirection = hedgeExecution.direction === "Sell" ? "Buy" : "Sell";

      // Fetch the original hedge request to inherit ticket details
      let ticketId: number | null = null;
      let pricingType: string | null = null;
      let formulaPercent: number | null = null;
      let hedgeMetal: string | null = null;
      let instrumentType: string | null = null;
      
      // First try: get ticket details from the original hedge request
      if (hedgeExecution.hedge_request_id) {
        const { data: originalRequest } = await supabase
          .from("hedge_request")
          .select("ticket_id, pricing_type, formula_percent, hedge_metal, instrument_type")
          .eq("id", hedgeExecution.hedge_request_id)
          .single();
        
        if (originalRequest) {
          ticketId = originalRequest.ticket_id;
          pricingType = originalRequest.pricing_type;
          formulaPercent = originalRequest.formula_percent;
          hedgeMetal = originalRequest.hedge_metal;
          instrumentType = originalRequest.instrument_type;
        }
      }

      // Second try: look up from hedge_link if ticket-level link exists
      if (!ticketId) {
        const { data: ticketLink } = await supabase
          .from("hedge_link")
          .select("link_id, link_level")
          .eq("hedge_execution_id", hedgeExecution.id)
          .eq("link_level", "Ticket")
          .maybeSingle();
        
        if (ticketLink?.link_id) {
          ticketId = parseInt(ticketLink.link_id, 10) || null;
        }
      }

      const { data, error } = await supabase
        .from("hedge_request")
        .insert({
          order_id: orderId,
          bl_order_id: blOrderId || null,
          linked_execution_id: hedgeExecution.id,
          ticket_id: ticketId,
          metal: hedgeExecution.metal,
          direction: oppositeDirection,
          quantity_mt: parseFloat(fixingQty),
          status: "Approved",
          source: "Price_Fix",
          reference: hedgeExecution.reference_type || "LME_CASH",
          broker_preference: hedgeExecution.broker_name,
          // Inherit ticket-related fields from original request
          pricing_type: pricingType,
          formula_percent: formulaPercent,
          hedge_metal: hedgeMetal as any,
          instrument_type: instrumentType as any,
          reason: "PRICE_FIX" as any,
          notes: `Price fixing against hedge ${hedgeExecution.id.slice(0, 8)} for order ${orderId}. Fixing date: ${fixingDate}. Expiry: ${expiryDate}. ${notes}`.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Price fix request created and auto-approved");
      queryClient.invalidateQueries({ queryKey: ["hedge-requests"] });
      queryClient.invalidateQueries({ queryKey: ["linked-hedges"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to create price fix request: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!fixingQty || parseFloat(fixingQty) <= 0) {
      toast.error("Please enter a valid fixing quantity");
      return;
    }
    if (!fixingDate) {
      toast.error("Please select a fixing date");
      return;
    }
    if (!expiryDate) {
      toast.error("Please select an expiry date");
      return;
    }
    const openQty = hedgeExecution?.open_quantity_mt ?? hedgeExecution?.quantity_mt ?? 0;
    if (parseFloat(fixingQty) > openQty) {
      toast.error(`Fixing quantity cannot exceed open quantity (${openQty.toFixed(2)} MT)`);
      return;
    }
    createMutation.mutate();
  };

  if (!hedgeExecution) return null;

  const openQty = hedgeExecution.open_quantity_mt ?? hedgeExecution.quantity_mt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Price Fix Request</DialogTitle>
          <DialogDescription>
            This will create an auto-approved hedge request for price fixing. Execute it from the Hedging → Requests tab.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Read-only hedge info */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">Metal</Label>
              <p className="font-medium">{hedgeExecution.metal}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Broker</Label>
              <p className="font-medium">{hedgeExecution.broker_name || "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Original Direction</Label>
              <Badge variant={hedgeExecution.direction === "Buy" ? "default" : "secondary"}>
                {hedgeExecution.direction}
              </Badge>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Trade Date</Label>
              <p className="font-medium">{format(new Date(hedgeExecution.execution_date), "MMM d, yyyy")}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Original Qty (MT)</Label>
              <p className="font-medium">{hedgeExecution.quantity_mt.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Open Qty (MT)</Label>
              <p className="font-medium text-primary">{openQty.toFixed(2)}</p>
            </div>
          </div>

          {/* Fixing Direction Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Fixing Direction: </span>
              <Badge variant={hedgeExecution.direction === "Sell" ? "default" : "secondary"}>
                {hedgeExecution.direction === "Sell" ? "Buy" : "Sell"}
              </Badge>
              <span className="text-muted-foreground ml-2">(opposite of original)</span>
            </p>
          </div>

          {/* Editable fields */}
          <div className="space-y-2">
            <Label>Fixing Quantity (MT) *</Label>
            <Input
              type="number"
              step="0.01"
              value={fixingQty}
              onChange={(e) => setFixingQty(e.target.value)}
              placeholder="0.00"
              max={openQty}
            />
            <p className="text-xs text-muted-foreground">Max: {openQty.toFixed(2)} MT</p>
          </div>

          <div className="space-y-2">
            <Label>Fixing Date *</Label>
            <Input
              type="date"
              value={fixingDate}
              onChange={(e) => setFixingDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Expiry Date *</Label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Contract expiry date</p>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Confirm Price Fix"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
