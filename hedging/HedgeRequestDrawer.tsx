import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Loader2, ChevronsUpDown, Check, Package, CalendarIcon, ShoppingCart, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import {
  HEDGE_INSTRUMENT_TYPES,
  HEDGE_REQUEST_REASONS,
  HEDGE_METAL_TYPES,
  HEDGE_INSTRUMENT_LABELS,
  HEDGE_REASON_LABELS,
  HEDGE_METAL_LABELS,
  mapCommodityToHedgeMetal,
  getPhysicalSideLabel,
  getDefaultHedgeQuantityMt,
  type HedgeInstrumentType,
  type HedgeRequestReason,
  type HedgeMetalType,
} from "@/utils/hedgeRequestUtils";

type HedgeRequest = Database["public"]["Tables"]["hedge_request"]["Row"];
type HedgeRequestInsert = Database["public"]["Tables"]["hedge_request"]["Insert"];

interface HedgeRequestDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: HedgeRequest | null;
  onSaved: () => void;
}

const statusOptions = ["Draft", "Pending Approval", "Approved", "Cancelled"] as const;

interface OrderOption {
  id: string;
  commodity_type: string | null;
  allocated_quantity_mt: number | null;
  buyer: string | null;
  seller: string | null;
  transaction_type: string | null;
}

interface TicketData {
  id: number;
  client_name: string | null;
  type: string | null;
  pricing_type: string | null;
  payable_percent: number | null;
  currency: string | null;
  isri_grade: string | null;
  reference_price_source: string | null;
  qp_start: string | null;
  qp_end: string | null;
  qp_start_anchor: string | null;
  qp_start_offset_days: number | null;
  qp_end_anchor: string | null;
  qp_end_offset_days: number | null;
  commodity_type: string | null;
}

