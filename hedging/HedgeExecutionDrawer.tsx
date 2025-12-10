import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type HedgeExecution = Database["public"]["Tables"]["hedge_execution"]["Row"];
type HedgeLink = Database["public"]["Tables"]["hedge_link"]["Row"];
type HedgeRoll = Database["public"]["Tables"]["hedge_roll"]["Row"];

interface HedgeExecutionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execution: HedgeExecution | null;
}

interface TicketQpData {
  id: number;
  qp_start: string | null;
  qp_end: string | null;
  qp_start_anchor: string | null;
  qp_start_offset_days: number | null;
  qp_end_anchor: string | null;
  qp_end_offset_days: number | null;
  client_name: string | null;
}

interface EnrichedLink extends HedgeLink {
  order?: {
    id: string;
    commodity_type: string | null;
    buyer: string | null;
    seller: string | null;
  } | null;
  ticket?: TicketQpData | null;
  bl_order?: {
    id: number;
    bl_order_name: string | null;
  } | null;
}

export function HedgeExecutionDrawer({
  open,
  onOpenChange,
  execution,
}: HedgeExecutionDrawerProps) {
  const navigate = useNavigate();

  // Fetch linked physical exposures
  const { data: links, isLoading: linksLoading } = useQuery({
    queryKey: ["hedge-links", execution?.id],
    queryFn: async () => {
      if (!execution) return [];
      const { data, error } = await supabase
        .from("hedge_link")
        .select("*")
        .eq("hedge_execution_id", execution.id);
      if (error) throw error;
      return data as HedgeLink[];
    },
    enabled: !!execution,
  });

  // Fetch order details for links
  const orderIds = links?.filter(l => l.link_level === "Order").map(l => l.link_id) || [];
  const { data: orders } = useQuery({
    queryKey: ["orders-for-links", orderIds],
    queryFn: async () => {
      if (!orderIds.length) return {};
      const { data, error } = await supabase
        .from("order")
        .select("id, commodity_type, buyer, seller")
        .in("id", orderIds);
      if (error) throw error;
      
      const map: Record<string, typeof data[0]> = {};
      data.forEach(o => { map[o.id] = o; });
      return map;
    },
    enabled: orderIds.length > 0,
  });

  // Fetch tickets for order-level links via inventory_match
  const { data: ticketsForOrders } = useQuery({
    queryKey: ["tickets-for-order-links", orderIds],
    queryFn: async () => {
      if (!orderIds.length) return {};
      
      // Get inventory matches for these orders
      const { data: matches, error: matchError } = await supabase
        .from("inventory_match")
        .select("order_id, buy_ticket_id, sell_ticket_id")
        .in("order_id", orderIds);
      if (matchError) throw matchError;
      
      // Collect unique ticket ids per order
      const ticketIdsByOrder: Record<string, Set<number>> = {};
      matches?.forEach(m => {
        if (!m.order_id) return;
        if (!ticketIdsByOrder[m.order_id]) ticketIdsByOrder[m.order_id] = new Set();
        if (m.buy_ticket_id) ticketIdsByOrder[m.order_id].add(m.buy_ticket_id);
        if (m.sell_ticket_id) ticketIdsByOrder[m.order_id].add(m.sell_ticket_id);
      });
      
      const allTicketIds = Array.from(new Set(
        Object.values(ticketIdsByOrder).flatMap(s => Array.from(s))
      ));
      
      if (allTicketIds.length === 0) return {};
      
      const { data: ticketData, error: ticketError } = await supabase
        .from("ticket")
        .select("id, qp_start, qp_end, qp_start_anchor, qp_start_offset_days, qp_end_anchor, qp_end_offset_days, client_name, type")
        .in("id", allTicketIds);
      if (ticketError) throw ticketError;
      
      // Map tickets by order
      const result: Record<string, typeof ticketData> = {};
      for (const [orderId, ticketIds] of Object.entries(ticketIdsByOrder)) {
        result[orderId] = ticketData?.filter(t => ticketIds.has(t.id)) || [];
      }
      return result;
    },
    enabled: orderIds.length > 0,
  });

  // Fetch ticket details for links
  const ticketIds = links?.filter(l => l.link_level === "Ticket").map(l => parseInt(l.link_id)).filter(id => !isNaN(id)) || [];
  const { data: tickets } = useQuery({
    queryKey: ["tickets-for-links", ticketIds],
    queryFn: async () => {
      if (!ticketIds.length) return {};
      const { data, error } = await supabase
        .from("ticket")
        .select("id, qp_start, qp_end, qp_start_anchor, qp_start_offset_days, qp_end_anchor, qp_end_offset_days, client_name")
        .in("id", ticketIds);
      if (error) throw error;
      
      const map: Record<string, typeof data[0]> = {};
      data.forEach(t => { map[t.id.toString()] = t; });
      return map;
    },
    enabled: ticketIds.length > 0,
  });

  // Fetch BL order details for links
  const blOrderIds = links?.filter(l => l.link_level === "Bl_order").map(l => parseInt(l.link_id)).filter(id => !isNaN(id)) || [];
  const { data: blOrders } = useQuery({
    queryKey: ["bl-orders-for-links", blOrderIds],
    queryFn: async () => {
      if (!blOrderIds.length) return {};
      const { data, error } = await supabase
        .from("bl_order")
        .select("id, bl_order_name")
        .in("id", blOrderIds);
      if (error) throw error;
      
      const map: Record<string, typeof data[0]> = {};
      data.forEach(bl => { map[bl.id.toString()] = bl; });
      return map;
    },
    enabled: blOrderIds.length > 0,
  });

  // Also check hedge_request for order_id to find linked orders
  const { data: linkedRequest } = useQuery({
    queryKey: ["hedge-request-for-execution", execution?.hedge_request_id],
    queryFn: async () => {
      if (!execution?.hedge_request_id) return null;
      const { data, error } = await supabase
        .from("hedge_request")
        .select("order_id, ticket_id")
        .eq("id", execution.hedge_request_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!execution?.hedge_request_id,
  });

  // Fetch order from hedge_request if linked
  const { data: requestOrder } = useQuery({
    queryKey: ["order-from-request", linkedRequest?.order_id],
    queryFn: async () => {
      if (!linkedRequest?.order_id) return null;
      const { data, error } = await supabase
        .from("order")
        .select("id, commodity_type, buyer, seller")
        .eq("id", linkedRequest.order_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!linkedRequest?.order_id,
  });

  // Fetch ticket from hedge_request if linked
  const { data: requestTicket } = useQuery({
    queryKey: ["ticket-from-request", linkedRequest?.ticket_id],
    queryFn: async () => {
      if (!linkedRequest?.ticket_id) return null;
      const { data, error } = await supabase
        .from("ticket")
        .select("id, qp_start, qp_end, qp_start_anchor, qp_start_offset_days, qp_end_anchor, qp_end_offset_days, client_name")
        .eq("id", linkedRequest.ticket_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!linkedRequest?.ticket_id,
  });

  // Fetch tickets from order if we have order_id but no direct ticket_id
  const { data: orderTickets } = useQuery({
    queryKey: ["tickets-from-order", linkedRequest?.order_id],
    queryFn: async () => {
      if (!linkedRequest?.order_id || linkedRequest?.ticket_id) return [];
      // Get inventory matches for this order
      const { data: matches, error: matchError } = await supabase
        .from("inventory_match")
        .select("buy_ticket_id, sell_ticket_id")
        .eq("order_id", linkedRequest.order_id);
      if (matchError) throw matchError;
      
      // Collect unique ticket ids
      const ticketIdSet = new Set<number>();
      matches?.forEach(m => {
        if (m.buy_ticket_id) ticketIdSet.add(m.buy_ticket_id);
        if (m.sell_ticket_id) ticketIdSet.add(m.sell_ticket_id);
      });
      
      if (ticketIdSet.size === 0) return [];
      
      const { data: ticketData, error: ticketError } = await supabase
        .from("ticket")
        .select("id, qp_start, qp_end, qp_start_anchor, qp_start_offset_days, qp_end_anchor, qp_end_offset_days, client_name, type")
        .in("id", Array.from(ticketIdSet));
      if (ticketError) throw ticketError;
      
      return ticketData || [];
    },
    enabled: !!linkedRequest?.order_id && !linkedRequest?.ticket_id,
  });

  // Fetch roll information
  const { data: rolls, isLoading: rollsLoading } = useQuery({
    queryKey: ["hedge-rolls", execution?.id],
    queryFn: async () => {
      if (!execution) return [];
      const { data, error } = await supabase
        .from("hedge_roll")
        .select("*")
        .or(`close_execution_id.eq.${execution.id},open_execution_id.eq.${execution.id}`);
      if (error) throw error;
      return data as HedgeRoll[];
    },
    enabled: !!execution,
  });

  if (!execution) return null;

  const closeRolls = rolls?.filter((r) => r.close_execution_id === execution.id) || [];
  const openRolls = rolls?.filter((r) => r.open_execution_id === execution.id) || [];

  // Enrich links with order/ticket/bl data
  const enrichedLinks: EnrichedLink[] = (links || []).map(link => ({
    ...link,
    order: link.link_level === "Order" ? orders?.[link.link_id] || null : null,
    ticket: link.link_level === "Ticket" ? tickets?.[link.link_id] || null : null,
    bl_order: link.link_level === "Bl_order" ? blOrders?.[link.link_id] || null : null,
  }));

  // Build combined exposures list (from links + from hedge_request)
  const hasLinksFromRequest = linkedRequest?.order_id || linkedRequest?.ticket_id;
  const showRequestExposures = hasLinksFromRequest && enrichedLinks.length === 0;

  const formatAnchorLabel = (anchor: string | null): string => {
    if (!anchor) return "";
    const labels: Record<string, string> = {
      DEAL_DATE: "Deal Date",
      CONTRACT_SIGNED: "Contract Signed",
      MATERIAL_READY: "Material Ready",
      LOADING_DATE: "Loading",
      BL_DATE: "BL Date",
      ETA_DATE: "ETA",
      FULLY_PAID: "Fully Paid",
      DP_PAID: "DP Paid",
      TITLE_TRANSFER: "Title Transfer",
    };
    return labels[anchor] || anchor;
  };

  const formatOffsetDays = (days: number | null): string => {
    if (days === null || days === 0) return "";
    if (days > 0) return ` +${days}d`;
    return ` ${days}d`;
  };

  const formatQpPeriod = (ticket: TicketQpData | null): string => {
    if (!ticket) return "—";
    
    // If we have anchor-based QP period, show truncated version
    if (ticket.qp_start_anchor || ticket.qp_end_anchor) {
      const startPart = ticket.qp_start_anchor 
        ? `${formatAnchorLabel(ticket.qp_start_anchor)}${formatOffsetDays(ticket.qp_start_offset_days)}`
        : (ticket.qp_start ? format(new Date(ticket.qp_start), "MMM d") : "—");
      
      const endPart = ticket.qp_end_anchor
        ? `${formatAnchorLabel(ticket.qp_end_anchor)}${formatOffsetDays(ticket.qp_end_offset_days)}`
        : (ticket.qp_end ? format(new Date(ticket.qp_end), "MMM d") : "—");
      
      return `${startPart} → ${endPart}`;
    }
    
    // Fallback to date-based display
    if (!ticket.qp_start && !ticket.qp_end) return "—";
    const startStr = ticket.qp_start ? format(new Date(ticket.qp_start), "MMM d, yyyy") : "—";
    const endStr = ticket.qp_end ? format(new Date(ticket.qp_end), "MMM d, yyyy") : "—";
    return `${startStr} – ${endStr}`;
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "Order": return "Order";
      case "Ticket": return "Ticket";
      case "Bl_order": return "BL Order";
      default: return level;
    }
  };

  const handleOrderClick = (orderId: string) => {
    onOpenChange(false);
    navigate(`/inventory/${orderId}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Hedge Execution Details</SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold">Trade Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Hedge ID</span>
                <p className="font-medium">{execution.id.slice(0, 8)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p>
                  <Badge variant={execution.status === "OPEN" ? "default" : "secondary"}>
                    {execution.status || "OPEN"}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Broker</span>
                <p className="font-medium">{execution.broker_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Instrument</span>
                <p className="font-medium">{execution.instrument}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Contract Reference</span>
                <p className="font-medium">{execution.contract_reference || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Exchange</span>
                <p className="font-medium">{execution.exchange || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Metal</span>
                <p className="font-medium">{execution.metal}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Trade Details */}
          <div className="space-y-4">
            <h3 className="font-semibold">Position Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Direction</span>
                <p>
                  <Badge variant={execution.direction === "Buy" ? "default" : "secondary"}>
                    {execution.direction}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Quantity (MT)</span>
                <p className="font-medium">{execution.quantity_mt.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Executed Price</span>
                <p className="font-medium">
                  {execution.executed_price.toLocaleString()}{" "}
                  {execution.executed_price_currency || "USD"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Trade Date</span>
                <p className="font-medium">
                  {format(new Date(execution.execution_date), "MMM d, yyyy")}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Expiry Date</span>
                <p className="font-medium">
                  {execution.expiry_date
                    ? format(new Date(execution.expiry_date), "MMM d, yyyy")
                    : "—"}
                </p>
              </div>
              {execution.closed_at && (
                <>
                  <div>
                    <span className="text-muted-foreground">Closed At</span>
                    <p className="font-medium">
                      {format(new Date(execution.closed_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Closed Price</span>
                    <p className="font-medium">
                      {execution.closed_price?.toLocaleString() || "—"}{" "}
                      {execution.executed_price_currency || "USD"}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* P&L Info */}
          {(execution.pnl_realized !== null || execution.pnl_unrealized !== null) && (
            <>
              <div className="space-y-4">
                <h3 className="font-semibold">P&L</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Realized P&L</span>
                    <p className={`font-medium ${(execution.pnl_realized || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {execution.pnl_realized?.toLocaleString() || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Unrealized P&L</span>
                    <p className={`font-medium ${(execution.pnl_unrealized || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {execution.pnl_unrealized?.toLocaleString() || "—"}
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Notes */}
          {execution.notes && (
            <>
              <div className="space-y-2">
                <h3 className="font-semibold">Notes</h3>
                <p className="text-sm text-muted-foreground">{execution.notes}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Linked Physical Exposures */}
          <div className="space-y-4">
            <h3 className="font-semibold">Linked Physical Exposures</h3>
            {linksLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : enrichedLinks.length === 0 && !showRequestExposures ? (
              <p className="text-sm text-muted-foreground">No linked exposures</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Ticket / BL</TableHead>
                      <TableHead>QP Period</TableHead>
                      <TableHead>Allocation (MT)</TableHead>
                      <TableHead>Side</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrichedLinks.map((link) => {
                      // For order-level links, get associated tickets
                      const orderTicketsForLink = link.link_level === "Order" && ticketsForOrders 
                        ? ticketsForOrders[link.link_id] || [] 
                        : [];
                      
                      return (
                        <TableRow key={link.id}>
                          <TableCell className="text-muted-foreground">
                            {getLevelLabel(link.link_level)}
                          </TableCell>
                          <TableCell>
                            {link.order ? (
                              <button
                                onClick={() => handleOrderClick(link.order!.id)}
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                Order {link.order.id}
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            ) : link.link_level === "Order" ? (
                              <button
                                onClick={() => handleOrderClick(link.link_id)}
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                Order {link.link_id}
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {link.ticket ? (
                              <span>Ticket #{link.ticket.id}</span>
                            ) : link.bl_order ? (
                              <span>BL {link.bl_order.bl_order_name || link.bl_order.id}</span>
                            ) : orderTicketsForLink.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {orderTicketsForLink.map(t => (
                                  <span key={t.id} className="text-xs">
                                    Ticket #{t.id} <Badge variant="outline" className="ml-1 text-[10px] px-1">{t.type}</Badge>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {link.ticket ? (
                              formatQpPeriod(link.ticket)
                            ) : orderTicketsForLink.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {orderTicketsForLink.map(t => (
                                  <span key={t.id} className="text-xs">
                                    {formatQpPeriod(t as TicketQpData)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>{link.allocated_quantity_mt.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={link.side === "BUY" ? "default" : "secondary"}>
                              {link.side || "—"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {/* Show exposure from hedge_request if no links exist */}
                    {showRequestExposures && requestOrder && (
                      <>
                        {/* Show direct ticket if linked */}
                        {requestTicket ? (
                          <TableRow>
                            <TableCell className="text-muted-foreground">Order</TableCell>
                            <TableCell>
                              <button
                                onClick={() => handleOrderClick(requestOrder.id)}
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                Order {requestOrder.id}
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            </TableCell>
                            <TableCell>Ticket #{requestTicket.id}</TableCell>
                            <TableCell className="text-sm">
                              {formatQpPeriod(requestTicket as TicketQpData)}
                            </TableCell>
                            <TableCell>{execution.quantity_mt.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={execution.direction === "Buy" ? "default" : "secondary"}>
                                {execution.direction}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ) : orderTickets && orderTickets.length > 0 ? (
                          /* Show tickets from order */
                          orderTickets.map((ticket, idx) => (
                            <TableRow key={ticket.id}>
                              {idx === 0 ? (
                                <TableCell className="text-muted-foreground" rowSpan={orderTickets.length}>
                                  Order
                                </TableCell>
                              ) : null}
                              {idx === 0 ? (
                                <TableCell rowSpan={orderTickets.length}>
                                  <button
                                    onClick={() => handleOrderClick(requestOrder.id)}
                                    className="text-primary hover:underline flex items-center gap-1"
                                  >
                                    Order {requestOrder.id}
                                    <ExternalLink className="h-3 w-3" />
                                  </button>
                                </TableCell>
                              ) : null}
                              <TableCell>
                                Ticket #{ticket.id}
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {ticket.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatQpPeriod(ticket as TicketQpData)}
                              </TableCell>
                              <TableCell>{execution.quantity_mt.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge variant={execution.direction === "Buy" ? "default" : "secondary"}>
                                  {execution.direction}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell className="text-muted-foreground">Order</TableCell>
                            <TableCell>
                              <button
                                onClick={() => handleOrderClick(requestOrder.id)}
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                Order {requestOrder.id}
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            </TableCell>
                            <TableCell>—</TableCell>
                            <TableCell className="text-sm">—</TableCell>
                            <TableCell>{execution.quantity_mt.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={execution.direction === "Buy" ? "default" : "secondary"}>
                                {execution.direction}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Roll Information */}
          {(closeRolls.length > 0 || openRolls.length > 0) && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-semibold">Roll Information</h3>
                {rollsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {closeRolls.map((roll) => (
                      <div key={roll.id} className="p-3 bg-muted rounded-md">
                        <p>
                          Rolled into hedge <span className="font-mono">{roll.open_execution_id.slice(0, 8)}</span>
                        </p>
                        <p className="text-muted-foreground">
                          Roll date: {format(new Date(roll.roll_date), "MMM d, yyyy")}
                          {roll.roll_cost && ` • Cost: ${roll.roll_cost} ${roll.roll_cost_currency || "USD"}`}
                        </p>
                      </div>
                    ))}
                    {openRolls.map((roll) => (
                      <div key={roll.id} className="p-3 bg-muted rounded-md">
                        <p>
                          Rolled from hedge <span className="font-mono">{roll.close_execution_id.slice(0, 8)}</span>
                        </p>
                        <p className="text-muted-foreground">
                          Roll date: {format(new Date(roll.roll_date), "MMM d, yyyy")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Created timestamp */}
          <div className="text-xs text-muted-foreground">
            Created: {format(new Date(execution.created_at), "MMM d, yyyy HH:mm")}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
