import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Link2, RefreshCw, ExternalLink, Search } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import Fuse from "fuse.js";

type HedgeLink = {
  id: string;
  hedge_execution_id: string;
  link_id: string;
  link_level: string;
  allocated_quantity_mt: number;
  side: string | null;
  metal: string | null;
  notes: string | null;
  created_at: string;
  execution?: any;
  request?: any;
};

export function HedgeMatchingTab() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch hedge_link records with related execution and request data
  const { data: hedgeLinks, isLoading, refetch } = useQuery({
    queryKey: ["hedge-links-matching"],
    queryFn: async () => {
      // First get all hedge_links
      const { data: links, error: linksError } = await supabase
        .from("hedge_link")
        .select("*")
        .order("created_at", { ascending: false });

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      // Get unique execution IDs
      const executionIds = [...new Set(links.map(l => l.hedge_execution_id))];
      
      // Fetch executions
      const { data: executions, error: execError } = await supabase
        .from("hedge_execution")
        .select("*")
        .in("id", executionIds);

      if (execError) throw execError;

      // Get request IDs from executions
      const requestIds = executions
        ?.filter(e => e.hedge_request_id)
        .map(e => e.hedge_request_id!) || [];

      // Fetch requests with ticket client_name if any
      let requests: any[] = [];
      if (requestIds.length > 0) {
        const { data: reqData, error: reqError } = await supabase
          .from("hedge_request")
          .select("*, ticket:ticket_id(client_name)")
          .in("id", requestIds);
        if (!reqError && reqData) requests = reqData;
      }

      // Build enriched data
      return links.map(link => {
        const execution = executions?.find(e => e.id === link.hedge_execution_id);
        const request = execution?.hedge_request_id 
          ? requests.find(r => r.id === execution.hedge_request_id)
          : null;

        return {
          ...link,
          execution,
          request,
        };
      }) as HedgeLink[];
    },
  });

  // Fuzzy search
  const filteredLinks = useMemo(() => {
    if (!hedgeLinks) return [];
    if (!searchQuery.trim()) return hedgeLinks;

    const fuse = new Fuse(hedgeLinks, {
      keys: [
        "id", 
        "link_level", 
        "execution.metal", 
        "execution.direction", 
        "execution.broker_name",
        "request.order_id",
        "request.status",
      ],
      threshold: 0.3,
    });

    return fuse.search(searchQuery).map((result) => result.item);
  }, [hedgeLinks, searchQuery]);

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return format(new Date(date), "dd MMM yyyy");
  };

  const getDirectionBadge = (direction: string | null) => {
    if (!direction) return null;
    return (
      <Badge variant={direction === "Buy" ? "default" : "secondary"}>
        {direction}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">QP Matching</h3>
          <p className="text-sm text-muted-foreground">View links between physical exposures and hedge executions</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-end gap-4">
        <div className="flex-1 min-w-[200px] max-w-sm space-y-2">
          <Label>Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search matches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {filteredLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
          <div className="rounded-full bg-muted p-6 mb-4">
            <Link2 className="h-12 w-12 text-muted-foreground" />
          </div>
          <h4 className="text-base font-semibold mb-2">
            {searchQuery ? "No Matching Results" : "No Matches Yet"}
          </h4>
          <p className="text-muted-foreground max-w-md text-sm">
            {searchQuery 
              ? "Try adjusting your search terms."
              : "Matches between hedge requests and priced contracts will appear here. Add a priced contract from the Requests tab to create a match."
            }
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match ID</TableHead>
                <TableHead>Physical Link</TableHead>
                <TableHead>Link Level</TableHead>
                <TableHead>Metal</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead className="text-right">Matched Qty (MT)</TableHead>
                <TableHead>Execution</TableHead>
                <TableHead>Exec Price</TableHead>
                <TableHead>Request Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredLinks.map((link) => {
              // Determine the physical link based on link_level and link_id
              const getPhysicalLink = () => {
                if (link.link_level === "Order") {
                  return (
                    <Link 
                      to={`/inventory/${link.link_id}`}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      Order {link.link_id}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  );
                } else if (link.link_level === "Bl_order") {
                  return (
                    <Link 
                      to={`/bl-orders/${link.link_id}`}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      BL Order {link.link_id}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  );
                }
                return <span className="text-muted-foreground">—</span>;
              };

              // Determine the request status - use execution status if no request
              const getStatus = () => {
                if (link.request?.status) {
                  return (
                    <Badge 
                      variant={link.request.status === "Executed" ? "default" : "secondary"}
                      className={link.request.status === "Executed" ? "bg-green-600" : ""}
                    >
                      {link.request.status}
                    </Badge>
                  );
                }
                if (link.execution?.status) {
                  return (
                    <Badge variant="outline">
                      {link.execution.status}
                    </Badge>
                  );
                }
                return <span className="text-muted-foreground">—</span>;
              };

              return (
                <TableRow key={link.id}>
                  <TableCell className="font-mono text-sm">
                    {link.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    {getPhysicalLink()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{link.link_level}</Badge>
                  </TableCell>
                  <TableCell>{link.execution?.metal || link.metal || "—"}</TableCell>
                  <TableCell>
                    {getDirectionBadge(link.side || link.execution?.direction || null)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {link.allocated_quantity_mt?.toFixed(2) || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {link.execution?.id?.slice(0, 8) || "—"}
                  </TableCell>
                  <TableCell>
                    {link.execution?.executed_price 
                      ? `${link.execution.executed_price.toLocaleString()} ${link.execution.executed_price_currency || "USD"}`
                      : "—"
                    }
                  </TableCell>
                  <TableCell>
                    {getStatus()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(link.created_at)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
}
