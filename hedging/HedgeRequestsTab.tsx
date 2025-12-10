import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Eye, Check, X, Trash2, Loader2, Search, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { HedgeRequestDrawer } from "./HedgeRequestDrawer";
import { HedgeRequestDetailDialog } from "./HedgeRequestDetailDialog";
import { DeleteWithReasonDialog } from "@/components/DeleteWithReasonDialog";
import { HedgeRejectDialog } from "./HedgeRejectDialog";
import Fuse from "fuse.js";
import type { Database } from "@/integrations/supabase/types";

type HedgeRequestBase = Database["public"]["Tables"]["hedge_request"]["Row"];
type HedgeRequestStatus = Database["public"]["Enums"]["hedge_request_status"];

// Extended type for new fields
type HedgeRequest = HedgeRequestBase & {
  request_type?: "open" | "roll" | "fixing_close";
  related_execution_id?: string | null;
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
  open: "Open",
  roll: "Roll",
  fixing_close: "Fix Close",
};

const sourceLabels: Record<string, string> = {
  Manual: "Manual",
  Auto_QP: "Deal Matching",
  Price_Fix: "Price Fix",
  Roll: "Roll",
};

const reasonLabels: Record<string, string> = {
  PHYSICAL_SALE_PRICING: "Physical Sale Pricing",
  UNPRICING: "Unpricing",
  PRE_LENDING: "Pre-Lending",
  PRE_BORROWING: "Pre-Borrowing",
  ROLL: "Roll",
  PRICE_FIX: "Price Fix",
};

const instrumentLabels: Record<string, string> = {
  FUTURE: "Future",
  OPTION: "Option",
  FX: "FX",
};

const formatEstQpMonth = (date: string | null): string => {
  if (!date) return "—";
  try {
    return format(new Date(date), "MMM yyyy");
  } catch {
    return "—";
  }
};

