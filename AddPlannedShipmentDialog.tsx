import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";

interface AddPlannedShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  buyTicketId: number;
}

export const AddPlannedShipmentDialog = ({
  open,
  onOpenChange,
  orderId,
  buyTicketId,
}: AddPlannedShipmentDialogProps) => {
  const [shipmentNumber, setShipmentNumber] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("planned_shipment").insert({
        order_id: buyTicketId, // Use ticket ID as number
        shipment_number: shipmentNumber ? parseFloat(shipmentNumber) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planned-shipments", orderId] });
      toast({
        title: "Shipment added",
        description: "The planned shipment has been added successfully.",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add planned shipment. Please try again.",
        variant: "destructive",
      });
      console.error("Error adding planned shipment:", error);
    },
  });

  const resetForm = () => {
    setShipmentNumber("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Planned Shipment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shipmentNumber">Shipment Number</Label>
            <Input
              id="shipmentNumber"
              type="number"
              step="0.01"
              value={shipmentNumber}
              onChange={(e) => setShipmentNumber(e.target.value)}
              placeholder="e.g., 1"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add Shipment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
