import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentSigningSection } from "@/components/DocumentSigningSection";
import { Button } from "@/components/ui/button";

interface OrderDetailDialogProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OrderDetailDialog = ({ orderId, open, onOpenChange }: OrderDetailDialogProps) => {
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!orderId,
  });

  const buyTicketIds = order?.buyer?.split(",").map((id) => parseInt(id.trim())) || [];
  const sellTicketIds = order?.seller?.split(",").map((id) => parseInt(id.trim())) || [];

  const { data: buyTickets, isLoading: buyLoading } = useQuery({
    queryKey: ["buy-tickets", buyTicketIds],
    queryFn: async () => {
      if (buyTicketIds.length === 0) return [];
      const { data, error } = await supabase
        .from("ticket")
        .select("*, traders(name)")
        .in("id", buyTicketIds);

      if (error) throw error;
      return data;
    },
    enabled: open && buyTicketIds.length > 0,
  });

  const { data: sellTickets, isLoading: sellLoading } = useQuery({
    queryKey: ["sell-tickets", sellTicketIds],
    queryFn: async () => {
      if (sellTicketIds.length === 0) return [];
      const { data, error } = await supabase
        .from("ticket")
        .select("*, traders(name)")
        .in("id", sellTicketIds);

      if (error) throw error;
      return data;
    },
    enabled: open && sellTicketIds.length > 0,
  });

  const { data: plannedShipments, isLoading: shipmentsLoading } = useQuery({
    queryKey: ["planned-shipments-order", orderId, buyTicketIds],
    queryFn: async () => {
      if (buyTicketIds.length === 0) return [];

      // Fetch existing planned shipments
      const { data: existingShipments, error } = await supabase
        .from("planned_shipment")
        .select("*")
        .in("order_id", buyTicketIds)
        .order("shipment_number", { ascending: true });

      if (error) throw error;

      // If shipments already exist, use them
      if (existingShipments && existingShipments.length > 0) {
        return existingShipments;
      }

      // Otherwise, derive shipments from the BUY ticket's planned_shipments field
      const { data: tickets, error: ticketError } = await supabase
        .from("ticket")
        .select("id, planned_shipments")
        .in("id", buyTicketIds);

      if (ticketError) throw ticketError;
      if (!tickets || tickets.length === 0) return [];

      const inserts: { order_id: number; shipment_number: number | null }[] = [];

      tickets.forEach((ticket) => {
        const count = Number(ticket.planned_shipments) || 0;
        for (let i = 1; i <= count; i++) {
          inserts.push({
            order_id: ticket.id,
            shipment_number: i,
          });
        }
      });

      if (inserts.length === 0) return [];

      const { data: insertedShipments, error: insertError } = await supabase
        .from("planned_shipment")
        .insert(inserts)
        .select("*")
        .order("shipment_number", { ascending: true });

      if (insertError) throw insertError;
      return insertedShipments || [];
    },
    enabled: open && buyTicketIds.length > 0,
  });

  const isLoading = orderLoading || buyLoading || sellLoading || shipmentsLoading;

  const formatAmount = (amount: number | null | undefined): string => {
    if (!amount) return "—";
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const DetailRow = ({ label, value }: { label: string; value: string | number | null }) => (
    <div className="flex justify-between py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );

  const TicketSection = ({ ticket, isBuy }: { ticket: any; isBuy: boolean }) => (
    <div className="space-y-4">
      <div className="bg-muted/50 p-4 rounded-lg space-y-2" style={{ height: '224px' }}>
        <h4 className="font-semibold text-sm mb-3">Trade Details</h4>
        <DetailRow label="Ticket ID" value={ticket.id} />
        <DetailRow label="Type" value={ticket.type} />
        <DetailRow label="Transaction Type" value={ticket.transaction_type} />
        <DetailRow label="Status" value={ticket.status} />
        <DetailRow label="Counterparty" value={ticket.client_name} />
        <DetailRow label="Trader" value={ticket.traders?.name} />
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-2" style={{ height: '204px' }}>
        <h4 className="font-semibold text-sm mb-3">Product Details</h4>
        <DetailRow label="Commodity" value={ticket.commodity_type} />
        <DetailRow label="ISRI Grade" value={ticket.isri_grade} />
        <DetailRow label="Metal Form" value={ticket.metal_form} />
        <DetailRow label="Quantity (MT)" value={ticket.quantity} />
        {isBuy ? (
          <DetailRow label="Country of Origin" value={ticket.country_of_origin} />
        ) : (
          <div className="flex justify-between py-2 invisible">
            <span className="text-muted-foreground">Country of Origin</span>
            <span className="font-medium">—</span>
          </div>
        )}
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-2" style={{ height: '204px' }}>
        <h4 className="font-semibold text-sm mb-3">Logistics</h4>
        {isBuy ? (
          <DetailRow label="Ship From" value={ticket.ship_from} />
        ) : (
          <DetailRow label="Ship To" value={ticket.ship_to} />
        )}
        <DetailRow label="Incoterms" value={ticket.incoterms} />
        <DetailRow label="Transport Method" value={ticket.transport_method} />
        <DetailRow label="Shipment Window" value={ticket.shipment_window} />
        <DetailRow label="Planned Shipments" value={ticket.planned_shipments} />
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-2" style={{ height: '228px' }}>
        <h4 className="font-semibold text-sm mb-3">Pricing</h4>
        <DetailRow label="Pricing Type" value={ticket.pricing_type} />
        <DetailRow label="Currency" value={ticket.currency} />
        <DetailRow label="Signed Price" value={ticket.signed_price} />
        <DetailRow label="LME Price" value={ticket.lme_price} />
        <DetailRow label="Premium/Discount" value={ticket.premium_discount} />
        <DetailRow label="Payable %" value={ticket.payable_percent} />
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-2" style={{ height: '204px' }}>
        <h4 className="font-semibold text-sm mb-3">Financial Terms</h4>
        <DetailRow label="Payment Terms" value={ticket.payment_terms} />
        <DetailRow label="Payment Trigger Event" value={ticket.payment_trigger_event} />
        <DetailRow label="Payment Trigger Timing" value={ticket.payment_trigger_timing} />
        <DetailRow label="Payment Offset Days" value={ticket.payment_offset_days} />
        <DetailRow 
          label="Down Payment %" 
          value={ticket.down_payment_amount_percent 
            ? `${(parseFloat(ticket.down_payment_amount_percent) * 100).toFixed(1)}%` 
            : "—"} 
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details - {orderId}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6 items-start">
              <div>
                <h3 className="text-lg font-semibold mb-4">Buy Tickets</h3>
                {buyTickets && buyTickets.length > 0 ? (
                  <div className="space-y-6">
                    {buyTickets.map((ticket) => (
                      <div key={ticket.id}>
                        <TicketSection ticket={ticket} isBuy={true} />
                        {buyTickets.length > 1 && <Separator className="mt-6" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No buy tickets found</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Sell Tickets</h3>
                {sellTickets && sellTickets.length > 0 ? (
                  <div className="space-y-6">
                    {sellTickets.map((ticket) => (
                      <div key={ticket.id}>
                        <TicketSection ticket={ticket} isBuy={false} />
                        {sellTickets.length > 1 && <Separator className="mt-6" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No sell tickets found</p>
                )}
              </div>
            </div>

            {/* Planned Shipments Section */}
            <Separator className="my-6" />
            <div>
              <h3 className="text-lg font-semibold mb-4">Planned Shipments</h3>
              {plannedShipments && plannedShipments.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shipment #</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plannedShipments.map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell className="font-medium">
                            {shipment.shipment_number || "—"}
                          </TableCell>
                          <TableCell>
                            {shipment.created_at
                              ? new Date(shipment.created_at).toLocaleDateString()
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground">No planned shipments found</p>
              )}
            </div>

            {/* Documents Section */}
            <Separator className="my-6" />
            <div>
              <h3 className="text-lg font-semibold mb-4">Documents</h3>
              
              {/* Deal docs */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">Deal docs</h4>
                  {!order?.sales_order_url && !order?.purchase_order_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const { toast } = await import("sonner");
                        const { DocumentGenerationService } = await import("@/services/documentGenerationService");
                        
                        try {
                          toast.loading("Generating Sales Order and Purchase Order from templates...", { duration: 10000 });
                          
                          // Generate both documents
                          await DocumentGenerationService.generateOrderDocument({
                            templateName: "Sales Order",
                            orderId,
                          });
                          
                          await DocumentGenerationService.generateOrderDocument({
                            templateName: "Purchase Order",
                            orderId,
                          });
                          
                          toast.success("Documents generated successfully!");
                          window.location.reload();
                        } catch (error: any) {
                          console.error("Document generation error:", error);
                          toast.error("Failed to generate documents", {
                            description: error.message,
                          });
                        }
                      }}
                    >
                      Generate SO & PO
                    </Button>
                  )}
                </div>
                <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                  {/* Sales Order */}
                  <div>
                    <h5 className="font-medium text-sm mb-2">Sales Order</h5>
                    <DocumentSigningSection
                      documentUrl={order?.sales_order_url || order?.signed_sales_order_url || null}
                      documentName={`Sales-Order-${orderId}`}
                      documentType="sales_order"
                      referenceId={orderId}
                      referenceTable="order"
                      recipients={[
                        {
                          email: "natalia.sanchez@metycle.com",
                          firstName: "Natalia",
                          lastName: "Sanchez",
                          signingOrder: 1,
                        }
                      ]}
                    />
                  </div>

                  <Separator />

                  {/* Purchase Order */}
                  <div>
                    <h5 className="font-medium text-sm mb-2">Purchase Order</h5>
                    <DocumentSigningSection
                      documentUrl={order?.purchase_order_url || order?.signed_purchase_order_url || null}
                      documentName={`Purchase-Order-${orderId}`}
                      documentType="purchase_order"
                      referenceId={orderId}
                      referenceTable="order"
                      recipients={[
                        {
                          email: "natalia.sanchez@metycle.com",
                          firstName: "Natalia",
                          lastName: "Sanchez",
                          signingOrder: 1,
                        }
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Payments */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Payments</h4>
                
                {/* Sales Downpayment Invoice */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2 mb-4">
                  <h5 className="font-medium text-sm mb-2">Sales Downpayment Invoice</h5>
                  <DetailRow 
                    label="Invoice Number" 
                    value={order?.sell_downmapayment_invoice 
                      ? (typeof order.sell_downmapayment_invoice === 'object' && order.sell_downmapayment_invoice !== null 
                        ? (order.sell_downmapayment_invoice as any).invoice_number 
                        : "—") 
                      : "—"} 
                  />
                  <DetailRow 
                    label="Amount" 
                    value={sellTickets && sellTickets.length > 0 && sellTickets[0].down_payment_amount_percent && sellTickets[0].signed_volume
                      ? formatAmount(sellTickets[0].down_payment_amount_percent * sellTickets[0].signed_volume)
                      : "—"} 
                  />
                  <DetailRow label="Currency" value={sellTickets?.[0]?.currency || "—"} />
                  <DetailRow 
                    label="Due Date" 
                    value={(() => {
                      if (!sellTickets || sellTickets.length === 0) return "—";
                      const trigger = sellTickets[0].downpayment_trigger;
                      if (trigger === "Order Signed Date" && order?.sales_order_sign_date) {
                        return new Date(order.sales_order_sign_date).toLocaleDateString();
                      }
                      // Loading date not yet available in order table
                      return "—";
                    })()} 
                  />
                  <DetailRow 
                    label="Paid Date" 
                    value={order?.sell_downpayment_paid_date 
                      ? new Date(order.sell_downpayment_paid_date).toLocaleDateString() 
                      : "—"} 
                  />
                </div>

                {/* Purchase Downpayment Invoice */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h5 className="font-medium text-sm mb-2">Purchase Downpayment Invoice</h5>
                  <DetailRow 
                    label="Invoice Number" 
                    value={order?.buy_downpayment_invoice 
                      ? (typeof order.buy_downpayment_invoice === 'object' && order.buy_downpayment_invoice !== null 
                        ? (order.buy_downpayment_invoice as any).invoice_number 
                        : "—") 
                      : "—"} 
                  />
                  <DetailRow 
                    label="Amount" 
                    value={buyTickets && buyTickets.length > 0 && buyTickets[0].down_payment_amount_percent && buyTickets[0].signed_volume
                      ? formatAmount(buyTickets[0].down_payment_amount_percent * buyTickets[0].signed_volume)
                      : "—"} 
                  />
                  <DetailRow label="Currency" value={buyTickets?.[0]?.currency || "—"} />
                  <DetailRow 
                    label="Due Date" 
                    value={(() => {
                      if (!buyTickets || buyTickets.length === 0) return "—";
                      const trigger = buyTickets[0].downpayment_trigger;
                      if (trigger === "Order Signed Date" && order?.sales_order_sign_date) {
                        return new Date(order.sales_order_sign_date).toLocaleDateString();
                      }
                      // Loading date not yet available in order table
                      return "—";
                    })()} 
                  />
                  <DetailRow 
                    label="Paid Date" 
                    value={order?.buy_downpayment_paid_date 
                      ? new Date(order.buy_downpayment_paid_date).toLocaleDateString() 
                      : "—"} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
