import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface AllocateBLDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unknownBLOrders: any[];
}

export function AllocateBLDialog({
  open,
  onOpenChange,
  unknownBLOrders,
}: AllocateBLDialogProps) {
  const [selectedBLIds, setSelectedBLIds] = useState<number[]>([]);
  const [selectedBLOrderName, setSelectedBLOrderName] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existingBLOrders } = useQuery({
    queryKey: ["existing-bl-orders-for-allocation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bl_order")
        .select("id, bl_order_name, order_id")
        .not("order_id", "is", null)
        .order("bl_order_name");

      if (error) throw error;
      return data || [];
    },
  });

  const getNextBLOrderName = async (orderId: string, count: number) => {
    // Fetch existing bl_order_names for this order
    const { data } = await supabase
      .from("bl_order")
      .select("bl_order_name")
      .eq("order_id", orderId)
      .not("bl_order_name", "is", null);

    // Find the highest number used
    let maxNumber = 0;
    data?.forEach((bl) => {
      const match = bl.bl_order_name?.match(new RegExp(`^${orderId}-(\\d+)`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });

    // Generate names for the new BLs
    const names = [];
    for (let i = 0; i < count; i++) {
      names.push(`${orderId}-${maxNumber + i + 1}`);
    }
    return names;
  };

  const allocateMutation = useMutation({
    mutationFn: async ({
      blIds,
      targetOrderId,
    }: {
      blIds: number[];
      targetOrderId: string;
    }) => {
      // Get next available names for this order
      const newNames = await getNextBLOrderName(targetOrderId, blIds.length);

      // Update each BL with its new order_id AND bl_order_name
      for (let i = 0; i < blIds.length; i++) {
        const { error } = await supabase
          .from("bl_order")
          .update({
            order_id: targetOrderId,
            bl_order_name: newNames[i],
          })
          .eq("id", blIds[i]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bl-orders"] });
      toast({
        title: "BL Orders Allocated",
        description: `${selectedBLIds.length} BL order(s) have been allocated successfully.`,
      });
      setSelectedBLIds([]);
      setSelectedBLOrderName("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Allocation Failed",
        description: "Failed to allocate BL orders. Please try again.",
        variant: "destructive",
      });
      console.error("Allocation error:", error);
    },
  });

  const handleToggleBL = (blId: number) => {
    setSelectedBLIds((prev) =>
      prev.includes(blId) ? prev.filter((id) => id !== blId) : [...prev, blId]
    );
  };

  const handleAllocate = () => {
    if (selectedBLIds.length === 0) {
      toast({
        title: "No BLs Selected",
        description: "Please select at least one BL order to allocate.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedBLOrderName) {
      toast({
        title: "No BL Order Selected",
        description: "Please select a BL order to allocate to.",
        variant: "destructive",
      });
      return;
    }

    // Find the order_id from the selected BL order name
    const selectedBLOrder = existingBLOrders?.find(
      (bl) => bl.bl_order_name === selectedBLOrderName
    );

    if (!selectedBLOrder?.order_id) {
      toast({
        title: "Invalid Selection",
        description: "Selected BL order does not have a valid order ID.",
        variant: "destructive",
      });
      return;
    }

    allocateMutation.mutate({
      blIds: selectedBLIds,
      targetOrderId: selectedBLOrder.order_id,
    });
  };

  const blOrderOptions =
    existingBLOrders?.map((bl) => ({
      value: bl.bl_order_name,
      label: bl.bl_order_name,
    })) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Allocate BLs to Deal</DialogTitle>
          <DialogDescription>
            Select the BL orders you want to allocate and choose the order ID
            they should be linked to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* BL Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Select BL Orders to Allocate
            </Label>
            <div className="border rounded-lg p-4 space-y-3 max-h-60 overflow-y-auto">
              {unknownBLOrders.map((bl) => (
                <div key={bl.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={`bl-${bl.id}`}
                    checked={selectedBLIds.includes(bl.id)}
                    onCheckedChange={() => handleToggleBL(bl.id)}
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={`bl-${bl.id}`}
                      className="font-medium cursor-pointer"
                    >
                      {bl.bl_order_name}
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      BL#: {bl.bl_number || "—"} | Qty:{" "}
                      {bl.loaded_quantity_mt || "—"} MT
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedBLIds.length} BL order(s) selected
            </div>
          </div>

          {/* BL Order Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Select Target BL Order Name
            </Label>
            <SearchableSelect
              value={selectedBLOrderName}
              onValueChange={setSelectedBLOrderName}
              options={blOrderOptions}
              placeholder="Search and select BL order name..."
              emptyText="No BL orders found"
              searchPlaceholder="Search BL order names..."
            />
            {selectedBLOrderName && (
              <div className="text-xs text-muted-foreground">
                Selected BLs will be grouped under the same order as "{selectedBLOrderName}"
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAllocate}
            disabled={
              allocateMutation.isPending ||
              selectedBLIds.length === 0 ||
              !selectedBLOrderName
            }
          >
            {allocateMutation.isPending ? "Allocating..." : "Allocate BLs"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
