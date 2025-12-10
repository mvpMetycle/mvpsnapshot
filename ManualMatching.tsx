import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResolveRemainderDialog } from "./ResolveRemainderDialog";
import {
  HedgeRequestDialog,
  HedgeRequestPrefill,
  ticketNeedsHedge,
  buildHedgePrefillFromTicket,
} from "./HedgeRequestDialog";

interface ManualMatchingProps {
  onBack: () => void;
  onClose: () => void;
  initialBuyTicketId?: number | null;
  initialSellTicketId?: number | null;
}

export const ManualMatching = ({ onBack, onClose, initialBuyTicketId, initialSellTicketId }: ManualMatchingProps) => {
  const [selectedBuyTicket, setSelectedBuyTicket] = useState<number | null>(initialBuyTicketId || null);
  const [selectedSellTicket, setSelectedSellTicket] = useState<number | null>(initialSellTicketId || null);
  const [expandedBuyTicket, setExpandedBuyTicket] = useState<number | null>(null);
  const [expandedSellTicket, setExpandedSellTicket] = useState<number | null>(null);
  const [buySearchQuery, setBuySearchQuery] = useState("");
  const [sellSearchQuery, setSellSearchQuery] = useState("");

  // Sync initial ticket IDs when props change (e.g., from kanban board selection)
  useEffect(() => {
    if (initialBuyTicketId !== undefined) {
      setSelectedBuyTicket(initialBuyTicketId);
    }
    if (initialSellTicketId !== undefined) {
      setSelectedSellTicket(initialSellTicketId);
    }
  }, [initialBuyTicketId, initialSellTicketId]);
  const [showRemainderDialog, setShowRemainderDialog] = useState(false);
  const [remainderData, setRemainderData] = useState<{
    remainderMT: number;
    surplusSide: "buy" | "sell";
    referenceTicket: any;
    buyTicket: any;
    sellTicket: any;
  } | null>(null);
  
  // Hedge request dialog state
  const [showHedgeDialog, setShowHedgeDialog] = useState(false);
  const [hedgePrefillData, setHedgePrefillData] = useState<HedgeRequestPrefill[]>([]);
  
  const queryClient = useQueryClient();

  const calculatePrice = (ticket: any) => {
    if (!ticket) return 0;
    
    if (ticket.pricing_type === "Fixed") {
      return ticket.signed_price || 0;
    } else if (ticket.pricing_type === "Formula") {
      const lmePrice = ticket.lme_price || 0;
      const payablePercent = ticket.payable_percent || 0;
      return lmePrice * payablePercent;
    } else if (ticket.pricing_type === "Index") {
      const lmePrice = ticket.lme_price || 0;
      const premiumDiscount = ticket.premium_discount || 0;
      return lmePrice + premiumDiscount;
    }
    return 0;
  };

  const formatNumber = (value: any) => {
    if (value === null || value === undefined) return "—";
    return typeof value === "number" ? value.toFixed(2) : value;
  };

  const { data: buyTickets } = useQuery({
    queryKey: ["approved-buy-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket")
        .select("*")
        .eq("type", "Buy")
        .eq("status", "Approved")
        .order("id", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: sellTickets } = useQuery({
    queryKey: ["approved-sell-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket")
        .select("*")
        .eq("type", "Sell")
        .eq("status", "Approved")
        .order("id", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Store pending order data for hedge dialog
  const [pendingHedgeOrder, setPendingHedgeOrder] = useState<{
    orderId: string;
    buyTicket: any;
    sellTicket: any;
    quantity: number;
  } | null>(null);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const { data, error } = await supabase.from("order").insert(orderData).select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order created successfully");
      
      // Check if we have pending hedge data
      if (pendingHedgeOrder) {
        const { orderId, buyTicket, sellTicket, quantity } = pendingHedgeOrder;
        const prefillSides: HedgeRequestPrefill[] = [];
        
        // Check buy side for hedge requirement
        if (ticketNeedsHedge(buyTicket)) {
          prefillSides.push(buildHedgePrefillFromTicket("buy", buyTicket, orderId, quantity));
        }
        
        // Check sell side for hedge requirement
        if (ticketNeedsHedge(sellTicket)) {
          prefillSides.push(buildHedgePrefillFromTicket("sell", sellTicket, orderId, quantity));
        }
        
        // If any side needs hedge, show dialog
        if (prefillSides.length > 0) {
          setHedgePrefillData(prefillSides);
          setShowHedgeDialog(true);
          setPendingHedgeOrder(null);
          return; // Don't close yet, wait for hedge dialog
        }
        
        setPendingHedgeOrder(null);
      }
      
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to create order: ${error.message}`);
      setPendingHedgeOrder(null);
    },
  });

  const checkCompatibility = (buyTicket: any, sellTicket: any) => {
    if (!buyTicket || !sellTicket) return { isCompatible: false, issues: [] };

    const issues: string[] = [];
    const matches: string[] = [];

    // Product match
    if (buyTicket.commodity_type === sellTicket.commodity_type) {
      matches.push("product");
    } else {
      issues.push("product");
    }

    // ISRI grade match
    if (buyTicket.isri_grade === sellTicket.isri_grade) {
      matches.push("isri");
    } else if (buyTicket.isri_grade && sellTicket.isri_grade) {
      issues.push("isri");
    }

    // Origin match
    if (buyTicket.country_of_origin === sellTicket.country_of_origin) {
      matches.push("origin");
    }

    // Currency match
    if (buyTicket.currency === sellTicket.currency) {
      matches.push("currency");
    } else {
      issues.push("currency");
    }

    // Price validation
    const buyPrice = calculatePrice(buyTicket);
    const sellPrice = calculatePrice(sellTicket);
    if (buyPrice < sellPrice) {
      matches.push("price");
    } else {
      issues.push("price");
    }

    return { 
      isCompatible: issues.length === 0, 
      issues,
      matches,
      buyPrice,
      sellPrice
    };
  };

  const getCompatibleSellTickets = (buyTicketId: number) => {
    if (!buyTickets || !sellTickets) return [];
    const buyTicket = buyTickets.find(t => t.id === buyTicketId);
    if (!buyTicket) return [];

    return sellTickets.filter(sellTicket => {
      const { issues } = checkCompatibility(buyTicket, sellTicket);
      // Show tickets with only currency or ISRI as issues (partial compatibility)
      return issues.length === 0 || 
             (issues.length === 1 && (issues[0] === 'currency' || issues[0] === 'isri'));
    });
  };

  const getCompatibleBuyTickets = (sellTicketId: number) => {
    if (!buyTickets || !sellTickets) return [];
    const sellTicket = sellTickets.find(t => t.id === sellTicketId);
    if (!sellTicket) return [];

    return buyTickets.filter(buyTicket => {
      const { issues } = checkCompatibility(buyTicket, sellTicket);
      // Show tickets with only currency or ISRI as issues (partial compatibility)
      return issues.length === 0 || 
             (issues.length === 1 && (issues[0] === 'currency' || issues[0] === 'isri'));
    });
  };

  const handleMatchTickets = () => {
    if (!selectedBuyTicket || !selectedSellTicket) {
      toast.error("Please select both a buy and sell ticket");
      return;
    }

    const buyTicket = buyTickets?.find(t => t.id === selectedBuyTicket);
    const sellTicket = sellTickets?.find(t => t.id === selectedSellTicket);

    if (!buyTicket || !sellTicket) return;

    const { issues, buyPrice, sellPrice } = checkCompatibility(buyTicket, sellTicket);

    if (issues.includes('product')) {
      toast.error("Products must match exactly");
      return;
    }

    if (issues.includes('price')) {
      toast.error("Buy price must be less than sell price");
      return;
    }

    const buyQty = buyTicket.quantity || 0;
    const sellQty = sellTicket.quantity || 0;

    // Check for quantity mismatch
    if (buyQty !== sellQty) {
      const remainderMT = Math.abs(buyQty - sellQty);
      const surplusSide = buyQty > sellQty ? "buy" : "sell";
      const referenceTicket = surplusSide === "buy" ? buyTicket : sellTicket;

      setRemainderData({
        remainderMT,
        surplusSide,
        referenceTicket,
        buyTicket,
        sellTicket,
      });
      setShowRemainderDialog(true);
      return;
    }

    // Exact match - proceed with order creation
    createOrder(buyTicket, sellTicket, buyPrice, sellPrice, buyQty);
  };

  const createOrder = (buyTicket: any, sellTicket: any, buyPrice: number, sellPrice: number, quantity: number) => {
    const orderId = String(Math.floor(10000 + Math.random() * 90000));

    // Store pending order data for hedge dialog check in onSuccess
    setPendingHedgeOrder({
      orderId,
      buyTicket,
      sellTicket,
      quantity,
    });

    const orderData = {
      id: orderId,
      buyer: String(buyTicket.id),
      seller: String(sellTicket.id),
      commodity_type: buyTicket.commodity_type,
      metal_form: buyTicket.metal_form,
      isri_grade: buyTicket.isri_grade,
      allocated_quantity_mt: quantity,
      buy_price: buyPrice,
      sell_price: sellPrice,
      margin: (sellPrice - buyPrice) / buyPrice,
      status: "Allocated",
      transaction_type: "B2B",
      ship_to: sellTicket.ship_to,
      ship_from: buyTicket.ship_from,
      product_details: `${buyTicket.incoterms || "—"} / ${sellTicket.incoterms || "—"}`,
      created_at: new Date().toISOString(),
    };

    createOrderMutation.mutate(orderData);
  };

  const handleRemainderResolution = async (solution: any) => {
    if (!remainderData) return;

    const { buyTicket, sellTicket } = remainderData;
    const { buyPrice, sellPrice } = checkCompatibility(buyTicket, sellTicket);
    const matchedQty = Math.min(buyTicket.quantity || 0, sellTicket.quantity || 0);

    if (solution.type === "ADJUST") {
      setShowRemainderDialog(false);
      setRemainderData(null);
      return;
    }

    if (solution.type === "NEW_TICKET") {
      // Create new ticket for remainder
      const { error } = await supabase.from("ticket").insert(solution.ticketData);
      if (error) {
        console.error("Ticket creation error:", error);
        toast.error(`Failed to create remainder ticket: ${error.message}`);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["approved-buy-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["approved-sell-tickets"] });
      toast.success("Remainder ticket created successfully");
    }

    if (solution.type === "INVENTORY") {
      // Create warehouse order for remainder
      toast.success(`${remainderData.remainderMT} MT moved to ${solution.warehouse}`);
    }

    // Create the main matched order
    createOrder(buyTicket, sellTicket, buyPrice, sellPrice, matchedQty);
    setShowRemainderDialog(false);
    setRemainderData(null);
  };

  const selectedBuy = buyTickets?.find(t => t.id === selectedBuyTicket);
  const selectedSell = sellTickets?.find(t => t.id === selectedSellTicket);
  const compatibility = selectedBuy && selectedSell ? checkCompatibility(selectedBuy, selectedSell) : null;
  
  // Bidirectional compatibility
  const compatibleSells = selectedBuyTicket ? getCompatibleSellTickets(selectedBuyTicket) : sellTickets || [];
  const compatibleBuys = selectedSellTicket ? getCompatibleBuyTickets(selectedSellTicket) : buyTickets || [];

  // Filter buy tickets - show compatible ones if sell is selected, otherwise show all
  const filteredBuyTickets = (selectedSellTicket && !selectedBuyTicket 
    ? compatibleBuys 
    : buyTickets || []
  ).filter(ticket => 
    buySearchQuery === "" || ticket.id.toString().includes(buySearchQuery)
  );

  // Filter sell tickets - show compatible ones if buy is selected, otherwise show all
  const filteredSellTickets = (selectedBuyTicket && !selectedSellTicket
    ? compatibleSells
    : sellTickets || []
  ).filter(ticket => 
    sellSearchQuery === "" || ticket.id.toString().includes(sellSearchQuery)
  );

  const ComparisonIndicator = ({ field, buyValue, sellValue }: { field: string, buyValue: any, sellValue: any }) => {
    const isMatch = buyValue === sellValue;
    const hasValues = buyValue && sellValue;
    
    if (!hasValues) {
      return <Badge variant="outline" className="text-muted-foreground">—</Badge>;
    }
    
    if (isMatch) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs font-medium">Match</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1 text-amber-600">
        <AlertCircle className="h-4 w-4" />
        <span className="text-xs font-medium">Different</span>
      </div>
    );
  };

  const TicketRow = ({ ticket, type, isSelected, isExpanded, onSelect, onToggleExpand }: any) => {
    const price = calculatePrice(ticket);
    // Highlight compatible tickets in either direction
    const isHighlightedSell = type === 'sell' && selectedBuyTicket && compatibleSells.some(t => t.id === ticket.id);
    const isHighlightedBuy = type === 'buy' && selectedSellTicket && compatibleBuys.some(t => t.id === ticket.id);
    const isHighlighted = isHighlightedSell || isHighlightedBuy;

    return (
      <div>
        <Card 
          className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : ''} ${isHighlighted && !isSelected ? 'bg-accent/20' : ''}`}
          onClick={() => onSelect(ticket.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">#{ticket.id}</span>
                  <Badge variant="outline">{ticket.commodity_type}</Badge>
                </div>
                
                {/* Quantity & Price */}
                <div className="space-y-1 mt-1">
                  <div className="text-sm">
                    <span className="text-muted-foreground font-medium">Qty:</span> {ticket.quantity} MT
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground font-medium">Price:</span> {formatNumber(price)} {ticket.currency || 'USD'}
                  </div>
                </div>

                {/* Product Specifications */}
                <div className="space-y-1 mt-1">
                  {ticket.isri_grade && ticket.isri_grade !== "Not applicable" && (
                    <div className="text-sm">
                      <span className="text-muted-foreground font-medium">ISRI Grade:</span> {ticket.isri_grade}
                    </div>
                  )}
                  {ticket.product_details && (
                    <div className="text-sm">
                      <span className="text-muted-foreground font-medium">Product Details:</span> {ticket.product_details}
                    </div>
                  )}
                </div>

                {/* Separator */}
                <div className="border-t my-2" />

                {/* Logistics & Terms */}
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="text-muted-foreground font-medium">{type === 'buy' ? 'From:' : 'To:'}</span> {type === 'buy' ? ticket.ship_from || '—' : ticket.ship_to || '—'}
                  </div>
                  {ticket.country_of_origin && (
                    <div className="text-sm">
                      <span className="text-muted-foreground font-medium">Origin:</span> {ticket.country_of_origin}
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-muted-foreground font-medium">Terms:</span> {ticket.incoterms || '—'}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(ticket.id);
                }}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isExpanded && (
          <Card className="mt-2 ml-4 border-l-4 border-primary">
            <CardContent className="p-4 space-y-3 text-sm">
              <div>
                <div className="text-muted-foreground font-medium mb-1">Payment Terms</div>
                <div>{ticket.payment_terms || '—'}</div>
              </div>
              {ticket.shipment_window && (
                <div>
                  <div className="text-muted-foreground font-medium mb-1">Shipment Window</div>
                  <div>{new Date(ticket.shipment_window).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                </div>
              )}
              <div>
                <div className="text-muted-foreground font-medium mb-1">Pricing Type</div>
                <div>
                  {ticket.pricing_type || '—'}
                  {ticket.pricing_type === 'Formula' && (
                    <div className="text-muted-foreground text-xs mt-1">
                      LME: {ticket.lme_price} × {(ticket.payable_percent * 100).toFixed(1)}%
                    </div>
                  )}
                  {ticket.pricing_type === 'Index' && (
                    <div className="text-muted-foreground text-xs mt-1">
                      LME: {ticket.lme_price} + {ticket.premium_discount}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-sm text-muted-foreground">
          Select one ticket from each side to compare and match
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="h-full border rounded-lg">
        {/* Left Pane - Buy Tickets */}
        <ResizablePanel defaultSize={30} minSize={25}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Buy Tickets</h3>
                <Badge variant="secondary">{filteredBuyTickets.length}</Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ID..."
                  value={buySearchQuery}
                  onChange={(e) => setBuySearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2">
                {filteredBuyTickets.length > 0 ? (
                  filteredBuyTickets.map((ticket) => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      type="buy"
                      isSelected={selectedBuyTicket === ticket.id}
                      isExpanded={expandedBuyTicket === ticket.id}
                      onSelect={setSelectedBuyTicket}
                      onToggleExpand={setExpandedBuyTicket}
                    />
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No approved buy tickets
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Middle Pane - Comparison */}
        <ResizablePanel defaultSize={40} minSize={30}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b bg-muted/30">
              <h3 className="font-semibold text-center">Ticket Comparison</h3>
            </div>
            <ScrollArea className="flex-1 p-6">
              {selectedBuy && selectedSell ? (
                <div className="space-y-6">
                  {/* Compatibility Status */}
                  <Card className={compatibility?.isCompatible ? 'border-green-500' : 'border-amber-500'}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        {compatibility?.isCompatible ? (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-green-600">Compatible Match</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                            <span className="font-medium text-amber-600">Review Required</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Comparison Grid */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">BUY #{selectedBuy.id}</div>
                        <div className="font-medium">{selectedBuy.commodity_type}</div>
                      </div>
                      <ComparisonIndicator field="product" buyValue={selectedBuy.commodity_type} sellValue={selectedSell.commodity_type} />
                      <div>
                        <div className="text-xs text-muted-foreground">SELL #{selectedSell.id}</div>
                        <div className="font-medium">{selectedSell.commodity_type}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">ISRI Grade</div>
                        <div className="font-medium">{selectedBuy.isri_grade || '—'}</div>
                      </div>
                      <ComparisonIndicator field="isri" buyValue={selectedBuy.isri_grade} sellValue={selectedSell.isri_grade} />
                      <div>
                        <div className="text-xs text-muted-foreground">ISRI Grade</div>
                        <div className="font-medium">{selectedSell.isri_grade || '—'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Origin</div>
                        <div className="font-medium">{selectedBuy.country_of_origin || '—'}</div>
                      </div>
                      <ComparisonIndicator field="origin" buyValue={selectedBuy.country_of_origin} sellValue={selectedSell.country_of_origin} />
                      <div>
                        <div className="text-xs text-muted-foreground">Origin</div>
                        <div className="font-medium">{selectedSell.country_of_origin || '—'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Quantity</div>
                        <div className="font-medium">{selectedBuy.quantity} MT</div>
                      </div>
                      <div className="text-xs text-muted-foreground">vs</div>
                      <div>
                        <div className="text-xs text-muted-foreground">Quantity</div>
                        <div className="font-medium">{selectedSell.quantity} MT</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Price</div>
                        <div className="font-medium">{formatNumber(compatibility.buyPrice)} {selectedBuy.currency}</div>
                      </div>
                      {compatibility.buyPrice < compatibility.sellPrice ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs font-medium">Valid</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">Invalid</span>
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-muted-foreground">Price</div>
                        <div className="font-medium">{formatNumber(compatibility.sellPrice)} {selectedSell.currency}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Ship From</div>
                        <div className="font-medium">{selectedBuy.ship_from || '—'}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">→</div>
                      <div>
                        <div className="text-xs text-muted-foreground">Ship To</div>
                        <div className="font-medium">{selectedSell.ship_to || '—'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Incoterms</div>
                        <div className="font-medium">{selectedBuy.incoterms || '—'}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">/</div>
                      <div>
                        <div className="text-xs text-muted-foreground">Incoterms</div>
                        <div className="font-medium">{selectedSell.incoterms || '—'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Payment Terms</div>
                        <div className="text-sm">{selectedBuy.payment_terms || '—'}</div>
                      </div>
                      <div></div>
                      <div>
                        <div className="text-xs text-muted-foreground">Payment Terms</div>
                        <div className="text-sm">{selectedSell.payment_terms || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Section */}
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 space-y-4">
                      <h4 className="font-semibold text-sm">Pricing Structure</h4>
                      
                      {/* Pricing Type */}
                      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Pricing Type</div>
                          <div className="font-medium">{selectedBuy.pricing_type || '—'}</div>
                        </div>
                        {selectedBuy.pricing_type !== selectedSell.pricing_type ? (
                          <div className="flex items-center gap-1 text-amber-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Mixed</span>
                          </div>
                        ) : (
                          <ComparisonIndicator field="pricing_type" buyValue={selectedBuy.pricing_type} sellValue={selectedSell.pricing_type} />
                        )}
                        <div>
                          <div className="text-xs text-muted-foreground">Pricing Type</div>
                          <div className="font-medium">{selectedSell.pricing_type || '—'}</div>
                        </div>
                      </div>

                      {selectedBuy.pricing_type !== selectedSell.pricing_type && (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs font-medium">Mixed pricing types.</span>
                        </div>
                      )}

                      {/* Fixed Pricing Details */}
                      {(selectedBuy.pricing_type === 'Fixed' || selectedSell.pricing_type === 'Fixed') && (
                        <>
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Fixed Price</div>
                              <div className="font-medium">
                                {selectedBuy.pricing_type === 'Fixed' ? `${formatNumber(selectedBuy.signed_price)} ${selectedBuy.currency}` : '—'}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">vs</div>
                            <div>
                              <div className="text-xs text-muted-foreground">Fixed Price</div>
                              <div className="font-medium">
                                {selectedSell.pricing_type === 'Fixed' ? `${formatNumber(selectedSell.signed_price)} ${selectedSell.currency}` : '—'}
                              </div>
                            </div>
                          </div>

                          {selectedBuy.pricing_type === 'Fixed' && selectedSell.pricing_type === 'Fixed' && (
                            <>
                              {selectedBuy.currency === selectedSell.currency ? (
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground">Margin</div>
                                  <div className="font-semibold text-lg">
                                    {((selectedSell.signed_price - selectedBuy.signed_price) / selectedBuy.signed_price * 100).toFixed(2)}%
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                  <span className="text-xs font-medium">Different currencies - margin calculation unavailable.</span>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}

                      {/* Index/Formula Pricing Details */}
                      {(selectedBuy.pricing_type === 'Index' || selectedBuy.pricing_type === 'Formula' || 
                        selectedSell.pricing_type === 'Index' || selectedSell.pricing_type === 'Formula') && (
                        <>
                          {/* Index Basis */}
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Index Basis</div>
                              <div className="text-sm">
                                {selectedBuy.basis && selectedBuy.reference_price_source 
                                  ? `${selectedBuy.basis} (${selectedBuy.reference_price_source})`
                                  : selectedBuy.basis || '—'}
                              </div>
                            </div>
                            <ComparisonIndicator 
                              field="basis" 
                              buyValue={`${selectedBuy.basis}-${selectedBuy.reference_price_source}`} 
                              sellValue={`${selectedSell.basis}-${selectedSell.reference_price_source}`} 
                            />
                            <div>
                              <div className="text-xs text-muted-foreground">Index Basis</div>
                              <div className="text-sm">
                                {selectedSell.basis && selectedSell.reference_price_source 
                                  ? `${selectedSell.basis} (${selectedSell.reference_price_source})`
                                  : selectedSell.basis || '—'}
                              </div>
                            </div>
                          </div>

                          {/* Quotation Period */}
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Quotation Period</div>
                              <div className="text-sm">
                                {selectedBuy.qp_start && selectedBuy.qp_end 
                                  ? `${new Date(selectedBuy.qp_start).toLocaleDateString()} → ${new Date(selectedBuy.qp_end).toLocaleDateString()}`
                                  : '—'}
                              </div>
                            </div>
                            {selectedBuy.qp_start && selectedBuy.qp_end && selectedSell.qp_start && selectedSell.qp_end &&
                             (selectedBuy.qp_start !== selectedSell.qp_start || selectedBuy.qp_end !== selectedSell.qp_end) ? (
                              <div className="flex items-center gap-1 text-amber-600">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-xs font-medium">Different</span>
                              </div>
                            ) : (
                              <ComparisonIndicator 
                                field="qp" 
                                buyValue={`${selectedBuy.qp_start}-${selectedBuy.qp_end}`} 
                                sellValue={`${selectedSell.qp_start}-${selectedSell.qp_end}`} 
                              />
                            )}
                            <div>
                              <div className="text-xs text-muted-foreground">Quotation Period</div>
                              <div className="text-sm">
                                {selectedSell.qp_start && selectedSell.qp_end 
                                  ? `${new Date(selectedSell.qp_start).toLocaleDateString()} → ${new Date(selectedSell.qp_end).toLocaleDateString()}`
                                  : '—'}
                              </div>
                            </div>
                          </div>

                          {/* Premium/Discount (for Index pricing) */}
                          {(selectedBuy.pricing_type === 'Index' || selectedSell.pricing_type === 'Index') && (
                            <>
                              <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                                <div className="text-right">
                                  <div className="text-xs text-muted-foreground">Premium/Discount</div>
                                  <div className="font-medium">
                                    {selectedBuy.pricing_type === 'Index' ? formatNumber(selectedBuy.premium_discount) : '—'}
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">vs</div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Premium/Discount</div>
                                  <div className="font-medium">
                                    {selectedSell.pricing_type === 'Index' ? formatNumber(selectedSell.premium_discount) : '—'}
                                  </div>
                                </div>
                              </div>

                              {selectedBuy.pricing_type === 'Index' && selectedSell.pricing_type === 'Index' && (
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground">Spread</div>
                                  <div className="font-semibold">
                                    {formatNumber((selectedSell.premium_discount || 0) - (selectedBuy.premium_discount || 0))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Payable % (for Formula pricing) */}
                          {(selectedBuy.pricing_type === 'Formula' || selectedSell.pricing_type === 'Formula') && (
                            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Payable %</div>
                                <div className="font-medium">
                                  {selectedBuy.pricing_type === 'Formula' && selectedBuy.payable_percent 
                                    ? `${(selectedBuy.payable_percent * 100).toFixed(1)}%` 
                                    : '—'}
                                </div>
                              </div>
                              {selectedBuy.pricing_type === 'Formula' && selectedSell.pricing_type === 'Formula' &&
                               selectedBuy.payable_percent !== selectedSell.payable_percent ? (
                                <div className="flex items-center gap-1 text-amber-600">
                                  <AlertCircle className="h-4 w-4" />
                                  <span className="text-xs font-medium">Different</span>
                                </div>
                              ) : (
                                <ComparisonIndicator 
                                  field="payable" 
                                  buyValue={selectedBuy.payable_percent} 
                                  sellValue={selectedSell.payable_percent} 
                                />
                              )}
                              <div>
                                <div className="text-xs text-muted-foreground">Payable %</div>
                                <div className="font-medium">
                                  {selectedSell.pricing_type === 'Formula' && selectedSell.payable_percent 
                                    ? `${(selectedSell.payable_percent * 100).toFixed(1)}%` 
                                    : '—'}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Fixation Method */}
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Fixation Method</div>
                              <div className="text-sm">{selectedBuy.fixation_method || '—'}</div>
                            </div>
                            <ComparisonIndicator field="fixation" buyValue={selectedBuy.fixation_method} sellValue={selectedSell.fixation_method} />
                            <div>
                              <div className="text-xs text-muted-foreground">Fixation Method</div>
                              <div className="text-sm">{selectedSell.fixation_method || '—'}</div>
                            </div>
                          </div>

                          {/* Currency */}
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Currency</div>
                              <div className="font-medium">{selectedBuy.currency || '—'}</div>
                            </div>
                            {selectedBuy.currency !== selectedSell.currency ? (
                              <div className="flex items-center gap-1 text-amber-600">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-xs font-medium">Different</span>
                              </div>
                            ) : (
                              <ComparisonIndicator field="currency" buyValue={selectedBuy.currency} sellValue={selectedSell.currency} />
                            )}
                            <div>
                              <div className="text-xs text-muted-foreground">Currency</div>
                              <div className="font-medium">{selectedSell.currency || '—'}</div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Hedge Warning */}
                      {(selectedBuy.lme_action_needed === true || (selectedBuy.lme_action_needed as any) === 1 || selectedSell.lme_action_needed === true || (selectedSell.lme_action_needed as any) === 1) && (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs font-medium">Hedge request needed</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Button 
                    onClick={handleMatchTickets} 
                    className="w-full"
                    size="lg"
                    disabled={compatibility?.issues.includes('product') || compatibility?.issues.includes('price')}
                  >
                    Match These Tickets
                  </Button>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                  <div>
                    <p className="mb-2">Select tickets from both sides</p>
                    <p className="text-sm">to see detailed comparison</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Pane - Sell Tickets */}
        <ResizablePanel defaultSize={30} minSize={25}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Sell Tickets</h3>
                <Badge variant="secondary">{filteredSellTickets.length}</Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ID..."
                  value={sellSearchQuery}
                  onChange={(e) => setSellSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {selectedBuyTicket && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Showing compatible tickets
                </div>
              )}
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2">
                {filteredSellTickets.length > 0 ? (
                  filteredSellTickets.map((ticket) => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      type="sell"
                      isSelected={selectedSellTicket === ticket.id}
                      isExpanded={expandedSellTicket === ticket.id}
                      onSelect={setSelectedSellTicket}
                      onToggleExpand={setExpandedSellTicket}
                    />
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    {selectedBuyTicket ? 'No compatible sell tickets' : 'No approved sell tickets'}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <ResolveRemainderDialog
        open={showRemainderDialog}
        onOpenChange={setShowRemainderDialog}
        remainderMT={remainderData?.remainderMT || 0}
        surplusSide={remainderData?.surplusSide || "buy"}
        referenceTicket={remainderData?.referenceTicket}
        onResolve={handleRemainderResolution}
      />

      <HedgeRequestDialog
        open={showHedgeDialog}
        onOpenChange={setShowHedgeDialog}
        prefillSides={hedgePrefillData}
        onCreated={onClose}
      />
    </div>
  );
};