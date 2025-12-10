import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, Loader2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { PriceFixRequestDialog } from "./PriceFixRequestDialog";
import type { Database } from "@/integrations/supabase/types";

type HedgeExecution = Database["public"]["Tables"]["hedge_execution"]["Row"];

interface LinkedHedge extends HedgeExecution {
  allocatedQty?: number;
  side?: string;
  linkLevel?: string;
  linkId?: string;
}

interface HedgingSummarySectionProps {
  orderId?: string | null;
  onPriceFixClick?: () => void; // Legacy prop, no longer used
}

export function HedgingSummarySection({ 
  orderId,
}: HedgingSummarySectionProps) {
  const [priceFixDialogOpen, setPriceFixDialogOpen] = useState(false);
  const [selectedHedge, setSelectedHedge] = useState<HedgeExecution | null>(null);

  // Fetch BL orders for this order
  const { data: blOrders } = useQuery({
    queryKey: ["bl-orders-for-order", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from("bl_order")
        .select("id")
        .eq("order_id", orderId)
        .is("deleted_at", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orderId,
  });

  // Fetch all linked hedge executions for order + all its BLs
  const { data: linkedHedges, isLoading } = useQuery({
    queryKey: ["linked-hedges-aggregated", orderId, blOrders?.map(b => b.id)],
    queryFn: async () => {
      if (!orderId) return [];

      // Build link_id conditions: order_id OR any bl_order_id
      const linkIds = [orderId];
      const blIds = blOrders?.map(b => b.id.toString()) || [];
      linkIds.push(...blIds);

      // Get hedge_link entries
      const { data: links, error: linkError } = await supabase
        .from("hedge_link")
        .select("hedge_execution_id, allocated_quantity_mt, side, link_level, link_id")
        .in("link_id", linkIds);

      if (linkError) throw linkError;
      if (!links || links.length === 0) return [];

      // Fetch the actual executions
      const executionIds = [...new Set(links.map(l => l.hedge_execution_id))];
      const { data: executions, error: execError } = await supabase
        .from("hedge_execution")
        .select("*")
        .in("id", executionIds)
        .is("deleted_at", null);

      if (execError) throw execError;
      
      // Enrich with link data (and deduplicate by execution id)
      const executionMap = new Map<string, LinkedHedge>();
      for (const exec of executions || []) {
        const link = links.find(l => l.hedge_execution_id === exec.id);
        executionMap.set(exec.id, {
          ...exec,
          allocatedQty: link?.allocated_quantity_mt,
          side: link?.side,
          linkLevel: link?.link_level,
          linkId: link?.link_id,
        });
      }
      
      return Array.from(executionMap.values());
    },
    enabled: !!orderId,
  });

  // Calculate net exposure
  const netExposure = useMemo(() => {
    if (!linkedHedges || linkedHedges.length === 0) return { value: 0, label: "Flat" };
    
    const net = linkedHedges.reduce((sum, h) => {
      const qty = h.open_quantity_mt ?? h.quantity_mt;
      // Buy = positive, Sell = negative
      return sum + (h.direction === "Buy" ? qty : -qty);
    }, 0);

    if (Math.abs(net) < 0.01) return { value: 0, label: "Flat" };
    if (net > 0) return { value: net, label: `Long ${net.toFixed(2)} MT` };
    return { value: net, label: `Short ${Math.abs(net).toFixed(2)} MT` };
  }, [linkedHedges]);

  const hasLinkedHedges = linkedHedges && linkedHedges.length > 0;

  const handlePriceFixClick = (hedge: HedgeExecution) => {
    setSelectedHedge(hedge);
    setPriceFixDialogOpen(true);
  };

  const getLinkLabel = (hedge: LinkedHedge) => {
    if (hedge.linkLevel === "Order") return "Order";
    if (hedge.linkLevel === "Bl_order") return `BL #${hedge.linkId}`;
    return "—";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Hedging Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasLinkedHedges) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Hedging Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hedge executions linked to this order or its BLs. 
            Price fixing will be available once a hedge is executed and linked.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              Hedging Summary
            </CardTitle>
            {/* Net Position Badge */}
            <Badge 
              variant={netExposure.value === 0 ? "secondary" : netExposure.value > 0 ? "default" : "outline"}
              className="text-sm"
            >
              Net: {netExposure.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direction</TableHead>
                  <TableHead>Metal</TableHead>
                  <TableHead>Qty (MT)</TableHead>
                  <TableHead>Open Qty</TableHead>
                  <TableHead>Trade Price</TableHead>
                  <TableHead>Trade Date</TableHead>
                  <TableHead>Broker</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedHedges.map((hedge) => {
                  const openQty = hedge.open_quantity_mt ?? hedge.quantity_mt;
                  const canPriceFix = openQty > 0 && hedge.status !== "CLOSED";
                  
                  return (
                    <TableRow key={hedge.id}>
                      <TableCell>
                        <Badge variant={hedge.direction === "Buy" ? "default" : "secondary"}>
                          {hedge.direction}
                        </Badge>
                      </TableCell>
                      <TableCell>{hedge.metal}</TableCell>
                      <TableCell>{hedge.quantity_mt.toFixed(2)}</TableCell>
                      <TableCell className="font-medium text-primary">
                        {openQty.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {hedge.executed_price.toLocaleString()} {hedge.executed_price_currency || "USD"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(hedge.execution_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{hedge.broker_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getLinkLabel(hedge)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {hedge.status || "OPEN"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {canPriceFix && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handlePriceFixClick(hedge)}>
                                Price Fix
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PriceFixRequestDialog
        open={priceFixDialogOpen}
        onOpenChange={setPriceFixDialogOpen}
        hedgeExecution={selectedHedge}
        orderId={orderId || ""}
      />
    </>
  );
}
