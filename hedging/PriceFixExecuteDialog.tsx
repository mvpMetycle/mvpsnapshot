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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type HedgeRequest = Database["public"]["Tables"]["hedge_request"]["Row"];

interface PriceFixExecuteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: HedgeRequest | null;
  onSuccess?: () => void;
}

const CURRENCIES = ["USD", "EUR", "GBP"];

export function PriceFixExecuteDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: PriceFixExecuteDialogProps) {
  const queryClient = useQueryClient();

  const [executedPrice, setExecutedPrice] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("USD");
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split("T")[0]);
  const [maturityDate, setMaturityDate] = useState("");
  const [maturityDateError, setMaturityDateError] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && request) {
      setExecutedPrice("");
      setPriceCurrency(request.target_price_currency || "USD");
      setTradeDate(new Date().toISOString().split("T")[0]);
      setMaturityDate("");
      setMaturityDateError("");
      setNotes("");
    }
  }, [open, request]);

  const executeMutation = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error("No request selected");

      // Fetch original execution's deal details if this is a price fix (linked_execution_id exists)
      let inheritedOrderId = request.order_id;
      let inheritedBlOrderId = request.bl_order_id;
      let inheritedTicketId = request.ticket_id;

      if (request.linked_execution_id) {
        // Get original execution's hedge_links to inherit deal details
        const { data: originalLinks } = await supabase
          .from("hedge_link")
          .select("link_id, link_level")
          .eq("hedge_execution_id", request.linked_execution_id);

        if (originalLinks && originalLinks.length > 0) {
          for (const link of originalLinks) {
            if (link.link_level === "Order" && !inheritedOrderId) {
              inheritedOrderId = link.link_id;
            } else if (link.link_level === "Bl_order" && !inheritedBlOrderId) {
              inheritedBlOrderId = parseInt(link.link_id);
            } else if (link.link_level === "Ticket" && !inheritedTicketId) {
              inheritedTicketId = parseInt(link.link_id);
            }
          }
        }

        // Also check the original request for deal info
        const { data: originalRequest } = await supabase
          .from("hedge_request")
          .select("order_id, bl_order_id, ticket_id")
          .eq("id", request.linked_execution_id)
          .maybeSingle();

        // Fallback: check original execution's request
        const { data: origExec } = await supabase
          .from("hedge_execution")
          .select("hedge_request_id")
          .eq("id", request.linked_execution_id)
          .maybeSingle();

        if (origExec?.hedge_request_id) {
          const { data: origReq } = await supabase
            .from("hedge_request")
            .select("order_id, bl_order_id, ticket_id")
            .eq("id", origExec.hedge_request_id)
            .maybeSingle();

          if (origReq) {
            if (!inheritedOrderId) inheritedOrderId = origReq.order_id;
            if (!inheritedBlOrderId) inheritedBlOrderId = origReq.bl_order_id;
            if (!inheritedTicketId) inheritedTicketId = origReq.ticket_id;
          }
        }
      }

      // 1. Create new hedge_execution with opposite direction (already set in request)
      const { data: newExecution, error: execError } = await supabase
        .from("hedge_execution")
        .insert({
          hedge_request_id: request.id,
          metal: request.metal,
          direction: request.direction, // Already opposite from original
          quantity_mt: request.quantity_mt,
          executed_price: parseFloat(executedPrice),
          executed_price_currency: priceCurrency,
          execution_date: tradeDate,
          expiry_date: maturityDate,
          broker_name: request.broker_preference || "StoneX",
          reference_type: request.reference,
          instrument: "Future",
          status: "OPEN",
          notes: notes || null,
        })
        .select()
        .single();

      if (execError) throw execError;

      // 2. Create hedge_link to connect to the physical (use inherited values)
      const linkLevel = inheritedBlOrderId ? "Bl_order" : inheritedOrderId ? "Order" : inheritedTicketId ? "Ticket" : null;
      const linkId = inheritedBlOrderId?.toString() || inheritedOrderId || inheritedTicketId?.toString();

      if (linkId && linkLevel) {
        const { error: linkError } = await supabase
          .from("hedge_link")
          .insert({
            hedge_execution_id: newExecution.id,
            link_id: linkId,
            link_level: linkLevel,
            allocated_quantity_mt: request.quantity_mt,
            side: request.direction === "Buy" ? "BUY" : "SELL",
            direction: request.direction,
            metal: request.metal,
            exec_price: parseFloat(executedPrice),
            fixing_price: parseFloat(executedPrice),
          });

        if (linkError) throw linkError;
      }

      // 3. Create pricing_fixing record to track the physical price fixation (use inherited values)
      const { error: fixingError } = await supabase
        .from("pricing_fixing")
        .insert({
          metal: request.metal,
          quantity_mt: request.quantity_mt,
          final_price: parseFloat(executedPrice),
          final_price_currency: priceCurrency,
          fixed_at: new Date().toISOString(),
          reference: request.reference,
          level: linkLevel?.toUpperCase() || "ORDER",
          order_id: inheritedOrderId || null,
          bl_order_id: inheritedBlOrderId || null,
          ticket_id: inheritedTicketId || null,
          notes: notes ? `[Price Fix] ${notes}` : "[Price Fix]",
        });

      if (fixingError) throw fixingError;

      // 4. Update the original hedge execution's open quantity (if linked_execution_id exists)
      if (request.linked_execution_id) {
        // Get original execution
        const { data: originalExec } = await supabase
          .from("hedge_execution")
          .select("open_quantity_mt, quantity_mt")
          .eq("id", request.linked_execution_id)
          .single();

        if (originalExec) {
          const currentOpen = originalExec.open_quantity_mt ?? originalExec.quantity_mt;
          const newOpen = Math.max(0, currentOpen - request.quantity_mt);
          const newStatus = newOpen <= 0 ? "CLOSED" : "PARTIALLY_CLOSED";

          await supabase
            .from("hedge_execution")
            .update({
              open_quantity_mt: newOpen,
              status: newStatus,
              closed_price: newOpen <= 0 ? parseFloat(executedPrice) : null,
              closed_at: newOpen <= 0 ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", request.linked_execution_id);
        }
      }

      // 5. Update hedge_request status to Executed
      const { error: updateError } = await supabase
        .from("hedge_request")
        .update({
          status: "Executed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      return newExecution;
    },
    onSuccess: () => {
      toast.success("Price fix executed successfully");
      queryClient.invalidateQueries({ queryKey: ["hedge-executions"] });
      queryClient.invalidateQueries({ queryKey: ["hedge-requests"] });
      queryClient.invalidateQueries({ queryKey: ["hedge-links"] });
      queryClient.invalidateQueries({ queryKey: ["linked-hedges"] });
      queryClient.invalidateQueries({ queryKey: ["pricing-fixings"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Failed to execute price fix: " + error.message);
    },
  });

  const handleSubmit = () => {
    // Clear previous errors
    setMaturityDateError("");
    
    if (!executedPrice || parseFloat(executedPrice) <= 0) {
      toast.error("Please enter a valid executed price");
      return;
    }
    if (!tradeDate) {
      toast.error("Please select a trade date");
      return;
    }
    if (!maturityDate) {
      setMaturityDateError("Maturity date is required");
      toast.error("Please select a maturity date");
      return;
    }
    executeMutation.mutate();
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Execute Price Fix</DialogTitle>
          <DialogDescription>
            Create a hedge execution with trade price and maturity for this price fix request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Request info */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">Metal</Label>
              <p className="font-medium">{request.metal}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Direction</Label>
              <Badge variant={request.direction === "Buy" ? "default" : "secondary"}>
                {request.direction}
              </Badge>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Quantity (MT)</Label>
              <p className="font-medium">{request.quantity_mt.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Broker</Label>
              <p className="font-medium">{request.broker_preference || "StoneX"}</p>
            </div>
          </div>

          {/* Execution inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Executed Price *</Label>
              <Input
                type="number"
                step="0.01"
                value={executedPrice}
                onChange={(e) => setExecutedPrice(e.target.value)}
                placeholder="e.g. 9500.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={priceCurrency} onValueChange={setPriceCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Trade Date *</Label>
              <Input
                type="date"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Maturity (Expiry Date) *</Label>
              <Input
                type="date"
                value={maturityDate}
                onChange={(e) => {
                  setMaturityDate(e.target.value);
                  setMaturityDateError("");
                }}
                className={maturityDateError ? "border-destructive" : ""}
              />
              {maturityDateError && (
                <p className="text-xs text-destructive">{maturityDateError}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Execution notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={executeMutation.isPending}>
            {executeMutation.isPending ? "Executing..." : "Execute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}