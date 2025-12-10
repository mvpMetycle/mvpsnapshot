import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type CreateClaimDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blOrderId: number;
  blOrderName: string;
  orderId?: string | null;
  ata?: string | null;
  defaultBuyerId?: number;
  defaultSupplierId?: number;
  defaultBuyerName?: string;
  defaultSupplierName?: string;
  defaultCommodity?: string;
  onSuccess: () => void;
};

export function CreateClaimDialog({
  open,
  onOpenChange,
  blOrderId,
  blOrderName,
  orderId,
  ata,
  defaultBuyerId,
  defaultSupplierId,
  defaultBuyerName,
  defaultSupplierName,
  defaultCommodity,
  onSuccess,
}: CreateClaimDialogProps) {
  const [formData, setFormData] = useState({
    claim_type: "loss_of_metal",
    claim_description: "",
    claimed_value_amount: "",
    claimed_value_currency: "USD",
    claimed_file_date: new Date().toISOString().split("T")[0],
    commodity_type: "",
  });

  // Auto-populate commodity when dialog opens
  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        commodity_type: defaultCommodity || prev.commodity_type,
        claimed_file_date: new Date().toISOString().split("T")[0],
      }));
    }
  }, [open, defaultCommodity]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("claims").insert([{
        bl_order_id: blOrderId,
        bl_order_name: blOrderName,
        order_id: orderId,
        ata: ata,
        claim_type: formData.claim_type as any,
        claim_description: formData.claim_description,
        claimed_value_amount: formData.claimed_value_amount ? parseFloat(formData.claimed_value_amount) : null,
        claimed_value_currency: formData.claimed_value_currency,
        claimed_file_date: formData.claimed_file_date,
        buyer_id: defaultBuyerId || null,
        supplier_id: defaultSupplierId || null,
        commodity_type: formData.commodity_type as any || null,
        status: "draft" as any, // New claims default to "Open" (stored as "draft")
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      onSuccess();
      setFormData({
        claim_type: "loss_of_metal",
        claim_description: "",
        claimed_value_amount: "",
        claimed_value_currency: "USD",
        claimed_file_date: new Date().toISOString().split("T")[0],
        commodity_type: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create claim");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Raise New Claim
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Commodity (auto-populated, read-only display) */}
          {formData.commodity_type && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <Label className="text-xs text-muted-foreground">Commodity</Label>
              <p className="font-medium">{formData.commodity_type}</p>
            </div>
          )}

          {/* Claim Type - New simplified options */}
          <div className="space-y-2">
            <Label>Claim Type *</Label>
            <Select
              value={formData.claim_type}
              onValueChange={(value) => setFormData({ ...formData, claim_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="loss_of_metal">Loss of Metal</SelectItem>
                <SelectItem value="contamination">Contamination</SelectItem>
                <SelectItem value="weight_loss">Weight Loss</SelectItem>
                <SelectItem value="dust">Dust</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Claimed Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Claimed Amount</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.claimed_value_amount}
                onChange={(e) => setFormData({ ...formData, claimed_value_amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={formData.claimed_value_currency}
                onValueChange={(value) => setFormData({ ...formData, claimed_value_currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Claim Filed Date */}
          <div className="space-y-2">
            <Label>Claim Filed Date *</Label>
            <Input
              type="date"
              value={formData.claimed_file_date}
              onChange={(e) => setFormData({ ...formData, claimed_file_date: e.target.value })}
            />
          </div>

          {/* Buyer (read-only, auto-populated from ticket.client_name) */}
          <div className="space-y-2">
            <Label>Buyer <span className="text-xs text-muted-foreground">(from ticket)</span></Label>
            <div className="p-2 bg-muted/50 rounded-md border">
              <p className="text-sm">{defaultBuyerName || "Not available"}</p>
            </div>
          </div>

          {/* Supplier (read-only, auto-populated from ticket.client_name) */}
          <div className="space-y-2">
            <Label>Supplier <span className="text-xs text-muted-foreground">(from ticket)</span></Label>
            <div className="p-2 bg-muted/50 rounded-md border">
              <p className="text-sm">{defaultSupplierName || "Not available"}</p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Describe the claim..."
              value={formData.claim_description}
              onChange={(e) => setFormData({ ...formData, claim_description: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}