export function HedgeRequestsTab() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<HedgeRequest | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<HedgeRequest | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState<HedgeRequest | null>(null);
  const [executedOpen, setExecutedOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [metalFilter, setMetalFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["hedge-requests", statusFilter, metalFilter],
    queryFn: async () => {
      let query = supabase
        .from("hedge_request")
        .select(
          "*, ticket:ticket_id(client_name, qp_start_anchor, qp_start_offset_days, qp_end_anchor, qp_end_offset_days)",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as HedgeRequestStatus);
      }
      if (metalFilter !== "all") {
        query = query.eq("metal", metalFilter as Database["public"]["Enums"]["commodity_type_enum"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (HedgeRequest & {
        ticket?: {
          client_name: string | null;
          qp_start_anchor: string | null;
          qp_start_offset_days: number | null;
          qp_end_anchor: string | null;
          qp_end_offset_days: number | null;
        } | null;
      })[];
    },
  });

  // Fuzzy search
  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    if (!searchQuery.trim()) return requests;

    const fuse = new Fuse(requests, {
      keys: ["id", "metal", "direction", "status", "order_id", "notes", "broker_preference"],
      threshold: 0.3,
    });

    return fuse.search(searchQuery).map((result) => result.item);
  }, [requests, searchQuery]);

  // Split into pending and executed
  const pendingRequests = useMemo(() => {
    return filteredRequests.filter((r) => r.status !== "Executed");
  }, [filteredRequests]);

  const executedRequests = useMemo(() => {
    return filteredRequests.filter((r) => r.status === "Executed");
  }, [filteredRequests]);

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hedge_request")
        .update({ status: "Approved", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hedge-requests"] });
      toast.success("Hedge request approved");
    },
    onError: () => {
      toast.error("Failed to approve hedge request");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: existing } = await supabase.from("hedge_request").select("notes").eq("id", id).single();

      const updatedNotes = existing?.notes
        ? `${existing.notes}\n\nRejection reason: ${reason}`
        : `Rejection reason: ${reason}`;

      const { error } = await supabase
        .from("hedge_request")
        .update({
          status: "Rejected",
          notes: updatedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hedge-requests"] });
      toast.success("Hedge request rejected");
      setRejectDialogOpen(false);
      setRequestToReject(null);
    },
    onError: () => {
      toast.error("Failed to reject hedge request");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("hedge_request")
        .update({
          deleted_at: new Date().toISOString(),
          delete_reason: reason,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hedge-requests"] });
      queryClient.invalidateQueries({ queryKey: ["hedge-requests-deleted"] });
      toast.success("Hedge request deleted");
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
    },
    onError: () => {
      toast.error("Failed to delete hedge request");
    },
  });

  const handleOpenDrawer = (request?: HedgeRequest) => {
    setSelectedRequest(request || null);
    setDrawerOpen(true);
  };

  const handleViewRequest = (request: HedgeRequest) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const handleDeleteClick = (request: HedgeRequest) => {
    setRequestToDelete(request);
    setDeleteDialogOpen(true);
  };

  const handleRejectClick = (request: HedgeRequest) => {
    setRequestToReject(request);
    setRejectDialogOpen(true);
  };

  const getLinkDisplay = (request: HedgeRequest) => {
    if (request.order_id) return `Order ${request.order_id}`;
    if (request.ticket_id) return `Ticket ${request.ticket_id}`;
    return "—";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Hedge Requests</h3>
        <Button onClick={() => handleOpenDrawer()}>
          <Plus className="h-4 w-4 mr-2" />
          New Hedge Request
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-sm space-y-2">
          <Label>Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="w-48 space-y-2">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Pending Approval">Pending Approval</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
              <SelectItem value="Executed">Executed</SelectItem>
            </SelectContent>
          </Select>
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
              <SelectItem value="Tin">Tin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pending Requests Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : pendingRequests.length === 0 && executedRequests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          {searchQuery ? "No matching requests found" : "No hedge requests yet"}
        </div>
      ) : (
        <>
          {pendingRequests.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Instrument</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Contract ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Metal</TableHead>
                    <TableHead>Qty (MT)</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Pricing Type</TableHead>
                    <TableHead>Formula %</TableHead>
                    <TableHead>Est. QP</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => {
                    const reqSource = request.source || "Manual";
                    const ticket = (request as any).ticket;
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${reqSource === "Price_Fix" ? "bg-purple-100 text-purple-800 border-purple-200" : ""}`}
                          >
                            {sourceLabels[reqSource] || reqSource}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {request.reason ? reasonLabels[request.reason] || request.reason : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {request.instrument_type
                            ? instrumentLabels[request.instrument_type] || request.instrument_type
                            : "—"}
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate" title={ticket?.client_name || "—"}>
                          {ticket?.client_name || "—"}
                        </TableCell>
                        <TableCell>
                          {request.order_id ? (
                            <span
                              className="text-primary hover:underline cursor-pointer text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/inventory/${request.order_id}`);
                              }}
                            >
                              {request.order_id}
                            </span>
                          ) : request.ticket_id ? (
                            <span className="text-xs">T-{request.ticket_id}</span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{request.metal}</TableCell>
                        <TableCell className="text-xs">{request.hedge_metal || "—"}</TableCell>
                        <TableCell className="text-right">{request.quantity_mt.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={request.direction === "Buy" ? "default" : "secondary"} className="text-xs">
                            {request.direction}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{request.pricing_type || "—"}</TableCell>
                        <TableCell className="text-xs text-right">
                          {request.formula_percent != null ? `${(request.formula_percent * 100).toFixed(0)}%` : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{formatEstQpMonth(request.estimated_qp_month)}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${statusColors[request.status]}`}>{request.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{format(new Date(request.created_at), "MMM d, yy")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleViewRequest(request)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {request.status === "Pending Approval" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => approveMutation.mutate(request.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleRejectClick(request)}>
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(request)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Executed HRs - Collapsible Section */}
          {executedRequests.length > 0 && (
            <Collapsible open={executedOpen} onOpenChange={setExecutedOpen} className="mt-6">
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {executedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Executed HRs ({executedRequests.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Instrument</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Contract ID</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Metal</TableHead>
                        <TableHead>Qty (MT)</TableHead>
                        <TableHead>Side</TableHead>
                        <TableHead>Pricing Type</TableHead>
                        <TableHead>Formula %</TableHead>
                        <TableHead>Est. QP</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {executedRequests.map((request) => {
                        const reqSource = request.source || "Manual";
                        const ticket = (request as any).ticket;
                        return (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">{request.id.slice(0, 8)}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${reqSource === "Price_Fix" ? "bg-purple-100 text-purple-800 border-purple-200" : ""}`}
                              >
                                {sourceLabels[reqSource] || reqSource}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {request.reason ? reasonLabels[request.reason] || request.reason : "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {request.instrument_type
                                ? instrumentLabels[request.instrument_type] || request.instrument_type
                                : "—"}
                            </TableCell>
                            <TableCell className="max-w-[120px] truncate" title={ticket?.client_name || "—"}>
                              {ticket?.client_name || "—"}
                            </TableCell>
                            <TableCell>
                              {request.order_id ? (
                                <span
                                  className="text-primary hover:underline cursor-pointer text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/inventory/${request.order_id}`);
                                  }}
                                >
                                  {request.order_id}
                                </span>
                              ) : request.ticket_id ? (
                                <span className="text-xs">T-{request.ticket_id}</span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-xs">{request.metal}</TableCell>
                            <TableCell className="text-xs">{request.hedge_metal || "—"}</TableCell>
                            <TableCell className="text-right">{request.quantity_mt.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={request.direction === "Buy" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {request.direction}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{request.pricing_type || "—"}</TableCell>
                            <TableCell className="text-xs text-right">
                              {request.formula_percent != null ? `${(request.formula_percent * 100).toFixed(0)}%` : "—"}
                            </TableCell>
                            <TableCell className="text-xs">{formatEstQpMonth(request.estimated_qp_month)}</TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${statusColors[request.status]}`}>{request.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(request.created_at), "MMM d, yy")}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleViewRequest(request)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(request)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}

      <HedgeRequestDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        request={selectedRequest}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["hedge-requests"] });
        }}
      />

      <HedgeRequestDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        request={selectedRequest}
        onExecutionCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["hedge-requests"] });
          queryClient.invalidateQueries({ queryKey: ["hedge-executions"] });
        }}
      />

      <DeleteWithReasonDialog
        entityLabel="Hedge Request"
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async (reason) => {
          if (requestToDelete) {
            await deleteMutation.mutateAsync({ id: requestToDelete.id, reason });
          }
        }}
        isDeleting={deleteMutation.isPending}
      />

      <HedgeRejectDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={(reason) => {
          if (requestToReject) {
            rejectMutation.mutate({ id: requestToReject.id, reason });
          }
        }}
        isRejecting={rejectMutation.isPending}
      />
    </div>
  );
}
