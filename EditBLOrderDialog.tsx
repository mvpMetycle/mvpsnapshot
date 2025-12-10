import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface EditBLOrderDialogProps {
  blOrder: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedData?: any;
}

export function EditBLOrderDialog({
  blOrder,
  open,
  onOpenChange,
  extractedData,
}: EditBLOrderDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    status: "",
    bl_number: "",
    bl_issue_date: "",
    port_of_loading: "",
    port_of_discharge: "",
    final_destination: "",
    loading_date: "",
    etd: "",
    atd: "",
    eta: "",
    ata: "",
    total_quantity_mt: "",
    loaded_quantity_mt: "",
    buy_final_price: "",
    sell_final_price: "",
    revenue: "",
    cost: "",
    notes: "",
    bl_url: "",
  });

  // Fetch shipping locations for dropdowns
  const { data: shippingLocations = [] } = useQuery({
    queryKey: ["shipping-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_location")
        .select("name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch planned shipment quantity
  const { data: plannedQuantity } = useQuery({
    queryKey: ["planned-shipment-quantity", blOrder?.bl_order_name],
    queryFn: async () => {
      if (!blOrder?.bl_order_name) return null;
      
      // Extract shipment numbers from bl_order_name (e.g., "28878-1,2,3")
      const parts = blOrder.bl_order_name.split("-");
      if (parts.length < 2) return null;
      
      const shipmentNumbers = parts[1].split(",").map(n => parseInt(n.trim()));
      const orderId = parts[0];
      
      const { data, error } = await supabase
        .from("planned_shipment")
        .select("quantity_at_shipment_level")
        .eq("order_id", orderId)
        .in("shipment_number", shipmentNumbers);
      
      if (error) throw error;
      
      // Sum all quantities
      const total = data?.reduce((sum, item) => sum + (item.quantity_at_shipment_level || 0), 0) || 0;
      return total;
    },
    enabled: !!blOrder?.bl_order_name,
  });

  useEffect(() => {
    if (blOrder) {
      // If extractedData is provided, use it; otherwise use blOrder data
      const dataSource = extractedData || blOrder;
      
      setFormData({
        status: dataSource.status || "",
        bl_number: dataSource.bl_number || "",
        bl_issue_date: dataSource.bl_issue_date || "",
        port_of_loading: dataSource.port_of_loading || "",
        port_of_discharge: dataSource.port_of_discharge || "",
        final_destination: dataSource.final_destination || "",
        loading_date: dataSource.loading_date || "",
        etd: dataSource.etd || "",
        atd: dataSource.atd || "",
        eta: dataSource.eta || "",
        ata: dataSource.ata || "",
        total_quantity_mt: plannedQuantity?.toString() || dataSource.total_quantity_mt?.toString() || "",
        loaded_quantity_mt: dataSource.loaded_quantity_mt?.toString() || "",
        buy_final_price: dataSource.buy_final_price?.toString() || "",
        sell_final_price: dataSource.sell_final_price?.toString() || "",
        revenue: dataSource.revenue?.toString() || "",
        cost: dataSource.cost?.toString() || "",
        notes: dataSource.notes || "",
        bl_url: dataSource.bl_url || "",
      });
    }
  }, [blOrder, plannedQuantity, extractedData]);

  // Calculate revenue when prices or loaded quantity change
  useEffect(() => {
    const sellPrice = parseFloat(formData.sell_final_price) || 0;
    const buyPrice = parseFloat(formData.buy_final_price) || 0;
    const loadedQty = parseFloat(formData.loaded_quantity_mt) || 0;
    
    if (sellPrice && buyPrice && loadedQty) {
      const calculatedRevenue = (sellPrice - buyPrice) * loadedQty;
      setFormData(prev => ({
        ...prev,
        revenue: calculatedRevenue.toFixed(2)
      }));
    }
  }, [formData.sell_final_price, formData.buy_final_price, formData.loaded_quantity_mt]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      // If this is a new BL order (from extraction), insert instead of update
      if (!blOrder.id) {
        const { error } = await supabase
          .from("bl_order")
          .insert({
            status: data.status || null,
            bl_number: data.bl_number || null,
            bl_issue_date: data.bl_issue_date || null,
            port_of_loading: data.port_of_loading || null,
            port_of_discharge: data.port_of_discharge || null,
            final_destination: data.final_destination || null,
            loading_date: data.loading_date || null,
            etd: data.etd || null,
            atd: data.atd || null,
            eta: data.eta || null,
            ata: data.ata || null,
            total_quantity_mt: data.total_quantity_mt ? parseFloat(data.total_quantity_mt) : null,
            loaded_quantity_mt: data.loaded_quantity_mt ? parseFloat(data.loaded_quantity_mt) : null,
            buy_final_price: data.buy_final_price ? parseFloat(data.buy_final_price) : null,
            sell_final_price: data.sell_final_price ? parseFloat(data.sell_final_price) : null,
            revenue: data.revenue ? parseFloat(data.revenue) : null,
            cost: data.cost ? parseFloat(data.cost) : null,
            notes: data.notes || null,
            bl_url: data.bl_url || null,
          });
        if (error) throw error;
        return;
      }
      
      const { error } = await supabase
        .from("bl_order")
        .update({
          status: data.status || null,
          bl_number: data.bl_number || null,
          bl_issue_date: data.bl_issue_date || null,
          port_of_loading: data.port_of_loading || null,
          port_of_discharge: data.port_of_discharge || null,
          final_destination: data.final_destination || null,
          loading_date: data.loading_date || null,
          etd: data.etd || null,
          atd: data.atd || null,
          eta: data.eta || null,
          ata: data.ata || null,
          total_quantity_mt: data.total_quantity_mt ? parseFloat(data.total_quantity_mt) : null,
          loaded_quantity_mt: data.loaded_quantity_mt ? parseFloat(data.loaded_quantity_mt) : null,
          buy_final_price: data.buy_final_price ? parseFloat(data.buy_final_price) : null,
          sell_final_price: data.sell_final_price ? parseFloat(data.sell_final_price) : null,
          revenue: data.revenue ? parseFloat(data.revenue) : null,
          cost: data.cost ? parseFloat(data.cost) : null,
          notes: data.notes || null,
          bl_url: data.bl_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", blOrder.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bl-orders"] });
      toast({
        title: blOrder.id ? "BL Order Updated" : "BL Order Created",
        description: blOrder.id ? "The BL order has been updated successfully." : "The BL order has been created successfully.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update BL order. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating BL order:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {blOrder?.id ? `Edit BL Order - ${blOrder.bl_order_name}` : 'Create New BL Order (Extracted from PDF)'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-semibold">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
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
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Transit">In Transit</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bl_number">BL Number</Label>
                <Input
                  id="bl_number"
                  value={formData.bl_number}
                  onChange={(e) =>
                    setFormData({ ...formData, bl_number: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="bl_issue_date">BL Issue Date</Label>
                <Input
                  id="bl_issue_date"
                  type="date"
                  value={formData.bl_issue_date}
                  onChange={(e) =>
                    setFormData({ ...formData, bl_issue_date: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="bl_url">BL URL</Label>
                <Input
                  id="bl_url"
                  value={formData.bl_url}
                  onChange={(e) =>
                    setFormData({ ...formData, bl_url: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Shipping Information */}
          <div className="space-y-4">
            <h4 className="font-semibold">Shipping Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="port_of_loading">Port of Loading</Label>
                <SearchableSelect
                  value={formData.port_of_loading}
                  onValueChange={(value) =>
                    setFormData({ ...formData, port_of_loading: value })
                  }
                  placeholder="Select port of loading"
                  options={shippingLocations.map((loc) => ({
                    value: loc.name,
                    label: loc.name,
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="port_of_discharge">Port of Discharge</Label>
                <SearchableSelect
                  value={formData.port_of_discharge}
                  onValueChange={(value) =>
                    setFormData({ ...formData, port_of_discharge: value })
                  }
                  placeholder="Select port of discharge"
                  options={shippingLocations.map((loc) => ({
                    value: loc.name,
                    label: loc.name,
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="final_destination">Final Destination</Label>
                <Input
                  id="final_destination"
                  value={formData.final_destination}
                  onChange={(e) =>
                    setFormData({ ...formData, final_destination: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="loading_date">Loading Date</Label>
                <Input
                  id="loading_date"
                  type="date"
                  value={formData.loading_date}
                  onChange={(e) =>
                    setFormData({ ...formData, loading_date: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h4 className="font-semibold">Schedule</h4>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="etd">ETD</Label>
                <Input
                  id="etd"
                  type="date"
                  value={formData.etd}
                  onChange={(e) =>
                    setFormData({ ...formData, etd: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="atd">ATD</Label>
                <Input
                  id="atd"
                  type="date"
                  value={formData.atd}
                  onChange={(e) =>
                    setFormData({ ...formData, atd: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="eta">ETA</Label>
                <Input
                  id="eta"
                  type="date"
                  value={formData.eta}
                  onChange={(e) =>
                    setFormData({ ...formData, eta: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="ata">ATA</Label>
                <Input
                  id="ata"
                  type="date"
                  value={formData.ata}
                  onChange={(e) =>
                    setFormData({ ...formData, ata: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Quantities */}
          <div className="space-y-4">
            <h4 className="font-semibold">Quantities</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="total_quantity_mt">Total Quantity (MT)</Label>
                <Input
                  id="total_quantity_mt"
                  type="number"
                  step="0.01"
                  value={formData.total_quantity_mt}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div>
                <Label htmlFor="loaded_quantity_mt">Loaded Quantity (MT)</Label>
                <Input
                  id="loaded_quantity_mt"
                  type="number"
                  step="0.01"
                  value={formData.loaded_quantity_mt}
                  onChange={(e) =>
                    setFormData({ ...formData, loaded_quantity_mt: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Financial */}
          <div className="space-y-4">
            <h4 className="font-semibold">Financial</h4>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="buy_final_price">Buy Price</Label>
                <Input
                  id="buy_final_price"
                  type="number"
                  step="0.01"
                  value={formData.buy_final_price}
                  onChange={(e) =>
                    setFormData({ ...formData, buy_final_price: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="sell_final_price">Sell Price</Label>
                <Input
                  id="sell_final_price"
                  type="number"
                  step="0.01"
                  value={formData.sell_final_price}
                  onChange={(e) =>
                    setFormData({ ...formData, sell_final_price: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="revenue">Revenue</Label>
                <Input
                  id="revenue"
                  type="number"
                  step="0.01"
                  value={formData.revenue}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div>
                <Label htmlFor="cost">Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : (blOrder?.id ? "Save Changes" : "Create BL Order")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
