import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Search, 
  DollarSign,
  FileText,
  ExternalLink,
  Trash2,
  Pencil
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Claim = {
  id: string;
  bl_order_name: string | null;
  claimed_value_amount: number | null;
  claim_description: string | null;
  status: string | null;
  created_at: string;
};

type BLOrder = {
  id: number;
  bl_order_name: string | null;
  order_id: string | null;
  status: string | null;
};

export default function Claims() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch all claims
  const { data: claims, isLoading: claimsLoading } = useQuery({
    queryKey: ["all-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Claim[];
    },
  });

  // Fetch BL Orders to get linked info
  const blOrderNames = [...new Set(claims?.map(c => c.bl_order_name).filter(Boolean) || [])];
  const { data: blOrders } = useQuery({
    queryKey: ["bl-orders-for-claims", blOrderNames],
    queryFn: async () => {
      if (blOrderNames.length === 0) return [];
      const { data, error } = await supabase
        .from("bl_order")
        .select("id, bl_order_name, order_id, status")
        .in("bl_order_name", blOrderNames);

      if (error) throw error;
      return data as BLOrder[];
    },
    enabled: blOrderNames.length > 0,
  });

  const blOrderMap = (blOrders || []).reduce((acc, bl) => {
    if (bl.bl_order_name) acc[bl.bl_order_name] = bl;
    return acc;
  }, {} as Record<string, BLOrder>);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("claims")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-claims"] });
      setDeleteId(null);
      toast.success("Claim deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete claim");
    },
  });

  // Filter claims by search term
  const filteredClaims = claims?.filter((claim) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      claim.bl_order_name?.toLowerCase().includes(term) ||
      claim.claim_description?.toLowerCase().includes(term) ||
      claim.claimed_value_amount?.toString().includes(term) ||
      claim.status?.toLowerCase().includes(term)
    );
  });

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const totalClaimsAmount = claims?.reduce((sum, c) => sum + (c.claimed_value_amount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-orange-500" />
          <div>
            <h1 className="text-3xl font-bold">Claims</h1>
            <p className="text-muted-foreground">All claims across BL Orders</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{claims?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalClaimsAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">BL Orders with Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blOrderNames.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Claims List</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search claims..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {claimsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading claims...</div>
          ) : filteredClaims && filteredClaims.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>BL Order</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClaims.map((claim) => {
                    const blOrder = claim.bl_order_name ? blOrderMap[claim.bl_order_name] : null;
                    return (
                      <TableRow key={claim.id}>
                        <TableCell>
                          {blOrder ? (
                            <Link
                              to={`/bl-orders/${blOrder.id}`}
                              className="flex items-center gap-1 text-primary hover:underline font-medium"
                            >
                              {claim.bl_order_name}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">{claim.bl_order_name || "—"}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {blOrder?.order_id ? (
                            <Link
                              to={`/inventory/${blOrder.order_id}`}
                              className="text-primary hover:underline"
                            >
                              {blOrder.order_id}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-orange-600">
                            {formatCurrency(claim.claimed_value_amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {claim.status ? (
                            <Badge variant={
                              claim.status.toLowerCase() === 'settled' ? 'default' :
                              claim.status.toLowerCase() === 'draft' ? 'secondary' :
                              claim.status.toLowerCase() === 'closed' ? 'default' : 'outline'
                            }>
                              {claim.status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate text-sm text-muted-foreground">
                            {claim.claim_description || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(claim.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {blOrder && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                asChild
                              >
                                <Link to={`/bl-orders/${blOrder.id}`}>
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(claim.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No claims found</p>
              <p className="text-sm mt-1">Claims can be added from individual BL Order pages</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Claim?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The claim will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
