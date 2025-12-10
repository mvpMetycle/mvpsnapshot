import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface EditOrderDialogProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditOrderDialog = ({ orderId, open, onOpenChange }: EditOrderDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    buy_price: "",
    sell_price: "",
    allocated_quantity_mt: "",
    status: "",
  });

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!orderId,
  });

  useEffect(() => {
    if (order) {
      setFormData({
        buy_price: order.buy_price?.toString() || "",
        sell_price: order.sell_price?.toString() || "",
        allocated_quantity_mt: order.allocated_quantity_mt?.toString() || "",
        status: order.status || "",
      });
    }
  }, [order]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const buyPrice = parseFloat(data.buy_price);
      const sellPrice = parseFloat(data.sell_price);
      const margin = buyPrice > 0 ? (sellPrice - buyPrice) / buyPrice : 0;

      const { error } = await supabase
        .from("order")
        .update({
          buy_price: buyPrice,
          sell_price: sellPrice,
          allocated_quantity_mt: parseFloat(data.allocated_quantity_mt),
          margin: margin,
          status: data.status,
        })
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Order updated",
        description: "The order has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update order. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating order:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Order - {orderId}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="buy_price">Buy Price</Label>
            <Input
              id="buy_price"
              type="number"
              step="0.01"
              value={formData.buy_price}
              onChange={(e) =>
                setFormData({ ...formData, buy_price: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sell_price">Sell Price</Label>
            <Input
              id="sell_price"
              type="number"
              step="0.01"
              value={formData.sell_price}
              onChange={(e) =>
                setFormData({ ...formData, sell_price: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allocated_quantity_mt">Allocated Quantity (MT)</Label>
            <Input
              id="allocated_quantity_mt"
              type="number"
              step="0.01"
              value={formData.allocated_quantity_mt}
              onChange={(e) =>
                setFormData({ ...formData, allocated_quantity_mt: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Allocated">Allocated</SelectItem>
                <SelectItem value="Unallocated">Unallocated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
