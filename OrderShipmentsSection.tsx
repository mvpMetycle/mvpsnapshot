import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Ship, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface PlannedShipment {
  id: number;
  order_id: number | null;
  shipment_number: number | null;
  quantity_at_shipment_level: number | null;
  created_at: string;
}

interface BLOrder {
  id: number;
  bl_order_name: string | null;
  bl_number: string | null;
  status: string | null;
  loaded_quantity_mt: number | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  etd: string | null;
  eta: string | null;
  ata: string | null;
  bl_url: string | null;
}

interface OrderShipmentsSectionProps {
  orderId: string;
  buyTicketIds: number[];
  allocatedQuantity: number | null;
  blOrders: BLOrder[];
  onRefresh: () => void;
}

export const OrderShipmentsSection = ({
  orderId,
  buyTicketIds,
  allocatedQuantity,
  blOrders,
  onRefresh,
}: OrderShipmentsSectionProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [selectedShipments, setSelectedShipments] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newShipmentNumber, setNewShipmentNumber] = useState("");
  const [newShipmentQuantity, setNewShipmentQuantity] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Fetch planned shipments for buy tickets
  const { data: plannedShipments = [], isLoading } = useQuery({
    queryKey: ["order-planned-shipments", orderId, buyTicketIds],
    queryFn: async () => {
      if (buyTicketIds.length === 0) return [];
      const { data, error } = await supabase
        .from("planned_shipment")
        .select("*")
        .in("order_id", buyTicketIds)
        .order("shipment_number", { ascending: true });
      if (error) throw error;
      return data as PlannedShipment[];
    },
    enabled: buyTicketIds.length > 0,
  });

  // Calculate which shipment numbers are used by BL orders
  const usedShipmentNumbers = useMemo(() => {
    const used = new Set<number>();
    blOrders.forEach((bl) => {
      if (bl.bl_order_name) {
        // Parse bl_order_name like "31983-1,2,3" to extract shipment numbers
        const parts = bl.bl_order_name.split("-");
        if (parts.length >= 2) {
          const shipmentPart = parts.slice(1).join("-"); // Handle order IDs with dashes
          const numbers = shipmentPart.split(",").map((n) => parseInt(n.trim()));
          numbers.forEach((n) => {
            if (!isNaN(n)) used.add(n);
          });
        }
      }
    });
    return used;
  }, [blOrders]);

  // Filter ungrouped shipments (not in any BL order)
  const ungroupedShipments = useMemo(() => {
    return plannedShipments.filter(
      (s) => s.shipment_number !== null && !usedShipmentNumbers.has(s.shipment_number)
    );
  }, [plannedShipments, usedShipmentNumbers]);

  // Mutations
  const createBlGroupMutation = useMutation({
    mutationFn: async (shipmentIds: number[]) => {
      const shipmentsToGroup = plannedShipments.filter((s) => shipmentIds.includes(s.id));
      const shipmentNumbers = shipmentsToGroup
        .map((s) => s.shipment_number)
        .filter((n) => n !== null)
        .sort((a, b) => (a || 0) - (b || 0));

      const blOrderName = `${orderId}-${shipmentNumbers.join(",")}`;
      const totalQuantity = shipmentsToGroup.reduce(
        (sum, s) => sum + (s.quantity_at_shipment_level || 0),
        0
      );

      const { data, error } = await supabase
        .from("bl_order")
        .insert({
          order_id: orderId,
          bl_order_name: blOrderName,
          total_quantity_mt: totalQuantity,
          status: "Draft",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("BL Group created successfully");
      setSelectedShipments(new Set());
      queryClient.invalidateQueries({ queryKey: ["order-planned-shipments", orderId] });
      onRefresh();
    },
    onError: (error) => {
      console.error("Error creating BL group:", error);
      toast.error("Failed to create BL group");
    },
  });

  const addShipmentMutation = useMutation({
    mutationFn: async () => {
      if (buyTicketIds.length === 0) throw new Error("No buy ticket found");
      const { error } = await supabase.from("planned_shipment").insert({
        order_id: buyTicketIds[0],
        shipment_number: newShipmentNumber ? parseFloat(newShipmentNumber) : null,
        quantity_at_shipment_level: newShipmentQuantity ? parseFloat(newShipmentQuantity) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shipment added");
      setAddDialogOpen(false);
      setNewShipmentNumber("");
      setNewShipmentQuantity("");
      queryClient.invalidateQueries({ queryKey: ["order-planned-shipments", orderId] });
    },
    onError: (error) => {
      console.error("Error adding shipment:", error);
      toast.error("Failed to add shipment");
    },
  });

  const updateShipmentMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity: number }) => {
      const { error } = await supabase
        .from("planned_shipment")
        .update({ quantity_at_shipment_level: quantity })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Quantity updated");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["order-planned-shipments", orderId] });
    },
    onError: (error) => {
      console.error("Error updating shipment:", error);
      toast.error("Failed to update quantity");
    },
  });

  const deleteShipmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("planned_shipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shipment deleted");
      setDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ["order-planned-shipments", orderId] });
    },
    onError: (error) => {
      console.error("Error deleting shipment:", error);
      toast.error("Failed to delete shipment");
    },
  });

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleToggleSelect = (id: number) => {
    const newSelected = new Set(selectedShipments);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedShipments(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedShipments.size === ungroupedShipments.length) {
      setSelectedShipments(new Set());
    } else {
      setSelectedShipments(new Set(ungroupedShipments.map((s) => s.id)));
    }
  };

  const handleStartEdit = (shipment: PlannedShipment) => {
    setEditingId(shipment.id);
    setEditQuantity(shipment.quantity_at_shipment_level?.toString() || "");
  };

  const handleSaveEdit = () => {
    if (editingId === null) return;
    const quantity = parseFloat(editQuantity);
    if (isNaN(quantity) || quantity < 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    updateShipmentMutation.mutate({ id: editingId, quantity });
  };

  const handleCreateBlGroup = () => {
    if (selectedShipments.size === 0) {
      toast.error("Please select at least one shipment");
      return;
    }
    createBlGroupMutation.mutate(Array.from(selectedShipments));
  };

  // Calculate summary stats
  const totalLoaded = blOrders.reduce((sum, bl) => sum + (bl.loaded_quantity_mt || 0), 0);
  const percentFilled = allocatedQuantity ? (totalLoaded / allocatedQuantity) * 100 : 0;
  const remaining = allocatedQuantity ? allocatedQuantity - totalLoaded : 0;
  const nextEta = blOrders
    .filter((bl) => bl.eta && !bl.ata)
    .sort((a, b) => new Date(a.eta!).getTime() - new Date(b.eta!).getTime())[0]?.eta;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Ship className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Shipments / BLs</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 bg-muted/30 rounded-lg">
          <div>
            <Label className="text-xs text-muted-foreground">Total Order Qty</Label>
            <p className="text-lg font-semibold">
              {allocatedQuantity ? `${allocatedQuantity} MT` : "—"}
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Total Loaded</Label>
            <p className="text-lg font-semibold">{totalLoaded.toFixed(2)} MT</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">% Filled</Label>
            <p className="text-lg font-semibold">{percentFilled.toFixed(1)}%</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Remaining</Label>
            <p className="text-lg font-semibold">{remaining.toFixed(2)} MT</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Number of BLs</Label>
            <p className="text-lg font-semibold">{blOrders.length}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Next ETA</Label>
            <p className="text-lg font-semibold">{nextEta ? formatDate(nextEta) : "—"}</p>
          </div>
        </div>

        {/* BL Groups Table */}
        <div>
          <h4 className="font-semibold text-sm mb-3">BL Groups</h4>
          {blOrders.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                      BL Order Name
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                      BL Number
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">
                      Loaded MT
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">
                      % of Order
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                      Route
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                      ETD
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                      ETA
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                      Docs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {blOrders.map((bl) => (
                    <tr key={bl.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <Button
                          variant="link"
                          className="p-0 h-auto font-semibold text-primary"
                          onClick={() => navigate(`/bl-orders/${bl.id}`)}
                        >
                          {bl.bl_order_name || "—"}
                        </Button>
                      </td>
                      <td className="py-3 px-4 text-sm">{bl.bl_number || "—"}</td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="text-xs">
                          {bl.status || "Draft"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        {bl.loaded_quantity_mt ? `${bl.loaded_quantity_mt.toFixed(2)} MT` : "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        {allocatedQuantity && bl.loaded_quantity_mt
                          ? `${((bl.loaded_quantity_mt / allocatedQuantity) * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {bl.port_of_loading && bl.port_of_discharge
                          ? `${bl.port_of_loading} → ${bl.port_of_discharge}`
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-sm">{formatDate(bl.etd)}</td>
                      <td className="py-3 px-4 text-sm">
                        {bl.ata ? (
                          <Badge variant="success" className="text-xs">
                            {formatDate(bl.ata)}
                          </Badge>
                        ) : bl.eta ? (
                          formatDate(bl.eta)
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={bl.bl_url ? "success" : "outline"} className="text-xs">
                          {bl.bl_url ? "BL uploaded" : "Missing BL"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-6 text-center text-muted-foreground text-sm">
              No BL groups created yet
            </div>
          )}
        </div>

        {/* Ungrouped Shipments Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">Ungrouped Shipments</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Shipment
              </Button>
              <Button
                size="sm"
                onClick={handleCreateBlGroup}
                disabled={selectedShipments.size === 0 || createBlGroupMutation.isPending}
              >
                Create BL Group ({selectedShipments.size})
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-muted/50 rounded-lg p-6 text-center text-muted-foreground text-sm">
              Loading shipments...
            </div>
          ) : ungroupedShipments.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="py-3 px-4 w-12">
                      <Checkbox
                        checked={
                          ungroupedShipments.length > 0 &&
                          selectedShipments.size === ungroupedShipments.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                      Shipment #
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">
                      Quantity (MT)
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground w-32">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ungroupedShipments.map((shipment) => (
                    <tr
                      key={shipment.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <Checkbox
                          checked={selectedShipments.has(shipment.id)}
                          onCheckedChange={() => handleToggleSelect(shipment.id)}
                        />
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">
                        #{shipment.shipment_number || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        {editingId === shipment.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                              className="w-24 h-8 text-right"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={handleSaveEdit}
                              disabled={updateShipmentMutation.isPending}
                            >
                              <Check className="h-4 w-4 text-success" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <span>
                            {shipment.quantity_at_shipment_level
                              ? `${shipment.quantity_at_shipment_level.toFixed(2)} MT`
                              : "—"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {editingId !== shipment.id && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleStartEdit(shipment)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(shipment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-6 text-center text-muted-foreground text-sm">
              No ungrouped shipments. Add shipments or all shipments are already in BL groups.
            </div>
          )}
        </div>

        {/* Add Shipment Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Planned Shipment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shipmentNumber">Shipment Number</Label>
                <Input
                  id="shipmentNumber"
                  type="number"
                  value={newShipmentNumber}
                  onChange={(e) => setNewShipmentNumber(e.target.value)}
                  placeholder="e.g., 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity (MT)</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={newShipmentQuantity}
                  onChange={(e) => setNewShipmentQuantity(e.target.value)}
                  placeholder="e.g., 500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => addShipmentMutation.mutate()}
                disabled={addShipmentMutation.isPending}
              >
                {addShipmentMutation.isPending ? "Adding..." : "Add Shipment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteConfirmId !== null}
          onOpenChange={() => setDeleteConfirmId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Shipment?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the planned shipment.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteConfirmId && deleteShipmentMutation.mutate(deleteConfirmId)}
              >
                {deleteShipmentMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