export function HedgeRequestDrawer({
  open,
  onOpenChange,
  request,
  onSaved,
}: HedgeRequestDrawerProps) {
  const isEditing = !!request;
  const [orderSelectorOpen, setOrderSelectorOpen] = useState(false);
  const [qpMonthOpen, setQpMonthOpen] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    // Existing fields
    direction: "Buy" | "Sell";
    quantity_mt: number;
    target_price: number | null;
    target_price_currency: string;
    status: string;
    notes: string;
    reference: string;
    broker_preference: string;
    // New fields
    instrument_type: HedgeInstrumentType;
    reason: HedgeRequestReason | null;
    pricing_type: string | null;
    formula_percent: number | null; // stored as decimal 0-1
    estimated_qp_month: Date | null;
    hedge_metal: HedgeMetalType | null;
  }>({
    direction: "Buy",
    quantity_mt: 0,
    target_price: null,
    target_price_currency: "USD",
    status: "Draft",
    notes: "",
    reference: "LME_CASH",
    broker_preference: "",
    instrument_type: "FUTURE",
    reason: null,
    pricing_type: null,
    formula_percent: null,
    estimated_qp_month: null,
    hedge_metal: null,
  });

  // Fetch orders for selection
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders-for-hedge-request"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order")
        .select("id, commodity_type, allocated_quantity_mt, buyer, seller, transaction_type")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrderOption[];
    },
    enabled: open && !isEditing,
  });

  // Fetch ticket data for buyer/seller display and prefill
  const { data: ticketMap } = useQuery({
    queryKey: ["tickets-for-orders-hedge", orders?.map(o => [o.buyer, o.seller]).flat().filter(Boolean)],
    queryFn: async () => {
      if (!orders?.length) return {};
      const ticketIds = [...new Set(orders.flatMap(o => [o.buyer, o.seller]).filter(Boolean))] as string[];
      if (!ticketIds.length) return {};
      
      const { data, error } = await supabase
        .from("ticket")
        .select("id, client_name, type, pricing_type, payable_percent, currency, isri_grade, reference_price_source, qp_start, qp_end, qp_start_anchor, qp_start_offset_days, qp_end_anchor, qp_end_offset_days, commodity_type")
        .in("id", ticketIds.map(id => parseInt(id)));
      if (error) throw error;
      
      const map: Record<string, TicketData> = {};
      data.forEach(t => {
        map[t.id.toString()] = t as TicketData;
      });
      return map;
    },
    enabled: !!orders?.length,
  });

  // Selected order details
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId || !orders) return null;
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [selectedOrderId, orders]);

  // Get ticket data for the selected order
  const buyTicket = useMemo(() => {
    if (!selectedOrder?.buyer || !ticketMap) return null;
    return ticketMap[selectedOrder.buyer] || null;
  }, [selectedOrder, ticketMap]);

  const sellTicket = useMemo(() => {
    if (!selectedOrder?.seller || !ticketMap) return null;
    return ticketMap[selectedOrder.seller] || null;
  }, [selectedOrder, ticketMap]);

  // Reset form when opening
  useEffect(() => {
    if (request) {
      setSelectedOrderId(request.order_id || null);
      setFormData({
        direction: request.direction,
        quantity_mt: request.quantity_mt,
        target_price: request.target_price,
        target_price_currency: request.target_price_currency || "USD",
        status: request.status,
        notes: request.notes || "",
        reference: request.reference,
        broker_preference: request.broker_preference || "",
        instrument_type: (request as any).instrument_type || "FUTURE",
        reason: (request as any).reason || null,
        pricing_type: (request as any).pricing_type || null,
        formula_percent: (request as any).formula_percent || null,
        estimated_qp_month: (request as any).estimated_qp_month ? new Date((request as any).estimated_qp_month) : null,
        hedge_metal: (request as any).hedge_metal || null,
      });
    } else {
      setSelectedOrderId(null);
      setFormData({
        direction: "Buy",
        quantity_mt: 0,
        target_price: null,
        target_price_currency: "USD",
        status: "Draft",
        notes: "",
        reference: "LME_CASH",
        broker_preference: "",
        instrument_type: "FUTURE",
        reason: null,
        pricing_type: null,
        formula_percent: null,
        estimated_qp_month: null,
        hedge_metal: null,
      });
    }
  }, [request, open]);

  // Prefill form when order is selected
  useEffect(() => {
    if (selectedOrder && !isEditing && ticketMap) {
      const hedgeMetal = mapCommodityToHedgeMetal(selectedOrder.commodity_type);
      const quantity = getDefaultHedgeQuantityMt({
        context: 'order',
        order: selectedOrder,
      });
      
      // Get ticket for prefill (prefer buy ticket for initial selection)
      const primaryTicket = buyTicket || sellTicket;
      const direction: "Buy" | "Sell" = buyTicket ? "Buy" : "Sell";
      
      setFormData(prev => ({
        ...prev,
        hedge_metal: hedgeMetal,
        quantity_mt: quantity,
        direction,
        pricing_type: primaryTicket?.pricing_type || null,
        formula_percent: primaryTicket?.payable_percent != null 
          ? (primaryTicket.payable_percent > 1.5 ? primaryTicket.payable_percent / 100 : primaryTicket.payable_percent)
          : null,
        target_price_currency: primaryTicket?.currency || "USD",
        reference: primaryTicket?.reference_price_source === "LME 3M" ? "LME_3M" : "LME_CASH",
      }));
    }
  }, [selectedOrder, isEditing, ticketMap, buyTicket, sellTicket]);

  // Get the relevant ticket based on direction
  const activeTicket = useMemo(() => {
    return formData.direction === "Buy" ? buyTicket : sellTicket;
  }, [formData.direction, buyTicket, sellTicket]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!isEditing && !selectedOrderId) {
        throw new Error("Please select an order");
      }

      // Prepare notes with system context appended
      let finalNotes = formData.notes || "";
      if (!isEditing && activeTicket) {
        const systemContext = `\n---\nAuto-context: ${activeTicket.pricing_type || 'Unknown'} pricing, ${activeTicket.client_name || 'Unknown client'}`;
        finalNotes = finalNotes ? `${finalNotes}${systemContext}` : systemContext.trim();
      }

      const baseData = {
        direction: formData.direction,
        quantity_mt: formData.quantity_mt,
        target_price: formData.target_price,
        target_price_currency: formData.target_price_currency,
        status: formData.status as any,
        notes: finalNotes || null,
        reference: formData.reference as any,
        broker_preference: formData.broker_preference || null,
        instrument_type: formData.instrument_type as any,
        reason: formData.reason as any,
        pricing_type: formData.pricing_type,
        formula_percent: formData.formula_percent,
        estimated_qp_month: formData.estimated_qp_month 
          ? format(new Date(formData.estimated_qp_month.getFullYear(), formData.estimated_qp_month.getMonth(), 1), 'yyyy-MM-dd')
          : null,
        hedge_metal: formData.hedge_metal as any,
        updated_at: new Date().toISOString(),
      };

      if (isEditing) {
        const { error } = await supabase
          .from("hedge_request")
          .update(baseData)
          .eq("id", request!.id);
        if (error) throw error;
      } else {
        const insertData: HedgeRequestInsert & Record<string, any> = {
          ...baseData,
          order_id: selectedOrderId,
          ticket_id: activeTicket?.id || null,
          metal: selectedOrder?.commodity_type as any || "Copper",
          source: "Manual" as any,
        };
        const { error } = await supabase.from("hedge_request").insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Hedge request updated" : "Hedge request created");
      onSaved();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || (isEditing ? "Failed to update hedge request" : "Failed to create hedge request"));
    },
  });

  const getLinkDisplay = () => {
    if (!request) return null;
    if (request.order_id) return `Order ${request.order_id}`;
    if (request.ticket_id) return `Ticket ${request.ticket_id}`;
    return null;
  };

  const formatOrderOption = (order: OrderOption) => {
    const buyerName = ticketMap?.[order.buyer || ""]?.client_name || order.buyer || "—";
    const sellerName = ticketMap?.[order.seller || ""]?.client_name || order.seller || "—";
    return `${order.id} – ${order.commodity_type || "—"} – ${buyerName} → ${sellerName}`;
  };

  const getOrderSummary = () => {
    if (!selectedOrder) return null;
    const buyerName = ticketMap?.[selectedOrder.buyer || ""]?.client_name || selectedOrder.buyer || "—";
    const sellerName = ticketMap?.[selectedOrder.seller || ""]?.client_name || selectedOrder.seller || "—";
    return {
      id: selectedOrder.id,
      metal: selectedOrder.commodity_type || "—",
      quantity: selectedOrder.allocated_quantity_mt?.toFixed(2) || "0.00",
      buyer: buyerName,
      seller: sellerName,
    };
  };

  const orderSummary = getOrderSummary();

  // Format QP period for display
  const formatQpPeriod = () => {
    if (!activeTicket) return null;
    
    if (activeTicket.qp_start_anchor || activeTicket.qp_end_anchor) {
      const startAnchor = activeTicket.qp_start_anchor?.replace(/_/g, " ") || "—";
      const endAnchor = activeTicket.qp_end_anchor?.replace(/_/g, " ") || "—";
      const startOffset = activeTicket.qp_start_offset_days;
      const endOffset = activeTicket.qp_end_offset_days;
      return `${startAnchor}${startOffset ? ` (${startOffset > 0 ? "+" : ""}${startOffset}d)` : ""} → ${endAnchor}${endOffset ? ` (${endOffset > 0 ? "+" : ""}${endOffset}d)` : ""}`;
    }
    
    if (activeTicket.qp_start || activeTicket.qp_end) {
      const start = activeTicket.qp_start ? format(new Date(activeTicket.qp_start), "MMM d, yyyy") : "—";
      const end = activeTicket.qp_end ? format(new Date(activeTicket.qp_end), "MMM d, yyyy") : "—";
      return `${start} – ${end}`;
    }
    
    return null;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Hedge Request" : "New Hedge Request"}
          </SheetTitle>
          <SheetDescription>
            {isEditing 
              ? "Update hedge request details" 
              : "Create a new hedge request with trade details and instrument type"}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-5">
          {/* Link display for editing */}
          {isEditing && getLinkDisplay() && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <span className="text-muted-foreground">Linked to:</span>{" "}
              <span className="font-medium">{getLinkDisplay()}</span>
            </div>
          )}

          {/* Order Selector for new requests */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>Order *</Label>
              <Popover open={orderSelectorOpen} onOpenChange={setOrderSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={orderSelectorOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedOrderId
                      ? orders?.find(o => o.id === selectedOrderId)
                        ? formatOrderOption(orders.find(o => o.id === selectedOrderId)!)
                        : selectedOrderId
                      : "Select an order..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[450px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search orders..." />
                    <CommandList>
                      <CommandEmpty>
                        {ordersLoading ? "Loading orders..." : "No orders found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {orders?.map((order) => (
                          <CommandItem
                            key={order.id}
                            value={formatOrderOption(order)}
                            onSelect={() => {
                              setSelectedOrderId(order.id);
                              setOrderSelectorOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedOrderId === order.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="truncate">{formatOrderOption(order)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Order Summary */}
              {orderSummary && (
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md border">
                  <Package className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="font-medium">Order {orderSummary.id}</span>
                      <span className="text-muted-foreground"> · </span>
                      <span>{orderSummary.metal}</span>
                      <span className="text-muted-foreground"> · </span>
                      <span>{orderSummary.quantity} MT</span>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {orderSummary.buyer} → {orderSummary.seller}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Read-only prefilled context */}
          {(selectedOrder || isEditing) && activeTicket && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <div className="text-sm font-medium">Deal Context</div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Counterparty:</span>{" "}
                  <span className="font-medium">{activeTicket.client_name || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Physical side:</span>
                  <Badge variant="outline" className="text-xs">
                    {activeTicket.type === "Buy" ? (
                      <><ShoppingCart className="h-3 w-3 mr-1" /> Purchase</>
                    ) : (
                      <><Store className="h-3 w-3 mr-1" /> Sale</>
                    )}
                  </Badge>
                </div>
                {activeTicket.isri_grade && (
                  <div>
                    <span className="text-muted-foreground">Grade:</span>{" "}
                    <span>{activeTicket.isri_grade}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Pricing:</span>{" "}
                  <Badge variant="secondary" className="text-xs">{activeTicket.pricing_type || "—"}</Badge>
                </div>
                {formatQpPeriod() && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">QP Period:</span>{" "}
                    <span className="text-xs">{formatQpPeriod()}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Currency:</span>{" "}
                  <span>{activeTicket.currency || "USD"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid gap-4">
            {/* Hedge Metal & Side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hedge_metal">Product Metal</Label>
                <Select
                  value={formData.hedge_metal || ""}
                  onValueChange={(value) => setFormData({ ...formData, hedge_metal: value as HedgeMetalType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select metal" />
                  </SelectTrigger>
                  <SelectContent>
                    {HEDGE_METAL_TYPES.map((metal) => (
                      <SelectItem key={metal} value={metal}>
                        {HEDGE_METAL_LABELS[metal]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direction">Hedge Side</Label>
                <Select
                  value={formData.direction}
                  onValueChange={(value: "Buy" | "Sell") =>
                    setFormData({ ...formData, direction: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Buy">Buy</SelectItem>
                    <SelectItem value="Sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quantity & Formula % */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity (MT) *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={formData.quantity_mt}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity_mt: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="formula_percent">Formula % (0-100)</Label>
                <Input
                  id="formula_percent"
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  placeholder="e.g., 96.5"
                  value={formData.formula_percent != null ? formData.formula_percent * 100 : ""}
                  onChange={(e) =>
                    setFormData({ 
                      ...formData, 
                      formula_percent: e.target.value ? parseFloat(e.target.value) / 100 : null 
                    })
                  }
                />
              </div>
            </div>

            {/* Instrument Type & Reason */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instrument_type">Hedging Type</Label>
                <Select
                  value={formData.instrument_type}
                  onValueChange={(value) => setFormData({ ...formData, instrument_type: value as HedgeInstrumentType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HEDGE_INSTRUMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {HEDGE_INSTRUMENT_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Hedge Reason</Label>
                <Select
                  value={formData.reason || ""}
                  onValueChange={(value) => setFormData({ ...formData, reason: value as HedgeRequestReason })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {HEDGE_REQUEST_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {HEDGE_REASON_LABELS[reason]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Estimated QP Month */}
            <div className="space-y-2">
              <Label>Estimated QP Month</Label>
              <Popover open={qpMonthOpen} onOpenChange={setQpMonthOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.estimated_qp_month && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.estimated_qp_month 
                      ? format(formData.estimated_qp_month, "MMMM yyyy")
                      : "Select month"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.estimated_qp_month || undefined}
                    onSelect={(date) => {
                      setFormData({ ...formData, estimated_qp_month: date || null });
                      setQpMonthOpen(false);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Target Price & Reference */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetPrice">Target Price</Label>
                <div className="flex gap-2">
                  <Input
                    id="targetPrice"
                    type="number"
                    step="0.01"
                    value={formData.target_price ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target_price: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    placeholder="Optional"
                    className="flex-1"
                  />
                  <Badge variant="outline" className="self-center">
                    {formData.target_price_currency}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference</Label>
                <Select
                  value={formData.reference}
                  onValueChange={(value) => setFormData({ ...formData, reference: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LME_CASH">LME Cash</SelectItem>
                    <SelectItem value="LME_3M">LME 3M</SelectItem>
                    <SelectItem value="COMEX">COMEX</SelectItem>
                    <SelectItem value="SHFE">SHFE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Broker & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="broker">Broker Preference</Label>
                <Input
                  id="broker"
                  value={formData.broker_preference}
                  onChange={(e) => setFormData({ ...formData, broker_preference: e.target.value })}
                  placeholder="e.g., StoneX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Hedge Request Details</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes..."
                rows={3}
              />
            </div>

            {/* Metadata for editing */}
            {isEditing && request && (
              <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t">
                <p>
                  <span className="font-medium">Requested by:</span>{" "}
                  {request.requested_by || "—"}
                </p>
                <p>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(request.created_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || formData.quantity_mt <= 0 || (!isEditing && !selectedOrderId)}
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Request"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
