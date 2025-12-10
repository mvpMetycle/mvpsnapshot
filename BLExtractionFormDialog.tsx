import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface Container {
  container_number: string;
  seal_number: string;
  net_weight: string;
  gross_weight: string;
}

interface BLExtractionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blOrderId?: number;
  blNumber?: string;
  existingData?: any;
  onSuccess: () => void;
}

export function BLExtractionFormDialog({
  open,
  onOpenChange,
  blOrderId,
  blNumber,
  existingData,
  onSuccess,
}: BLExtractionFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    bl_number: existingData?.bl_number || blNumber || "",
    bl_issue_date: existingData?.bl_issue_date || "",
    port_of_loading: existingData?.port_of_loading || "",
    port_of_discharge: existingData?.port_of_discharge || "",
    final_destination: existingData?.final_destination || "",
    product_description: existingData?.product_description || "",
    description_of_goods: existingData?.description_of_goods || "",
    country_of_origin: existingData?.country_of_origin || "",
    hs_code: existingData?.hs_code || "",
    number_of_packages: existingData?.number_of_packages || "",
    applicable_free_days: existingData?.applicable_free_days || "",
    shipping_line: existingData?.shipping_line || "",
    shipper: existingData?.shipper || "",
    consignee_name: existingData?.consignee_name || "",
    consignee_address: existingData?.consignee_address || "",
    consignee_contact_person_name: existingData?.consignee_contact_person_name || "",
    consignee_contact_person_email: existingData?.consignee_contact_person_email || "",
    notify_name: existingData?.notify_name || "",
    notify_address: existingData?.notify_address || "",
    notify_contact_person_name: existingData?.notify_contact_person_name || "",
    notify_contact_person_email: existingData?.notify_contact_person_email || "",
  });

  const [containers, setContainers] = useState<Container[]>(
    existingData?.containers || [{ container_number: "", seal_number: "", net_weight: "", gross_weight: "" }]
  );

  // Update form data when existingData changes
  useEffect(() => {
    if (existingData) {
      setFormData({
        bl_number: existingData.bl_number || blNumber || "",
        bl_issue_date: existingData.bl_issue_date || "",
        port_of_loading: existingData.port_of_loading || "",
        port_of_discharge: existingData.port_of_discharge || "",
        final_destination: existingData.final_destination || "",
        product_description: existingData.product_description || "",
        description_of_goods: existingData.description_of_goods || "",
        country_of_origin: existingData.country_of_origin || "",
        hs_code: existingData.hs_code?.toString() || "",
        number_of_packages: existingData.number_of_packages?.toString() || "",
        applicable_free_days: existingData.applicable_free_days?.toString() || "",
        shipping_line: existingData.shipping_line || "",
        shipper: existingData.shipper || "",
        consignee_name: existingData.consignee_name || "",
        consignee_address: existingData.consignee_address || "",
        consignee_contact_person_name: existingData.consignee_contact_person_name || "",
        consignee_contact_person_email: existingData.consignee_contact_person_email || "",
        notify_name: existingData.notify_name || "",
        notify_address: existingData.notify_address || "",
        notify_contact_person_name: existingData.notify_contact_person_name || "",
        notify_contact_person_email: existingData.notify_contact_person_email || "",
      });

      // Transform containers data - convert numbers to strings for form inputs
      if (existingData.containers && Array.isArray(existingData.containers)) {
        setContainers(
          existingData.containers.map((c: any) => ({
            container_number: c.container_number?.toString() || "",
            seal_number: c.seal_number?.toString() || "",
            net_weight: c.net_weight?.toString() || "",
            gross_weight: c.gross_weight?.toString() || "",
          }))
        );
      }
    }
  }, [existingData, blNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upsert BL extraction data
      const { data: blData, error: blError } = await supabase
        .from("bl_extraction")
        .upsert({
          bl_order_id: blOrderId || null,
          bl_number: formData.bl_number,
          bl_issue_date: formData.bl_issue_date || null,
          port_of_loading: formData.port_of_loading || null,
          port_of_discharge: formData.port_of_discharge || null,
          final_destination: formData.final_destination || null,
          product_description: formData.product_description || null,
          description_of_goods: formData.description_of_goods || null,
          country_of_origin: formData.country_of_origin || null,
          hs_code: formData.hs_code ? parseFloat(formData.hs_code) : null,
          number_of_packages: formData.number_of_packages ? parseFloat(formData.number_of_packages) : null,
          applicable_free_days: formData.applicable_free_days ? parseFloat(formData.applicable_free_days) : null,
          shipping_line: formData.shipping_line || null,
          shipper: formData.shipper || null,
          consignee_name: formData.consignee_name || null,
          consignee_address: formData.consignee_address || null,
          consignee_contact_person_name: formData.consignee_contact_person_name || null,
          consignee_contact_person_email: formData.consignee_contact_person_email || null,
          notify_name: formData.notify_name || null,
          notify_address: formData.notify_address || null,
          notify_contact_person_name: formData.notify_contact_person_name || null,
          notify_contact_person_email: formData.notify_contact_person_email || null,
        }, { onConflict: 'bl_order_id' })
        .select()
        .single();

      if (blError) throw blError;

      // Update bl_order with extracted data if blOrderId is provided
      if (blOrderId) {
        await supabase
          .from('bl_order')
          .update({
            bl_number: formData.bl_number,
            bl_issue_date: formData.bl_issue_date || null,
            port_of_loading: formData.port_of_loading || null,
            port_of_discharge: formData.port_of_discharge || null,
            final_destination: formData.final_destination || null,
          })
          .eq('id', blOrderId);
      }

      // Delete existing containers and insert new ones
      if (blOrderId) {
        await supabase
          .from("bl_extraction_container")
          .delete()
          .eq("bl_order_id", blOrderId);
      }

      // Insert container data
      const containerInserts = containers
        .filter(c => c.container_number) // Only insert containers with numbers
        .map(container => ({
          bl_order_id: blOrderId || null,
          bl_number: formData.bl_number,
          container_number: container.container_number || null,
          seal_number: container.seal_number || null,
          net_weight: container.net_weight ? parseFloat(container.net_weight) : null,
          gross_weight: container.gross_weight ? parseFloat(container.gross_weight) : null,
        }));

      if (containerInserts.length > 0) {
        const { error: containerError } = await supabase
          .from("bl_extraction_container")
          .insert(containerInserts);

        if (containerError) throw containerError;
      }

      toast({
        title: "Success",
        description: "BL extraction data saved successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving BL extraction:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save BL extraction data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addContainer = () => {
    setContainers([...containers, { container_number: "", seal_number: "", net_weight: "", gross_weight: "" }]);
  };

  const removeContainer = (index: number) => {
    setContainers(containers.filter((_, i) => i !== index));
  };

  const updateContainer = (index: number, field: keyof Container, value: string) => {
    const updated = [...containers];
    updated[index][field] = value;
    setContainers(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingData ? "Edit" : "Add"} BL Extraction Data</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bl_number">BL Number *</Label>
                <Input
                  id="bl_number"
                  value={formData.bl_number}
                  onChange={(e) => setFormData({ ...formData, bl_number: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="bl_issue_date">BL Issue Date</Label>
                <Input
                  id="bl_issue_date"
                  type="date"
                  value={formData.bl_issue_date}
                  onChange={(e) => setFormData({ ...formData, bl_issue_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Shipping Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Shipping Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="port_of_loading">Port of Loading</Label>
                <Input
                  id="port_of_loading"
                  value={formData.port_of_loading}
                  onChange={(e) => setFormData({ ...formData, port_of_loading: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="port_of_discharge">Port of Discharge</Label>
                <Input
                  id="port_of_discharge"
                  value={formData.port_of_discharge}
                  onChange={(e) => setFormData({ ...formData, port_of_discharge: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="final_destination">Final Destination</Label>
                <Input
                  id="final_destination"
                  value={formData.final_destination}
                  onChange={(e) => setFormData({ ...formData, final_destination: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="shipping_line">Shipping Line</Label>
                <Input
                  id="shipping_line"
                  value={formData.shipping_line}
                  onChange={(e) => setFormData({ ...formData, shipping_line: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="shipper">Shipper</Label>
                <Input
                  id="shipper"
                  value={formData.shipper}
                  onChange={(e) => setFormData({ ...formData, shipper: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Product Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product_description">Product Description</Label>
                <Textarea
                  id="product_description"
                  value={formData.product_description}
                  onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description_of_goods">Description of Goods</Label>
                <Textarea
                  id="description_of_goods"
                  value={formData.description_of_goods}
                  onChange={(e) => setFormData({ ...formData, description_of_goods: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="country_of_origin">Country of Origin</Label>
                <Input
                  id="country_of_origin"
                  value={formData.country_of_origin}
                  onChange={(e) => setFormData({ ...formData, country_of_origin: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="hs_code">HS Code</Label>
                <Input
                  id="hs_code"
                  value={formData.hs_code}
                  onChange={(e) => setFormData({ ...formData, hs_code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="number_of_packages">Number of Packages</Label>
                <Input
                  id="number_of_packages"
                  type="number"
                  value={formData.number_of_packages}
                  onChange={(e) => setFormData({ ...formData, number_of_packages: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="applicable_free_days">Applicable Free Days</Label>
                <Input
                  id="applicable_free_days"
                  type="number"
                  value={formData.applicable_free_days}
                  onChange={(e) => setFormData({ ...formData, applicable_free_days: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Consignee Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Consignee Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="consignee_name">Consignee Name</Label>
                <Input
                  id="consignee_name"
                  value={formData.consignee_name}
                  onChange={(e) => setFormData({ ...formData, consignee_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="consignee_address">Consignee Address</Label>
                <Textarea
                  id="consignee_address"
                  value={formData.consignee_address}
                  onChange={(e) => setFormData({ ...formData, consignee_address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="consignee_contact_person_name">Contact Person Name</Label>
                <Input
                  id="consignee_contact_person_name"
                  value={formData.consignee_contact_person_name}
                  onChange={(e) => setFormData({ ...formData, consignee_contact_person_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="consignee_contact_person_email">Contact Person Email</Label>
                <Input
                  id="consignee_contact_person_email"
                  type="email"
                  value={formData.consignee_contact_person_email}
                  onChange={(e) => setFormData({ ...formData, consignee_contact_person_email: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Notify Party Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Notify Party Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="notify_name">Notify Party Name</Label>
                <Input
                  id="notify_name"
                  value={formData.notify_name}
                  onChange={(e) => setFormData({ ...formData, notify_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notify_address">Notify Party Address</Label>
                <Textarea
                  id="notify_address"
                  value={formData.notify_address}
                  onChange={(e) => setFormData({ ...formData, notify_address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notify_contact_person_name">Contact Person Name</Label>
                <Input
                  id="notify_contact_person_name"
                  value={formData.notify_contact_person_name}
                  onChange={(e) => setFormData({ ...formData, notify_contact_person_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notify_contact_person_email">Contact Person Email</Label>
                <Input
                  id="notify_contact_person_email"
                  type="email"
                  value={formData.notify_contact_person_email}
                  onChange={(e) => setFormData({ ...formData, notify_contact_person_email: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Containers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Containers</h3>
              <Button type="button" onClick={addContainer} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Container
              </Button>
            </div>
            {containers.map((container, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Container {index + 1}</span>
                  {containers.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeContainer(index)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Container Number</Label>
                    <Input
                      value={container.container_number}
                      onChange={(e) => updateContainer(index, "container_number", e.target.value)}
                      placeholder="e.g., 123456"
                    />
                  </div>
                  <div>
                    <Label>Seal Number</Label>
                    <Input
                      value={container.seal_number}
                      onChange={(e) => updateContainer(index, "seal_number", e.target.value)}
                      placeholder="e.g., 789012"
                    />
                  </div>
                  <div>
                    <Label>Net Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={container.net_weight}
                      onChange={(e) => updateContainer(index, "net_weight", e.target.value)}
                      placeholder="e.g., 25000"
                    />
                  </div>
                  <div>
                    <Label>Gross Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={container.gross_weight}
                      onChange={(e) => updateContainer(index, "gross_weight", e.target.value)}
                      placeholder="e.g., 26000"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save BL Extraction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
