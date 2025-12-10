import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Order {
  id: string;
  transaction_type: string | null;
  commodity_type: string | null;
  allocated_quantity_mt: number | null;
  buy_price: number | null;
  sell_price: number | null;
  margin: number | null;
  ship_from: string | null;
  ship_to: string | null;
  buyTraders?: string;
  sellTraders?: string;
  buyCompany?: string;
  sellCompany?: string;
  hasCurrencyMismatch?: boolean;
}

interface OrdersKanbanBoardProps {
  orders: Order[];
  onOrderClick: (orderId: string) => void;
}

export const OrdersKanbanBoard = ({ orders, onOrderClick }: OrdersKanbanBoardProps) => {
  const commodities = [...new Set(orders.map(o => o.commodity_type).filter(Boolean))].sort();

  const getTypeStyle = (transactionType: string | null) => {
    const type = transactionType?.toLowerCase();
    if (type === "b2b") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (type === "inventory") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-muted text-muted-foreground";
  };

  const getTypeLabel = (transactionType: string | null) => {
    const type = transactionType?.toLowerCase();
    if (type === "b2b") return "B2B";
    if (type === "inventory") return "Inventory";
    return transactionType || "B2B";
  };

  return (
    <div className="grid gap-4 pb-4" style={{ gridTemplateColumns: `repeat(${commodities.length}, minmax(0, 1fr))` }}>
      {commodities.map((commodity) => {
        const commodityOrders = orders.filter(o => o.commodity_type === commodity);
        
        return (
          <div key={commodity} className="min-w-0">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{commodity}</span>
                  <Badge variant="outline">{commodityOrders.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-3 pr-4">
                    {commodityOrders.map((order) => (
                      <Card
                        key={order.id}
                        className="cursor-pointer hover:shadow-md transition-shadow border-border"
                        onClick={() => onOrderClick(order.id)}
                      >
                        <CardContent className="p-4 space-y-3">
                          {/* Top Section */}
                          <div className="space-y-2">
                            {/* Line 1: Commodity + Order Type pill */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{order.commodity_type}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getTypeStyle(order.transaction_type)}`}>
                                  {getTypeLabel(order.transaction_type)}
                                </span>
                              </div>
                              {order.hasCurrencyMismatch && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Different currencies</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>

                            {/* Line 2: Order ID */}
                            <div className="text-sm">
                              <span className="text-muted-foreground">Order: </span>
                              <span className="font-medium text-foreground">{order.id}</span>
                            </div>

                            {/* Line 3: Counterparties */}
                            <div className="text-sm">
                              <span className="text-muted-foreground">Counterparties: </span>
                              <span className="text-foreground">
                                {order.buyCompany || "—"} → {order.sellCompany || "—"}
                              </span>
                            </div>

                            {/* Line 4: Quantity */}
                            <div className="text-sm">
                              <span className="text-muted-foreground">Quantity: </span>
                              <span className="font-medium text-foreground">
                                {order.allocated_quantity_mt || "—"} MT
                              </span>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="border-t border-border" />

                          {/* Bottom Section */}
                          <div className="space-y-1.5 text-sm">
                            {/* Route */}
                            <div>
                              <span className="text-muted-foreground">Route: </span>
                              <span className="text-foreground">
                                {order.ship_from || "—"} → {order.ship_to || "—"}
                              </span>
                            </div>

                            {/* Traders */}
                            <div>
                              <span className="text-muted-foreground">Traders: </span>
                              <span className="text-foreground">
                                {order.buyTraders || "—"} / {order.sellTraders || "—"}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
};
