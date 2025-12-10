import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { HedgeExecutionDialog } from "./HedgeExecutionDialog";
import { RollExecutionDialog } from "./RollExecutionDialog";
import { FixingCloseExecutionDialog } from "./FixingCloseExecutionDialog";
import { PriceFixExecuteDialog } from "./PriceFixExecuteDialog";
import type { Database } from "@/integrations/supabase/types";

type HedgeRequestBase = Database["public"]["Tables"]["hedge_request"]["Row"];
type HedgeRequestStatus = Database["public"]["Enums"]["hedge_request_status"];
type HedgeRequestSource = Database["public"]["Enums"]["hedge_request_source"];

// Extended type for new fields
type HedgeRequest = HedgeRequestBase & {
  request_type?: "open" | "roll" | "fixing_close";
  related_execution_id?: string | null;
  linked_execution_id?: string | null;
  bl_order_id?: number | null;
};

const statusColors: Record<HedgeRequestStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  "Pending Approval": "bg-yellow-100 text-yellow-800",
  Approved: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
  Cancelled: "bg-gray-100 text-gray-800",
  Executed: "bg-blue-100 text-blue-800",
};

const requestTypeLabels: Record<string, string> = {
  open: "Open Hedge",
  roll: "Roll",
  fixing_close: "Fixing Close",
};

const sourceLabels: Record<string, string> = {
  Manual: "Manual",
  Auto_QP: "Deal Matching",
  Price_Fix: "Price Fix",
  Roll: "Roll",
};

interface HedgeRequestDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: HedgeRequest | null;
  onExecutionCreated?: () => void;
}

