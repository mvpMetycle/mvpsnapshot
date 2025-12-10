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

type PricingFixing = Database["public"]["Tables"]["pricing_fixing"]["Row"] & {
  level?: string | null;
  order_id?: string | null;
  bl_order_id?: number | null;
  quantity_mt?: number | null;
};

type HedgeLink = Database["public"]["Tables"]["hedge_link"]["Row"];

interface HedgeFixingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixing: PricingFixing | null;
}

export function HedgeFixingDrawer({
  open,
  onOpenChange,
  fixing,
}: HedgeFixingDrawerProps) {
  const navigate = useNavigate();

  // Fetch hedge allocations for this fixing
  const { data: allocations, isLoading } = useQuery({
    queryKey: ["hedge-allocations-for-fixing", fixing?.id],
    queryFn: async () => {
      if (!fixing) return [];
      const { data, error } = await supabase
        .from("hedge_link")
        .select("*, hedge_execution(*)")
        .eq("fixing_id", fixing.id);
      if (error) throw error;
      return data as (HedgeLink & {
        hedge_execution: Database["public"]["Tables"]["hedge_execution"]["Row"];
      })[];
    },
    enabled: !!fixing,
  });

  if (!fixing) return null;

  const handleOrderClick = () => {
    onOpenChange(false);
    if (fixing.level === "ORDER" && fixing.order_id) {
      navigate(`/inventory/${fixing.order_id}`);
    } else if (fixing.level === "BL_ORDER" && fixing.bl_order_id) {
      navigate(`/bl-orders/${fixing.bl_order_id}`);
    }
  };

  const getPhysicalRef = () => {
    if (fixing.level === "ORDER" && fixing.order_id) {
      return `Order ${fixing.order_id}`;
    }
    if (fixing.level === "BL_ORDER" && fixing.bl_order_id) {
      return `BL ${fixing.bl_order_id}`;
    }
    if (fixing.ticket_id) {
      return `Ticket #${fixing.ticket_id}`;
    }
    return "—";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Fixing Details</SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold">Fixing Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Fixing ID</span>
                <p className="font-medium">{fixing.id.slice(0, 8)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Level</span>
                <p>
                  <Badge variant="outline">
                    {fixing.level === "BL_ORDER"
                      ? "BL Order"
                      : fixing.level === "ORDER"
                      ? "Order"
                      : "Ticket"}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Physical Reference</span>
                <button
                  onClick={handleOrderClick}
                  className="flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  {getPhysicalRef()}
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
              <div>
                <span className="text-muted-foreground">Metal</span>
                <p className="font-medium">{fixing.metal}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fixing Quantity</span>
                <p className="font-medium">
                  {fixing.quantity_mt?.toFixed(2) || "—"} MT
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Fixing Price</span>
                <p className="font-medium">
                  {fixing.final_price?.toLocaleString() || "—"}{" "}
                  {fixing.final_price_currency || "USD"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Fixing Date</span>
                <p className="font-medium">
                  {fixing.fixed_at
                    ? format(new Date(fixing.fixed_at), "MMM d, yyyy")
                    : "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">QP Period</span>
                <p className="font-medium">
                  {fixing.qp_start && fixing.qp_end
                    ? `${format(new Date(fixing.qp_start), "MMM d")} – ${format(
                        new Date(fixing.qp_end),
                        "MMM d, yyyy"
                      )}`
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Hedge Allocations */}
          <div className="space-y-4">
            <h3 className="font-semibold">Hedge Allocations</h3>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : allocations?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hedge allocations</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hedge ID</TableHead>
                      <TableHead>Broker</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Qty (MT)</TableHead>
                      <TableHead>Trade Price</TableHead>
                      <TableHead>Trade Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations?.map((alloc) => (
                      <TableRow key={alloc.id}>
                        <TableCell className="font-medium">
                          {alloc.hedge_execution_id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          {alloc.hedge_execution?.broker_name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              alloc.hedge_execution?.direction === "Buy"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {alloc.hedge_execution?.direction || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {alloc.allocated_quantity_mt.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {alloc.exec_price?.toLocaleString() ||
                            alloc.hedge_execution?.executed_price?.toLocaleString() ||
                            "—"}{" "}
                          {alloc.hedge_execution?.executed_price_currency || "USD"}
                        </TableCell>
                        <TableCell>
                          {alloc.hedge_execution?.execution_date
                            ? format(
                                new Date(alloc.hedge_execution.execution_date),
                                "MMM d, yyyy"
                              )
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {alloc.hedge_execution?.status || "—"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <Separator />

          {/* Notes */}
          {fixing.notes && (
            <div className="space-y-2">
              <h3 className="font-semibold">Notes</h3>
              <p className="text-sm text-muted-foreground">{fixing.notes}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground">
            Created: {format(new Date(fixing.created_at), "MMM d, yyyy HH:mm")}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
