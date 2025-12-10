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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { TrendingDown, TrendingUp, ShoppingCart, Store } from "lucide-react";
import { mapCommodityToHedgeMetal } from "@/utils/hedgeRequestUtils";

export type HedgeRequestSide = "buy" | "sell";

export type HedgeRequestPrefill = {
  side: HedgeRequestSide;
  ticketId: number;
  orderId: string;
  metal: string | null;
  pricingType: string | null;
  qpStart: string | null;
  qpEnd: string | null;
  qpStartAnchor: string | null;
  qpStartOffsetDays: number | null;
  qpEndAnchor: string | null;
  qpEndOffsetDays: number | null;
  reference: string | null;
  orderQtyMt: number; // The full order quantity
  clientName: string | null; // Client name from ticket
  hedgeDirection: "Buy" | "Sell";
  targetHedgePct: number; // 0-1 decimal, e.g., 0.965 for 96.5%
  targetPrice?: number | null;
  currency?: string | null;
  payablePercent?: number | null; // For formula pricing
  ticketType?: "Buy" | "Sell" | null; // Physical side
};

export interface HedgeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillSides: HedgeRequestPrefill[];
  onCreated: () => void;
}

interface SideFormState {
  enabled: boolean;
  orderQtyMt: number; // Store original order qty for recalculation
  requestedQtyMt: number;
  targetHedgePct: number; // Stored as percentage (0-100)
  hedgeDirection: "Buy" | "Sell";
  targetPrice: number | null;
}

// Helper to build initial form states from prefill data
const buildInitialFormStates = (
  prefillSides: HedgeRequestPrefill[]
): Record<HedgeRequestSide, SideFormState> => {
  // Base defaults: disabled, zero qty
  const base: Record<HedgeRequestSide, SideFormState> = {
    buy: {
      enabled: false,
      orderQtyMt: 0,
      requestedQtyMt: 0,
      targetHedgePct: 100,
      hedgeDirection: "Buy",   // default for BUY
      targetPrice: null,
    },
    sell: {
      enabled: false,
      orderQtyMt: 0,
      requestedQtyMt: 0,
      targetHedgePct: 100,
      hedgeDirection: "Sell",  // default for SELL
      targetPrice: null,
    },
  };

  prefillSides.forEach((prefill) => {
    const targetPct = (prefill.targetHedgePct ?? 1) * 100; // 0.965 -> 96.5
    const computedQty = (prefill.orderQtyMt ?? 0) * (prefill.targetHedgePct ?? 1);

    base[prefill.side] = {
      enabled: true,                       // only sides that have a prefill are enabled
      orderQtyMt: prefill.orderQtyMt ?? 0,
      requestedQtyMt: computedQty,
      targetHedgePct: targetPct,
      hedgeDirection: prefill.side === "buy" ? "Buy" : "Sell",
      targetPrice: prefill.targetPrice ?? null,
    };
  });

  return base;
};