export function HedgeRequestDetailDialog({
  open,
  onOpenChange,
  request,
  onExecutionCreated,
}: HedgeRequestDetailDialogProps) {
  const [executionDialogOpen, setExecutionDialogOpen] = useState(false);
  const [rollExecutionDialogOpen, setRollExecutionDialogOpen] = useState(false);
  const [fixingCloseDialogOpen, setFixingCloseDialogOpen] = useState(false);
  const [priceFixExecuteDialogOpen, setPriceFixExecuteDialogOpen] = useState(false);

  // Fetch ticket QP data if request has ticket_id
  const { data: ticketQpData } = useQuery({
    queryKey: ["ticket-qp-data", request?.ticket_id],
    queryFn: async () => {
      if (!request?.ticket_id) return null;
      const { data, error } = await supabase
        .from("ticket")
        .select("qp_start_anchor, qp_start_offset_days, qp_end_anchor, qp_end_offset_days")
        .eq("id", request.ticket_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!request?.ticket_id && open,
  });

  if (!request) return null;

  const formatQpPeriod = () => {
    if (!ticketQpData?.qp_start_anchor && !ticketQpData?.qp_end_anchor) return null;
    const startAnchor = ticketQpData.qp_start_anchor?.replace(/_/g, " ") || "—";
    const endAnchor = ticketQpData.qp_end_anchor?.replace(/_/g, " ") || "—";
    const startOffset = ticketQpData.qp_start_offset_days;
    const endOffset = ticketQpData.qp_end_offset_days;
    return `${startAnchor}${startOffset ? ` (${startOffset > 0 ? "+" : ""}${startOffset}d)` : ""} → ${endAnchor}${endOffset ? ` (${endOffset > 0 ? "+" : ""}${endOffset}d)` : ""}`;
  };

  const getLinkDisplay = () => {
    if (request.order_id) return `Order ${request.order_id}`;
    if (request.ticket_id) return `Ticket ${request.ticket_id}`;
    return "—";
  };

  const canAddPricedContract = request.status === "Approved";
  const requestType = request.request_type || "open";
  const isPriceFix = request.source === "Price_Fix";

  const handleExecutionSuccess = () => {
    setExecutionDialogOpen(false);
    setRollExecutionDialogOpen(false);
    setFixingCloseDialogOpen(false);
    setPriceFixExecuteDialogOpen(false);
    onOpenChange(false);
    onExecutionCreated?.();
  };

  const handleAddPricedContract = () => {
    if (isPriceFix) {
      setPriceFixExecuteDialogOpen(true);
    } else if (requestType === "roll") {
      setRollExecutionDialogOpen(true);
    } else if (requestType === "fixing_close") {
      setFixingCloseDialogOpen(true);
    } else {
      setExecutionDialogOpen(true);
    }
  };

  const getExecuteButtonLabel = () => {
    if (isPriceFix) return "Execute Price Fix";
    if (requestType === "roll") return "Execute Roll";
    if (requestType === "fixing_close") return "Execute Fixing Close";
    return "Add Priced Contract";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>Hedge Request</span>
              <Badge className={statusColors[request.status]}>
                {request.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Request ID: {request.id.slice(0, 8)}...
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Request Type & Source Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {requestTypeLabels[requestType] || "Open Hedge"}
              </Badge>
              {isPriceFix && (
                <Badge variant="default" className="text-xs bg-purple-100 text-purple-800">
                  Price Fix
                </Badge>
              )}
              {request.linked_execution_id && (
                <span className="text-xs text-muted-foreground">
                  Fixing hedge {request.linked_execution_id.slice(0, 8)}
                </span>
              )}
              {request.related_execution_id && !request.linked_execution_id && (
                <span className="text-xs text-muted-foreground">
                  Linked to execution {request.related_execution_id.slice(0, 8)}
                </span>
              )}
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Link</p>
                <p className="font-medium">{getLinkDisplay()}</p>
              </div>
              {request.ticket_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Ticket ID</p>
                  <p className="font-medium">{request.ticket_id}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Core Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Metal</p>
                <p className="font-medium">{request.metal}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quantity (MT)</p>
                <p className="font-medium">{request.quantity_mt.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Direction</p>
                <Badge variant={request.direction === "Buy" ? "default" : "secondary"}>
                  {request.direction}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reference</p>
                <p className="font-medium">{request.reference?.replace("_", " ") || "—"}</p>
              </div>
            </div>

            {/* QP Period from ticket */}
            {formatQpPeriod() && (
              <div>
                <p className="text-sm text-muted-foreground">QP Period</p>
                <p className="font-medium text-sm">{formatQpPeriod()}</p>
              </div>
            )}

            {request.target_price && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Target Price</p>
                  <p className="font-medium">
                    {request.target_price.toFixed(2)} {request.target_price_currency || "USD"}
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Requested By</p>
                <p className="font-medium">{request.requested_by || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="font-medium">
                  {format(new Date(request.created_at), "MMM d, yyyy HH:mm")}
                </p>
              </div>
            </div>

            {/* Notes */}
            {request.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap bg-muted p-2 rounded">
                    {request.notes}
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {canAddPricedContract && (
              <Button onClick={handleAddPricedContract}>
                {getExecuteButtonLabel()}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Standard execution dialog for 'open' type */}
      <HedgeExecutionDialog
        open={executionDialogOpen}
        onOpenChange={setExecutionDialogOpen}
        hedgeRequest={request}
        onSuccess={handleExecutionSuccess}
      />

      {/* Roll execution dialog */}
      <RollExecutionDialog
        open={rollExecutionDialogOpen}
        onOpenChange={setRollExecutionDialogOpen}
        request={request}
        onSuccess={handleExecutionSuccess}
      />

      {/* Fixing close dialog */}
      <FixingCloseExecutionDialog
        open={fixingCloseDialogOpen}
        onOpenChange={setFixingCloseDialogOpen}
        request={request}
        onSuccess={handleExecutionSuccess}
      />

      {/* Price fix execution dialog */}
      <PriceFixExecuteDialog
        open={priceFixExecuteDialogOpen}
        onOpenChange={setPriceFixExecuteDialogOpen}
        request={request}
        onSuccess={handleExecutionSuccess}
      />
    </>
  );
}
