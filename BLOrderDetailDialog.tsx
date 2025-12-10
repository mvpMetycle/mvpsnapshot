import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GenerateDocumentDialog } from "@/components/GenerateDocumentDialog";
import { useState } from "react";

interface BLOrderDetailDialogProps {
  blOrder: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BLOrderDetailDialog({
  blOrder,
  open,
  onOpenChange,
}: BLOrderDetailDialogProps) {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  // Fetch planned shipment quantities for this BL order
  const { data: totalPlannedQuantity } = useQuery({
    queryKey: ["bl-order-planned-quantity", blOrder?.bl_order_name, blOrder?.order_id],
    queryFn: async () => {
      if (!blOrder?.bl_order_name || !blOrder?.order_id) return 0;
      
      // Parse bl_order_name to extract shipment numbers
      // Format: "order_id-shipment1,shipment2,shipment3"
      const parts = blOrder.bl_order_name.split("-");
      if (parts.length < 2) return 0;
      
      const shipmentNumbers = parts[1].split(",").map(n => parseInt(n.trim()));
      
      // Get the order to find which ticket IDs to query
      const { data: orderData, error: orderError } = await supabase
        .from("order")
        .select("buyer")
        .eq("id", blOrder.order_id)
        .single();
      
      if (orderError) throw orderError;
      
      // Extract buy ticket IDs
      const buyTicketIds = orderData.buyer
        ?.split(",")
        .map((id: string) => parseInt(id.trim()))
        .filter((id: number) => !isNaN(id)) || [];
      
      if (buyTicketIds.length === 0) return 0;
      
      // Fetch planned shipments for these ticket IDs and shipment numbers
      const { data, error } = await supabase
        .from("planned_shipment")
        .select("quantity_at_shipment_level")
        .in("order_id", buyTicketIds)
        .in("shipment_number", shipmentNumbers);
      
      if (error) throw error;
      
      // Sum all quantities
      return data?.reduce((sum, item) => sum + (item.quantity_at_shipment_level || 0), 0) || 0;
    },
    enabled: open && !!blOrder?.bl_order_name && !!blOrder?.order_id,
  });

  const formatAmount = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const DetailRow = ({ label, value }: { label: string; value: any }) => (
    <div className="flex justify-between py-2 border-b border-border/50">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium text-sm">{value || "-"}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>BL Order Details - {blOrder.bl_order_name}</DialogTitle>
            <Button onClick={() => setShowGenerateDialog(true)} size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Generate Document
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="space-y-6 pr-4">
            {/* Basic Information */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm mb-3">Basic Information</h4>
              <DetailRow label="BL Order Name" value={blOrder.bl_order_name} />
              <DetailRow label="Order ID" value={blOrder.order_id} />
              <DetailRow label="Status" value={blOrder.status} />
              <DetailRow label="BL Number" value={blOrder.bl_number} />
              <DetailRow label="BL Issue Date" value={formatDate(blOrder.bl_issue_date)} />
            </div>

            {/* Shipping Information */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm mb-3">Shipping Information</h4>
              <DetailRow label="Port of Loading" value={blOrder.port_of_loading} />
              <DetailRow label="Port of Discharge" value={blOrder.port_of_discharge} />
              <DetailRow label="Final Destination" value={blOrder.final_destination} />
              <DetailRow label="Loading Date" value={formatDate(blOrder.loading_date)} />
            </div>

            {/* Schedule */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm mb-3">Schedule</h4>
              <DetailRow label="ETD (Estimated Departure)" value={formatDate(blOrder.etd)} />
              <DetailRow label="ATD (Actual Departure)" value={formatDate(blOrder.atd)} />
              <DetailRow label="ETA (Estimated Arrival)" value={formatDate(blOrder.eta)} />
              <DetailRow label="ATA (Actual Arrival)" value={formatDate(blOrder.ata)} />
            </div>

            {/* Quantities */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm mb-3">Quantities</h4>
              <DetailRow
                label="Total Quantity (MT)"
                value={formatAmount(totalPlannedQuantity || 0)}
              />
              <DetailRow
                label="Loaded Quantity (MT)"
                value={formatAmount(blOrder.loaded_quantity_mt)}
              />
            </div>

            {/* Financial */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm mb-3">Financial</h4>
              <DetailRow label="Buy Price" value={formatAmount(blOrder.buy_final_price)} />
              <DetailRow label="Sell Price" value={formatAmount(blOrder.sell_final_price)} />
              <DetailRow label="Revenue" value={formatAmount(blOrder.revenue)} />
              <DetailRow label="Cost" value={formatAmount(blOrder.cost)} />
              <DetailRow label="Final Invoice ID" value={blOrder.final_invoice_id} />
            </div>

            {/* Documents & Notes */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm mb-3">Documents & Notes</h4>
              <DetailRow
                label="BL URL"
                value={
                  blOrder.bl_url ? (
                    <a
                      href={blOrder.bl_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View Document
                    </a>
                  ) : (
                    "-"
                  )
                }
              />
              <div className="pt-2">
                <span className="text-muted-foreground text-sm block mb-2">Notes</span>
                <p className="text-sm bg-background p-3 rounded border">
                  {blOrder.notes || "No notes available"}
                </p>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm mb-3">Metadata</h4>
              <DetailRow label="Created At" value={formatDate(blOrder.created_at)} />
              <DetailRow label="Updated At" value={formatDate(blOrder.updated_at)} />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
      
      <GenerateDocumentDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        preselectedBLOrderId={blOrder.id}
      />
    </Dialog>
  );
}
