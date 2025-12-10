import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Plus, 
  Pencil, 
  Trash2, 
  DollarSign,
  FileText,
  Save,
  X
} from "lucide-react";
import { toast } from "sonner";
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

type ClaimsSectionProps = {
  blOrderName: string;
};

type Claim = {
  id: string;
  bl_order_name: string | null;
  claimed_value_amount: number | null;
  claim_description: string | null;
  status: string | null;
  created_at: string;
};

export function ClaimsSection({ blOrderName }: ClaimsSectionProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newClaim, setNewClaim] = useState({ claimed_value_amount: "", claim_description: "", status: "draft" });
  const [editClaim, setEditClaim] = useState({ claimed_value_amount: "", claim_description: "", status: "" });

  const { data: claims, isLoading } = useQuery({
    queryKey: ["claims", blOrderName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("*")
        .eq("bl_order_name", blOrderName)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Claim[];
    },
    enabled: !!blOrderName,
  });

  const createMutation = useMutation({
    mutationFn: async (claim: { claimed_value_amount: number; claim_description: string; status: string }) => {
      const { error } = await supabase
        .from("claims")
        .insert({
          bl_order_name: blOrderName,
          claimed_value_amount: claim.claimed_value_amount,
          claim_description: claim.claim_description,
          status: claim.status as any,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims", blOrderName] });
      setIsAdding(false);
      setNewClaim({ claimed_value_amount: "", claim_description: "", status: "draft" });
      toast.success("Claim added successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add claim");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, claim }: { id: string; claim: { claimed_value_amount: number; claim_description: string; status: string } }) => {
      const { error } = await supabase
        .from("claims")
        .update({
          claimed_value_amount: claim.claimed_value_amount,
          claim_description: claim.claim_description,
          status: claim.status as any,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims", blOrderName] });
      setEditingId(null);
      toast.success("Claim updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update claim");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("claims")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims", blOrderName] });
      setDeleteId(null);
      toast.success("Claim deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete claim");
    },
  });

  const handleAdd = () => {
    const amount = parseFloat(newClaim.claimed_value_amount);
    if (isNaN(amount)) {
      toast.error("Please enter a valid amount");
      return;
    }
    createMutation.mutate({ claimed_value_amount: amount, claim_description: newClaim.claim_description, status: newClaim.status });
  };

  const handleUpdate = (id: string) => {
    const amount = parseFloat(editClaim.claimed_value_amount);
    if (isNaN(amount)) {
      toast.error("Please enter a valid amount");
      return;
    }
    updateMutation.mutate({ id, claim: { claimed_value_amount: amount, claim_description: editClaim.claim_description, status: editClaim.status } });
  };

  const startEdit = (claim: Claim) => {
    setEditingId(claim.id);
    setEditClaim({
      claimed_value_amount: claim.claimed_value_amount?.toString() || "",
      claim_description: claim.claim_description || "",
      status: claim.status || "draft",
    });
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "resolved": return "default";
      case "pending": return "secondary";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const totalClaims = claims?.reduce((sum, c) => sum + (c.claimed_value_amount || 0), 0) || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">Claims</CardTitle>
            {claims && claims.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {claims.length} claim{claims.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {!isAdding && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Claim
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {claims && claims.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <span className="text-sm font-medium text-orange-700">Total Claims</span>
            <span className="text-lg font-bold text-orange-700">{formatCurrency(totalClaims)}</span>
          </div>
        )}

        {/* Add New Claim Form */}
        {isAdding && (
          <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Claim Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newClaim.claimed_value_amount}
                    onChange={(e) => setNewClaim({ ...newClaim, claimed_value_amount: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Status
                </label>
                <select
                  value={newClaim.status}
                  onChange={(e) => setNewClaim({ ...newClaim, status: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="draft">Draft</option>
                  <option value="preliminary_submitted">Preliminary Submitted</option>
                  <option value="formal_submitted">Formal Submitted</option>
                  <option value="settled">Settled</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Description
                </label>
                <Textarea
                  placeholder="Claim description..."
                  value={newClaim.claim_description}
                  onChange={(e) => setNewClaim({ ...newClaim, claim_description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewClaim({ claimed_value_amount: "", claim_description: "", status: "draft" });
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={createMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {createMutation.isPending ? "Saving..." : "Save Claim"}
              </Button>
            </div>
          </div>
        )}

        {/* Claims List */}
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading claims...</div>
        ) : claims && claims.length > 0 ? (
          <div className="space-y-3">
            {claims.map((claim) => (
              <div key={claim.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                {editingId === claim.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">
                          Claim Amount
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            value={editClaim.claimed_value_amount}
                            onChange={(e) => setEditClaim({ ...editClaim, claimed_value_amount: e.target.value })}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">
                          Status
                        </label>
                        <select
                          value={editClaim.status}
                          onChange={(e) => setEditClaim({ ...editClaim, status: e.target.value })}
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                          <option value="draft">Draft</option>
                          <option value="preliminary_submitted">Preliminary Submitted</option>
                          <option value="formal_submitted">Formal Submitted</option>
                          <option value="settled">Settled</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">
                          Description
                        </label>
                        <Textarea
                          value={editClaim.claim_description}
                          onChange={(e) => setEditClaim({ ...editClaim, claim_description: e.target.value })}
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(claim.id)}
                        disabled={updateMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {updateMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-4 w-4 text-orange-500" />
                          <span className="text-lg font-bold">{formatCurrency(claim.claimed_value_amount)}</span>
                          <Badge variant={getStatusBadgeVariant(claim.status)}>
                            {claim.status || "—"}
                          </Badge>
                        </div>
                      {claim.claim_description && (
                        <div className="flex items-start gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <p className="text-sm text-muted-foreground">{claim.claim_description}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(claim.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEdit(claim)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(claim.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : !isAdding ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No claims for this BL Order</p>
            <p className="text-xs mt-1">Click "Add Claim" to create one</p>
          </div>
        ) : null}

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
      </CardContent>
    </Card>
  );
}
