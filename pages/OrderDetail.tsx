import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, FileText, Calendar } from "lucide-react";
import { HedgingSummarySection } from "@/components/hedging/HedgingSummarySection";
import { useHasExecutedHedgeForOrder } from "@/hooks/useHasExecutedHedge";
import { toast } from "sonner";
import { DocumentSigningSection } from "@/components/DocumentSigningSection";
import { Label } from "@/components/ui/label";
import { PaymentsSection } from "@/components/payments";
import { OrderShipmentsSection } from "@/components/OrderShipmentsSection";

type Order = {
  id: string;
  status: string | null;
  buyer: string | null;
  seller: string | null;
  created_at: string | null;
  commodity_type: string | null;
  isri_grade: string | null;
  allocated_quantity_mt: number | null;
  buy_price: number | null;
  sell_price: number | null;
  margin: number | null;
  ship_from: string | null;
  ship_to: string | null;
  product_details: string | null;
  sales_order_url: string | null;
  purchase_order_url: string | null;
  signed_sales_order_url: string | null;
  signed_purchase_order_url: string | null;
  sales_order_sign_date: string | null;
  sell_downpayment_paid_date: string | null;
  buy_downpayment_paid_date: string | null;
  metal_form: string | null;
  loading_date: string | null;
  transaction_type: string | null;
};

type Ticket = {
  id: number;
  client_name: string | null;
  country_of_origin: string | null;
  incoterms: string | null;
  payment_terms: string | null;
  currency: string | null;
  traders?: { name: string } | null;
  type: string | null;
  pricing_type: string | null;
  signed_price: number | null;
  lme_price: number | null;
  payable_percent: number | null;
  premium_discount: number | null;
  payment_trigger_event: string | null;
  payment_trigger_timing: string | null;
  payment_offset_days: number | null;
};

const OrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromCashAvailability = location.state?.from === 'cash-availability';
  const [order, setOrder] = useState<Order | null>(null);
  const [buyTickets, setBuyTickets] = useState<Ticket[]>([]);
  const [sellTickets, setSellTickets] = useState<Ticket[]>([]);
  const [blOrders, setBlOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { hasExecutedHedge } = useHasExecutedHedgeForOrder(orderId || null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from("order")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Fetch buy and sell tickets
      const buyTicketIds = orderData.buyer?.split(",").map((id: string) => parseInt(id.trim())) || [];
      const sellTicketIds = orderData.seller?.split(",").map((id: string) => parseInt(id.trim())) || [];

      if (buyTicketIds.length > 0) {
        const { data: buyData, error: buyError } = await supabase
          .from("ticket")
          .select("id, client_name, country_of_origin, incoterms, payment_terms, currency, type, pricing_type, signed_price, lme_price, payable_percent, premium_discount, payment_trigger_event, payment_trigger_timing, payment_offset_days, traders(name)")
          .in("id", buyTicketIds);
        if (buyError) throw buyError;
        setBuyTickets(buyData || []);
      }

      if (sellTicketIds.length > 0) {
        const { data: sellData, error: sellError } = await supabase
          .from("ticket")
          .select("id, client_name, country_of_origin, incoterms, payment_terms, currency, type, pricing_type, signed_price, lme_price, payable_percent, premium_discount, payment_trigger_event, payment_trigger_timing, payment_offset_days, traders(name)")
          .in("id", sellTicketIds);
        if (sellError) throw sellError;
        setSellTickets(sellData || []);
      }

      // Fetch BL orders
      const { data: blData, error: blError } = await supabase
        .from("bl_order")
        .select("*")
        .eq("order_id", orderId);
      if (blError) throw blError;
      setBlOrders(blData || []);
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatMargin = (margin: number | null) => {
    if (margin === null) return "—";
    return `${(margin * 100).toFixed(2)}%`;
  };

  const getStatusVariant = (status: string | null): "success" | "secondary" | "outline" => {
    if (status === "Allocated") return "success";
    if (status === "Unallocated") return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading order details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Order not found
      </div>
    );
  }

  const buyTraders = buyTickets.map(t => t.traders?.name).filter(Boolean).join(", ");
  const sellTraders = sellTickets.map(t => t.traders?.name).filter(Boolean).join(", ");
  const buyIncoterms = [...new Set(buyTickets.map(t => t.incoterms).filter(Boolean))].join(", ");
  const sellIncoterms = [...new Set(sellTickets.map(t => t.incoterms).filter(Boolean))].join(", ");
  const buyPaymentTerms = [...new Set(buyTickets.map(t => t.payment_terms).filter(Boolean))].join(", ");
  const sellPaymentTerms = [...new Set(sellTickets.map(t => t.payment_terms).filter(Boolean))].join(", ");

  const formatPricingInfo = (ticket: Ticket) => {
    if (!ticket.pricing_type) return "—";
    if (ticket.pricing_type === "Fixed") {
      return `Fixed: ${formatCurrency(ticket.signed_price)}`;
    }
    if (ticket.pricing_type === "Formula") {
      const payable = ticket.payable_percent ? `${(ticket.payable_percent * 100).toFixed(0)}%` : "—";
      return `Formula: LME × ${payable}`;
    }
    if (ticket.pricing_type === "Index") {
      const premium = ticket.premium_discount ? (ticket.premium_discount >= 0 ? `+${ticket.premium_discount}` : ticket.premium_discount) : "—";
      return `Index: LME ${premium}`;
    }
    return ticket.pricing_type;
  };

  const formatPaymentTrigger = (event: string | null, offset: number | null): string => {
    if (!event || offset == null) return "—";

    if (offset === 0) {
      return `On ${event}`;
    }

    const sign = offset > 0 ? "+" : "-";
    const absDays = Math.abs(offset);
    const label = offset > 0 ? "After" : "Before";

    return `${sign}${absDays}d ${label} ${event}`;
  };

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Button
        variant="ghost"
        onClick={() => navigate(fromCashAvailability ? "/finance/cash-availability" : "/inventory")}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {fromCashAvailability ? "Back to Cash Availability" : "Back to Orders"}
      </Button>

      {/* Header Section - Order Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Order {order.id}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{buyTickets[0]?.client_name || "—"}</span>
                <span>→</span>
                <span>{sellTickets[0]?.client_name || "—"}</span>
                <span>·</span>
                <Calendar className="h-4 w-4" />
                <span>{formatDate(order.created_at)}</span>
              </div>
            </div>
            <Badge variant={getStatusVariant(order.status)}>
              {order.status || "Pending"}
            </Badge>
          </div>

          {/* Summary Chips */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Commodity</Label>
              <p className="text-sm font-medium">{order.commodity_type || "—"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Quantity</Label>
              <p className="text-sm font-medium">{order.allocated_quantity_mt ? `${order.allocated_quantity_mt} MT` : "—"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">ISRI Grade</Label>
              <p className="text-sm font-medium">{order.isri_grade || "—"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Incoterms</Label>
              <p className="text-sm font-medium">{buyIncoterms || sellIncoterms || "—"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ship From</Label>
              <p className="text-sm font-medium">{order.ship_from || "—"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ship To</Label>
              <p className="text-sm font-medium">{order.ship_to || "—"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Traders</Label>
              <p className="text-sm font-medium">{buyTraders || sellTraders || "—"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Margin</Label>
              <p className={`text-sm font-medium ${
                (order.margin || 0) > 0.1 
                  ? "text-success" 
                  : (order.margin || 0) > 0.05 
                  ? "text-orange-500" 
                  : "text-destructive"
              }`}>
                {formatMargin(order.margin)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Information Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Order Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            {/* Column 1: Product Info */}
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Commodity</Label>
                <p className="text-sm font-medium">{order.commodity_type || "—"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">ISRI Grade</Label>
                <p className="text-sm font-medium">{order.isri_grade || "—"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Metal Form</Label>
                <p className="text-sm font-medium">{order.metal_form || "—"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Quantity</Label>
                <p className="text-sm font-medium">{order.allocated_quantity_mt ? `${order.allocated_quantity_mt} MT` : "—"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Product Details</Label>
                <p className="text-sm font-medium">{order.product_details || "—"}</p>
              </div>
            </div>

            {/* Column 2: Trade Info */}
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Buy Ticket ID(s)</Label>
                <p className="text-sm font-medium">{order.buyer || "—"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sell Ticket ID(s)</Label>
                <p className="text-sm font-medium">{order.seller || "—"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Buy Price</Label>
                <p className="text-sm font-medium text-right">{formatCurrency(order.buy_price)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sell Price</Label>
                <p className="text-sm font-medium text-right">{formatCurrency(order.sell_price)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Margin</Label>
                <p className={`text-sm font-medium text-right ${
                  (order.margin || 0) > 0.1 
                    ? "text-success" 
                    : (order.margin || 0) > 0.05 
                    ? "text-orange-500" 
                    : "text-destructive"
                }`}>
                  {formatMargin(order.margin)}
                </p>
              </div>
            </div>

            {/* Column 3: Logistics & Counterparty */}
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Incoterms</Label>
                <p className="text-sm font-medium">{buyIncoterms && sellIncoterms ? `${buyIncoterms} / ${sellIncoterms}` : buyIncoterms || sellIncoterms || "—"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ship From</Label>
                <p className="text-sm font-medium">{order.ship_from || "—"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ship To</Label>
                <p className="text-sm font-medium">{order.ship_to || "—"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Buyer / Seller</Label>
                <p className="text-sm font-medium">{buyTickets[0]?.client_name || "—"} / {sellTickets[0]?.client_name || "—"}</p>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Buy/Sell Payment Terms & Pricing Info */}
          <div className="grid grid-cols-2 gap-6">
            {/* Buy Side */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-sm text-primary">Buy Side</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Payment Terms</Label>
                  <p className="text-sm font-medium">{buyPaymentTerms || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pricing Type</Label>
                  <p className="text-sm font-medium">{buyTickets[0] ? formatPricingInfo(buyTickets[0]) : "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Payment Trigger</Label>
                  <p className="text-sm font-medium">{formatPaymentTrigger(buyTickets[0]?.payment_trigger_event, buyTickets[0]?.payment_offset_days)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Currency</Label>
                  <p className="text-sm font-medium">{buyTickets[0]?.currency || "—"}</p>
                </div>
              </div>
            </div>

            {/* Sell Side */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-sm text-primary">Sell Side</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Payment Terms</Label>
                  <p className="text-sm font-medium">{sellPaymentTerms || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pricing Type</Label>
                  <p className="text-sm font-medium">{sellTickets[0] ? formatPricingInfo(sellTickets[0]) : "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Payment Trigger</Label>
                  <p className="text-sm font-medium">{formatPaymentTrigger(sellTickets[0]?.payment_trigger_event, sellTickets[0]?.payment_offset_days)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Currency</Label>
                  <p className="text-sm font-medium">{sellTickets[0]?.currency || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hedging Summary Section - Only show if there are executed hedges */}
      {hasExecutedHedge && (
        <HedgingSummarySection
          orderId={orderId}
        />
      )}

      {/* Documents Section */}
      {(() => {
        // Determine which documents to show based on transaction_type and ticket type
        const isB2B = order.transaction_type?.toLowerCase() === 'b2b';
        const isInventory = order.transaction_type?.toLowerCase() === 'inventory';
        
        // For inventory orders, check the linked ticket type
        const linkedTicket = buyTickets[0] || sellTickets[0];
        const ticketType = linkedTicket?.type; // 'Buy' or 'Sell'
        
        // Document visibility flags
        const showSO = isB2B || (isInventory && ticketType === 'Sell');
        const showPO = isB2B || (isInventory && ticketType === 'Buy');
        
        // Generation button logic
        const canGenerateSO = showSO && !order.sales_order_url;
        const canGeneratePO = showPO && !order.purchase_order_url;
        const showGenerateButton = (canGenerateSO || canGeneratePO) && (showSO || showPO);
        
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Documents</CardTitle>
                </div>
                {showGenerateButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const toastId = toast.loading(
                        isB2B ? "Generating Sales Order and Purchase Order..." : 
                        canGenerateSO ? "Generating Sales Order..." : 
                        "Generating Purchase Order..."
                      );
                      
                      try {
                        const { DocumentGenerationService } = await import("@/services/documentGenerationService");
                        
                        if (isB2B) {
                          await DocumentGenerationService.generateOrderDocument({
                            templateName: "Sales Order",
                            orderId: order.id,
                          });
                          await DocumentGenerationService.generateOrderDocument({
                            templateName: "Purchase Order",
                            orderId: order.id,
                          });
                          toast.success("Documents generated successfully!", { id: toastId });
                        } else if (canGenerateSO) {
                          await DocumentGenerationService.generateOrderDocument({
                            templateName: "Sales Order",
                            orderId: order.id,
                          });
                          toast.success("Sales Order generated successfully!", { id: toastId });
                        } else if (canGeneratePO) {
                          await DocumentGenerationService.generateOrderDocument({
                            templateName: "Purchase Order",
                            orderId: order.id,
                          });
                          toast.success("Purchase Order generated successfully!", { id: toastId });
                        }
                        
                        fetchOrderDetails();
                      } catch (error: any) {
                        console.error("Document generation error:", error);
                        toast.error("Failed to generate documents", {
                          id: toastId,
                          description: error.message,
                        });
                      }
                    }}
                  >
                    {isB2B ? "Generate SO & PO" : canGenerateSO ? "Generate SO" : "Generate PO"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sales Order - Only show if B2B or Inventory+Sell */}
              {showSO && (
                <div>
                  <h5 className="font-medium text-sm mb-3">Sales Order</h5>
                  <DocumentSigningSection
                    documentUrl={order.sales_order_url || order.signed_sales_order_url || null}
                    documentName={`Sales-Order-${order.id}`}
                    documentType="sales_order"
                    referenceId={order.id}
                    referenceTable="order"
                    recipients={[
                      {
                        email: "operations@metycle.com",
                        firstName: "Operations",
                        lastName: "Team",
                        signingOrder: 1,
                      }
                    ]}
                  />
                </div>
              )}

              {showSO && showPO && <Separator />}

              {/* Purchase Order - Only show if B2B or Inventory+Buy */}
              {showPO && (
                <div>
                  <h5 className="font-medium text-sm mb-3">Purchase Order</h5>
                  <DocumentSigningSection
                    documentUrl={order.purchase_order_url || order.signed_purchase_order_url || null}
                    documentName={`Purchase-Order-${order.id}`}
                    documentType="purchase_order"
                    referenceId={order.id}
                    referenceTable="order"
                    recipients={[
                      {
                        email: "operations@metycle.com",
                        firstName: "Operations",
                        lastName: "Team",
                        signingOrder: 1,
                      }
                    ]}
                  />
                </div>
              )}

              {!showSO && !showPO && (
                <p className="text-muted-foreground text-sm">No documents available for this order type.</p>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Payments Section */}
      <PaymentsSection orderId={orderId || ""} loadingDate={order.loading_date} />

      {/* Shipments / BLs Section */}
      <OrderShipmentsSection
        orderId={orderId || ""}
        buyTicketIds={buyTickets.map((t) => t.id)}
        allocatedQuantity={order.allocated_quantity_mt}
        blOrders={blOrders}
        onRefresh={fetchOrderDetails}
      />
    </div>
  );
};

export default OrderDetail;