export const HedgeRequestDialog = ({
  open,
  onOpenChange,
  prefillSides,
  onCreated,
}: HedgeRequestDialogProps) => {
  const queryClient = useQueryClient();
  
  // Initialize form state for each side - start with empty defaults
  const [formStates, setFormStates] = useState<Record<HedgeRequestSide, SideFormState>>(
    buildInitialFormStates([])
  );

  // Rebuild form state whenever dialog opens OR prefillSides changes
  useEffect(() => {
    if (open && prefillSides.length > 0) {
      const newStates = buildInitialFormStates(prefillSides);
      setFormStates(newStates);
    }
  }, [open, prefillSides]);

  // Also rebuild when prefillSides array content changes while dialog is open
  useEffect(() => {
    if (open) {
      const newStates = buildInitialFormStates(prefillSides);
      setFormStates(newStates);
    }
  // Stringify prefillSides to detect content changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(prefillSides)]);

  const createHedgeRequestMutation = useMutation({
    mutationFn: async (requests: any[]) => {
      const { data, error } = await supabase
        .from("hedge_request")
        .insert(requests)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hedge-requests"] });
      toast.success("Hedge request(s) created successfully");
      onOpenChange(false);
      onCreated();
    },
    onError: (error) => {
      toast.error(`Failed to create hedge request: ${error.message}`);
    },
  });

  const updateFormState = (side: HedgeRequestSide, updates: Partial<SideFormState>) => {
    setFormStates((prev) => {
      const current = prev[side];
      const newState: SideFormState = { ...current, ...updates };

      // If targetHedgePct changed, recompute requestedQtyMt
      if (updates.targetHedgePct !== undefined) {
        const pctDecimal = updates.targetHedgePct / 100;
        newState.requestedQtyMt = current.orderQtyMt * pctDecimal;
      }

      return {
        ...prev,
        [side]: newState,
      };
    });
  };

  const handleSkip = () => {
    onOpenChange(false);
    onCreated();
  };

  const handleSubmit = async () => {
    const requests: any[] = [];

    prefillSides.forEach((prefill) => {
      const state = formStates[prefill.side];
      if (!state.enabled) return;

      // Use the requestedQtyMt directly (already computed from orderQty * targetPct)
      const hedgeQtyMt = state.requestedQtyMt;
      
      // Map commodity to hedge metal
      const hedgeMetal = mapCommodityToHedgeMetal(prefill.metal);
      
      // Determine reason based on pricing type and side
      let reason: string | null = null;
      if (prefill.pricingType === "Index" || prefill.pricingType === "Formula") {
        reason = prefill.ticketType === "Sell" ? "PHYSICAL_SALE_PRICING" : "PHYSICAL_SALE_PRICING";
      }
      
      // Calculate formula_percent (stored as decimal 0-1)
      const formulaPercent = prefill.payablePercent != null
        ? (prefill.payablePercent > 1.5 ? prefill.payablePercent / 100 : prefill.payablePercent)
        : null;

      requests.push({
        order_id: prefill.orderId,
        ticket_id: prefill.ticketId,
        status: "Pending Approval",
        source: "Auto_QP",
        metal: prefill.metal,
        reference: prefill.reference || "LME_CASH",
        direction: state.hedgeDirection,
        quantity_mt: hedgeQtyMt,
        target_price: state.targetPrice,
        target_price_currency: prefill.currency || "USD",
        broker_preference: null, // No default broker
        notes: `Auto-generated from ticket match. Pricing type: ${prefill.pricingType}. Target hedge: ${state.targetHedgePct}%`,
        // New fields
        instrument_type: "FUTURE",
        reason: reason,
        pricing_type: prefill.pricingType,
        formula_percent: formulaPercent,
        hedge_metal: hedgeMetal,
      });
    });

    if (requests.length === 0) {
      toast.info("No hedge requests to create");
      handleSkip();
      return;
    }

    createHedgeRequestMutation.mutate(requests);
  };

  // Only count sides that actually appear in prefillSides
  const enabledCount = prefillSides.filter(
    (p) => formStates[p.side]?.enabled
  ).length;

  // Sort prefillSides to ensure buy comes first, then sell
  const sortedPrefillSides = [...prefillSides].sort((a, b) => {
    if (a.side === "buy" && b.side === "sell") return -1;
    if (a.side === "sell" && b.side === "buy") return 1;
    return 0;
  });

  const hasBothSides = prefillSides.length === 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={hasBothSides ? "max-w-4xl max-h-[90vh] overflow-y-auto" : "max-w-2xl max-h-[90vh] overflow-y-auto"}>
        <DialogHeader>
          <DialogTitle>Create Hedge Request</DialogTitle>
          <DialogDescription>
            Based on the pricing setup of the matched tickets, hedge requests may be required.
            Review and confirm below.
          </DialogDescription>
        </DialogHeader>

        <div className={hasBothSides ? "grid grid-cols-2 gap-4 py-4" : "space-y-4 py-4"}>
          {sortedPrefillSides.map((prefill) => {
            const state = formStates[prefill.side];
            const sideLabel = prefill.side === "buy" ? "Buy Side" : "Sell Side";
            const DirectionIcon = state.hedgeDirection === "Buy" ? TrendingUp : TrendingDown;

            return (
              <Card key={prefill.side} className={!state.enabled ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{sideLabel}</CardTitle>
                      <Badge variant={prefill.side === "buy" ? "default" : "secondary"}>
                        {prefill.pricingType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`enable-${prefill.side}`} className="text-sm text-muted-foreground">
                        Create
                      </Label>
                      <Switch
                        id={`enable-${prefill.side}`}
                        checked={state.enabled}
                        onCheckedChange={(checked) =>
                          updateFormState(prefill.side, { enabled: checked })
                        }
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Order summary line */}
                  <div className="text-sm font-medium text-foreground flex items-center gap-2 flex-wrap">
                    <span>Order: {state.orderQtyMt.toFixed(2)} MT</span>
                    <span className="text-muted-foreground">•</span>
                    <span>Client: {prefill.clientName || "—"}</span>
                    {prefill.ticketType && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <Badge variant="outline" className="text-xs">
                          {prefill.ticketType === "Buy" ? (
                            <><ShoppingCart className="h-3 w-3 mr-1" /> Purchase</>
                          ) : (
                            <><Store className="h-3 w-3 mr-1" /> Sale</>
                          )}
                        </Badge>
                      </>
                    )}
                  </div>

                  {/* Read-only context */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Ticket:</span>{" "}
                      <span className="font-mono">#{prefill.ticketId}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Metal:</span>{" "}
                      <span>{prefill.metal || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reference:</span>{" "}
                      <span>{prefill.reference || "LME Cash"}</span>
                    </div>
                    {(prefill.qpStartAnchor || prefill.qpEndAnchor) && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">QP Period:</span>{" "}
                        <span className="text-xs">
                          {prefill.qpStartAnchor || "—"}{" "}
                          {prefill.qpStartOffsetDays != null && prefill.qpStartOffsetDays !== 0
                            ? `(${prefill.qpStartOffsetDays > 0 ? "+" : ""}${prefill.qpStartOffsetDays}d)`
                            : ""}{" "}
                          → {prefill.qpEndAnchor || "—"}{" "}
                          {prefill.qpEndOffsetDays != null && prefill.qpEndOffsetDays !== 0
                            ? `(${prefill.qpEndOffsetDays > 0 ? "+" : ""}${prefill.qpEndOffsetDays}d)`
                            : ""}
                        </span>
                      </div>
                    )}
                    {(prefill.qpStart || prefill.qpEnd) && !prefill.qpStartAnchor && !prefill.qpEndAnchor && (
                      <div>
                        <span className="text-muted-foreground">QP:</span>{" "}
                        <span className="text-xs">
                          {prefill.qpStart
                            ? new Date(prefill.qpStart).toLocaleDateString()
                            : "—"}{" "}
                          – {prefill.qpEnd
                            ? new Date(prefill.qpEnd).toLocaleDateString()
                            : "—"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Editable fields */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div className="space-y-1">
                      <Label htmlFor={`qty-${prefill.side}`} className="text-xs">Qty (MT)</Label>
                      <Input
                        id={`qty-${prefill.side}`}
                        type="number"
                        value={state.requestedQtyMt}
                        onChange={(e) =>
                          updateFormState(prefill.side, {
                            requestedQtyMt: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={!state.enabled}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`pct-${prefill.side}`} className="text-xs">Target %</Label>
                      <Input
                        id={`pct-${prefill.side}`}
                        type="number"
                        min={0}
                        max={100}
                        value={state.targetHedgePct}
                        onChange={(e) =>
                          updateFormState(prefill.side, {
                            targetHedgePct: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={!state.enabled}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`direction-${prefill.side}`} className="text-xs">Direction</Label>
                      <Select
                        value={state.hedgeDirection}
                        onValueChange={(value: "Buy" | "Sell") =>
                          updateFormState(prefill.side, { hedgeDirection: value })
                        }
                        disabled={!state.enabled}
                      >
                        <SelectTrigger id={`direction-${prefill.side}`} className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Buy">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Buy
                            </div>
                          </SelectItem>
                          <SelectItem value="Sell">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="h-4 w-4" />
                              Sell
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`price-${prefill.side}`} className="text-xs">
                        Limit ({prefill.currency || "USD"})
                      </Label>
                      <Input
                        id={`price-${prefill.side}`}
                        type="number"
                        value={state.targetPrice ?? ""}
                        onChange={(e) =>
                          updateFormState(prefill.side, {
                            targetPrice: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        placeholder="Optional"
                        disabled={!state.enabled}
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Summary */}
                  {state.enabled && (
                    <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                      <DirectionIcon className="h-4 w-4" />
                      <span>
                        <strong>{state.hedgeDirection}</strong> {state.requestedQtyMt.toFixed(2)} MT
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSkip}>
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={enabledCount === 0 || createHedgeRequestMutation.isPending}
          >
            {createHedgeRequestMutation.isPending
              ? "Creating..."
              : `Create ${enabledCount} Hedge Request${enabledCount !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to check if a ticket needs hedging
export const ticketNeedsHedge = (ticket: any): boolean => {
  if (!ticket) return false;
  const pricing = (ticket.pricing_type || "").toLowerCase().trim();
  const lmeActionNeeded = !!ticket.lme_action_needed;

  return (
    pricing === "index" ||
    (pricing === "formula" && lmeActionNeeded)
  );
};

// Helper function to build prefill data from a ticket
export const buildHedgePrefillFromTicket = (
  side: HedgeRequestSide,
  ticket: any,
  orderId: string,
  matchedQtyMt: number
): HedgeRequestPrefill => {
  const isBuy = side === "buy";
  // Buy side = Buy, Sell side = Sell
  const hedgeDirection: "Buy" | "Sell" = isBuy ? "Buy" : "Sell";

  // Determine targetHedgePct based on pricing_type:
  // - Index: always 1.0 (100%)
  // - Formula: use ticket.payable_percent (as decimal), fallback to 1.0
  // Normalize payable_percent: if > 1.5, assume it's stored as percentage (e.g., 95 → 0.95)
  let targetHedgePct = 1.0;
  const rawPayablePercent = ticket.payable_percent ?? null;
  if (ticket.pricing_type === "Formula" && rawPayablePercent != null) {
    targetHedgePct = rawPayablePercent > 1.5 ? rawPayablePercent / 100 : rawPayablePercent;
  }

  return {
    side,
    ticketId: ticket.id,
    orderId,
    metal: ticket.commodity_type ?? null,
    pricingType: ticket.pricing_type ?? null,
    qpStart: ticket.qp_start ?? null,
    qpEnd: ticket.qp_end ?? null,
    qpStartAnchor: ticket.qp_start_anchor ?? null,
    qpStartOffsetDays: ticket.qp_start_offset_days ?? null,
    qpEndAnchor: ticket.qp_end_anchor ?? null,
    qpEndOffsetDays: ticket.qp_end_offset_days ?? null,
    reference: ticket.reference_price_source ?? null,
    orderQtyMt: matchedQtyMt,
    clientName: ticket.client_name ?? null,
    hedgeDirection,
    targetHedgePct, // always 0–1
    targetPrice: ticket.signed_price ?? ticket.price ?? null,
    currency: ticket.currency ?? null,
  };
};
