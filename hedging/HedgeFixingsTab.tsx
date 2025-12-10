import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import { HedgeFixingDrawer } from "./HedgeFixingDrawer";
import type { Database } from "@/integrations/supabase/types";

type PricingFixing = Database["public"]["Tables"]["pricing_fixing"]["Row"] & {
  level?: string | null;
  order_id?: string | null;
  bl_order_id?: number | null;
  quantity_mt?: number | null;
  client_name?: string | null;
};

export function HedgeFixingsTab() {
  const navigate = useNavigate();
  const [selectedFixing, setSelectedFixing] = useState<PricingFixing | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filters
  const [metalFilter, setMetalFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: fixings, isLoading } = useQuery({
    queryKey: ["pricing-fixings", metalFilter, levelFilter],
    queryFn: async () => {
      let query = supabase
        .from("pricing_fixing")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (metalFilter !== "all") {
        query = query.eq("metal", metalFilter as Database["public"]["Enums"]["commodity_type_enum"]);
      }
      if (levelFilter !== "all") {
        query = query.eq("level", levelFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with client info from ticket
      const enrichedData = await Promise.all(
        (data || []).map(async (fixing) => {
          let clientName: string | null = null;

          // Try to get client from ticket
          if (fixing.ticket_id) {
            const { data: ticket } = await supabase
              .from("ticket")
              .select("client_name, company_id")
              .eq("id", fixing.ticket_id)
              .maybeSingle();

            if (ticket?.client_name) {
              clientName = ticket.client_name;
            } else if (ticket?.company_id) {
              const { data: company } = await supabase
                .from("Company")
                .select("name")
                .eq("id", ticket.company_id)
                .maybeSingle();
              clientName = company?.name || null;
            }
          }

          // If no ticket, try order level
          if (!clientName && fixing.order_id) {
            const { data: order } = await supabase
              .from("order")
              .select("buyer, seller")
              .eq("id", fixing.order_id)
              .maybeSingle();

            // buyer/seller store ticket IDs, get client from there
            if (order?.buyer || order?.seller) {
              const ticketId = order.buyer || order.seller;
              const { data: ticket } = await supabase
                .from("ticket")
                .select("client_name, company_id")
                .eq("id", parseInt(ticketId))
                .maybeSingle();

              if (ticket?.client_name) {
                clientName = ticket.client_name;
              } else if (ticket?.company_id) {
                const { data: company } = await supabase
                  .from("Company")
                  .select("name")
                  .eq("id", ticket.company_id)
                  .maybeSingle();
                clientName = company?.name || null;
              }
            }
          }

          // If no order, try BL order level
          if (!clientName && fixing.bl_order_id) {
            const { data: blOrder } = await supabase
              .from("bl_order")
              .select("order_id")
              .eq("id", fixing.bl_order_id)
              .maybeSingle();

            if (blOrder?.order_id) {
              const { data: order } = await supabase
                .from("order")
                .select("buyer, seller")
                .eq("id", blOrder.order_id)
                .maybeSingle();

              if (order?.buyer || order?.seller) {
                const ticketId = order.buyer || order.seller;
                const { data: ticket } = await supabase
                  .from("ticket")
                  .select("client_name, company_id")
                  .eq("id", parseInt(ticketId))
                  .maybeSingle();

                if (ticket?.client_name) {
                  clientName = ticket.client_name;
                } else if (ticket?.company_id) {
                  const { data: company } = await supabase
                    .from("Company")
                    .select("name")
                    .eq("id", ticket.company_id)
                    .maybeSingle();
                  clientName = company?.name || null;
                }
              }
            }
          }

          return { ...fixing, client_name: clientName } as PricingFixing;
        })
      );

      return enrichedData;
    },
  });

  // Fuzzy search - include client_name
  const filteredFixings = useMemo(() => {
    if (!fixings) return [];
    if (!searchQuery.trim()) return fixings;

    const fuse = new Fuse(fixings, {
      keys: ["id", "metal", "order_id", "bl_order_id", "level", "notes", "client_name"],
      threshold: 0.3,
    });

    return fuse.search(searchQuery).map((result) => result.item);
  }, [fixings, searchQuery]);

  const handleRowClick = (fixing: PricingFixing) => {
    setSelectedFixing(fixing);
    setDrawerOpen(true);
  };

  const handleReferenceClick = (fixing: PricingFixing, e: React.MouseEvent) => {
    e.stopPropagation();
    if (fixing.level === "ORDER" && fixing.order_id) {
      navigate(`/inventory/${fixing.order_id}`);
    } else if (fixing.level === "BL_ORDER" && fixing.bl_order_id) {
      navigate(`/bl-orders/${fixing.bl_order_id}`);
    }
  };

  const getPhysicalRef = (fixing: PricingFixing) => {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Price Fixings</h3>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-sm space-y-2">
          <Label>Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search fixings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="w-48 space-y-2">
          <Label>Metal</Label>
          <Select value={metalFilter} onValueChange={setMetalFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by metal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Metals</SelectItem>
              <SelectItem value="Copper">Copper</SelectItem>
              <SelectItem value="Aluminium">Aluminium</SelectItem>
              <SelectItem value="Zinc">Zinc</SelectItem>
              <SelectItem value="Nickel">Nickel</SelectItem>
              <SelectItem value="Lead">Lead</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-48 space-y-2">
          <Label>Level</Label>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="ORDER">Order</SelectItem>
              <SelectItem value="BL_ORDER">BL Order</SelectItem>
              <SelectItem value="TICKET">Ticket</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredFixings.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          {searchQuery ? "No matching fixings found" : "No price fixings found"}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fixing ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Physical Reference</TableHead>
                <TableHead>Metal</TableHead>
                <TableHead>Fixing Qty (MT)</TableHead>
                <TableHead>Fixing Price</TableHead>
                <TableHead>Fixing Date</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFixings.map((fixing) => (
                <TableRow
                  key={fixing.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(fixing)}
                >
                  <TableCell className="font-medium">
                    {fixing.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fixing.client_name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {fixing.level === "BL_ORDER"
                        ? "BL Order"
                        : fixing.level === "ORDER"
                        ? "Order"
                        : fixing.level || "Ticket"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={(e) => handleReferenceClick(fixing, e)}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {getPhysicalRef(fixing)}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </TableCell>
                  <TableCell>{fixing.metal}</TableCell>
                  <TableCell>
                    {fixing.quantity_mt?.toFixed(2) || "—"}
                  </TableCell>
                  <TableCell>
                    {fixing.final_price?.toLocaleString() || "—"}{" "}
                    {fixing.final_price_currency || "USD"}
                  </TableCell>
                  <TableCell>
                    {fixing.fixed_at
                      ? format(new Date(fixing.fixed_at), "MMM d, yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {format(new Date(fixing.created_at), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <HedgeFixingDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        fixing={selectedFixing}
      />
    </div>
  );
}
