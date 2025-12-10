import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, Loader2, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ClaimCard } from "./ClaimCard";
import { CreateClaimDialog } from "./CreateClaimDialog";
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

type BLClaimsSectionProps = {
  blOrderId: number;
  blOrderName: string;
  orderId?: string | null;
  ata?: string | null;
};

export function BLClaimsSection({ blOrderId, blOrderName, orderId, ata }: BLClaimsSectionProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [claimToDelete, setClaimToDelete] = useState<string | null>(null);

  // Fetch claim for this BL order
  const { data: claim, isLoading } = useQuery({
    queryKey: ["bl-claim", blOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select(`
          *,
          buyer:Company!claims_buyer_id_fkey(name),
          supplier:Company!claims_supplier_id_fkey(name)
        `)
        .eq("bl_order_id", blOrderId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!blOrderId,
  });

  // Fetch order data for buyer/seller/commodity and total amount calculation
  const { data: orderData } = useQuery({
    queryKey: ["order-for-claim", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from("order")
        .select("id, buyer, seller, commodity_type, allocated_quantity_mt, buy_price, sell_price")
        .eq("id", orderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Fetch buyer company name from ticket using order.buyer (which is a ticket ID)
  const { data: buyerTicket } = useQuery({
    queryKey: ["ticket-for-buyer", orderData?.buyer],
    queryFn: async () => {
      if (!orderData?.buyer) return null;
      const ticketId = parseInt(orderData.buyer, 10);
      if (isNaN(ticketId)) return null;
      const { data, error } = await supabase
        .from("ticket")
        .select("id, company_id, client_name")
        .eq("id", ticketId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderData?.buyer,
  });

  // Fetch seller company name from ticket using order.seller (which is a ticket ID)
  const { data: sellerTicket } = useQuery({
    queryKey: ["ticket-for-seller", orderData?.seller],
    queryFn: async () => {
      if (!orderData?.seller) return null;
      const ticketId = parseInt(orderData.seller, 10);
      if (isNaN(ticketId)) return null;
      const { data, error } = await supabase
        .from("ticket")
        .select("id, company_id, client_name")
        .eq("id", ticketId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderData?.seller,
  });

  // Delete claim mutation
  const deleteMutation = useMutation({
    mutationFn: async (claimId: string) => {
      const { error } = await supabase
        .from("claims")
        .delete()
        .eq("id", claimId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bl-claim", blOrderId] });
      toast.success("Claim deleted successfully");
      setDeleteDialogOpen(false);
      setClaimToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete claim");
    },
  });

  const handleClaimClick = () => {
    if (claim) {
      navigate(`/claims/${claim.id}`);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (claim) {
      navigate(`/claims/${claim.id}`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (claim) {
      setClaimToDelete(claim.id);
      setDeleteDialogOpen(true);
    }
  };

  const handleClaimCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["bl-claim", blOrderId] });
    setCreateDialogOpen(false);
    toast.success("Claim created successfully");
  };

  // Calculate total order amount (using sell price * quantity as the reference)
  const orderTotalAmount = orderData?.allocated_quantity_mt && orderData?.sell_price
    ? orderData.allocated_quantity_mt * orderData.sell_price
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">Claims</CardTitle>
            {claim && (
              <Badge variant="outline" className="ml-2">
                1 claim
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {claim && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEditClick}
                  className="h-8 w-8"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteClick}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            {!claim && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Raise Claim
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : claim ? (
          <ClaimCard
            claim={{
              ...claim,
              claim_type: claim.claim_type || "loss_of_metal",
              // Map all statuses to Open/Closed for display
              status: (claim.status === "closed" ? "closed" : "Open") as any,
            }}
            orderTotalAmount={orderTotalAmount}
            onDoubleClick={handleClaimClick}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No claims for this BL Order</p>
            <p className="text-xs mt-1">Click "Raise Claim" to create one</p>
          </div>
        )}
      </CardContent>

      <CreateClaimDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        blOrderId={blOrderId}
        blOrderName={blOrderName}
        orderId={orderId}
        ata={ata}
        defaultBuyerId={buyerTicket?.company_id || undefined}
        defaultSupplierId={sellerTicket?.company_id || undefined}
        defaultBuyerName={buyerTicket?.client_name || undefined}
        defaultSupplierName={sellerTicket?.client_name || undefined}
        defaultCommodity={orderData?.commodity_type || undefined}
        onSuccess={handleClaimCreated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Claim?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the claim
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => claimToDelete && deleteMutation.mutate(claimToDelete)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
