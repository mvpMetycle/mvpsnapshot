import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, Sparkles, Plus, Trash2, FileText, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Container {
  container_number: string;
  seal_number: string;
  net_weight: string;
  gross_weight: string;
}

interface ExtractedData {
  basic_information?: {
    bl_order_name?: string | null;
    order_id?: string | null;
    status?: string | null;
    bl_number?: string | null;
    bl_issue_date?: string | null;
  };
  shipping_information?: {
    port_of_loading?: string | null;
    port_of_discharge?: string | null;
    final_destination?: string | null;
    loading_date?: string | null;
    shipper?: string | null;
    shipping_line?: string | null;
    country_of_origin?: string | null;
    hs_code?: number | null;
    applicable_free_days?: number | null;
    consignee_name?: string | null;
    consignee_address?: string | null;
    consignee_contact_person_name?: string | null;
    consignee_contact_person_email?: string | null;
    notify_name?: string | null;
    notify_address?: string | null;
    notify_contact_person_name?: string | null;
    notify_contact_person_email?: string | null;
  };
  schedule?: {
    etd?: string | null;
    atd?: string | null;
    eta?: string | null;
    ata?: string | null;
  };
  quantities?: {
    total_quantity_mt?: number | null;
    container_count?: number | null;
    number_of_packages?: number | null;
    commodity_description?: string | null;
  };
  containers?: Array<{
    container_number?: string | null;
    seal_number?: string | null;
    net_weight?: number | null;
    gross_weight?: number | null;
  }>;
  financial?: {
    buy_price?: number | null;
    sell_price?: number | null;
    revenue?: number | null;
    cost?: number | null;
    final_invoice_id?: string | null;
  };
  documents_and_notes?: {
    bl_url?: string | null;
    notes?: string | null;
  };
}

interface AIBLExtractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blOrderId: number;
  onSuccess: () => void;
  existingBlUrl?: string | null;
  rerunOnly?: boolean;
}

export function AIBLExtractionDialog({
  open,
  onOpenChange,
  blOrderId,
  onSuccess,
  existingBlUrl,
  rerunOnly = false,
}: AIBLExtractionDialogProps) {
  const [step, setStep] = useState<"upload" | "extracting" | "review">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadedBlUrl, setUploadedBlUrl] = useState<string | null>(null);

  // Form state for editing
  const [formData, setFormData] = useState({
    bl_number: "",
    bl_issue_date: "",
    loading_date: "",
    port_of_loading: "",
    port_of_discharge: "",
    final_destination: "",
    product_description: "",
    country_of_origin: "",
    hs_code: "",
    applicable_free_days: "",
    number_of_packages: "",
    shipping_line: "",
    shipper: "",
    consignee_name: "",
    consignee_address: "",
    consignee_contact_person_name: "",
    consignee_contact_person_email: "",
    notify_name: "",
    notify_address: "",
    notify_contact_person_name: "",
    notify_contact_person_email: "",
    notes: "",
  });

  const [containers, setContainers] = useState<Container[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else {
      toast.error("Please select a PDF file");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
    } else {
      toast.error("Please drop a PDF file");
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Auto-start extraction when rerunOnly is true and dialog opens
  useEffect(() => {
    if (open && rerunOnly && existingBlUrl) {
      handleRerunExtraction();
    }
  }, [open, rerunOnly, existingBlUrl]);

  const handleRerunExtraction = async () => {
    if (!existingBlUrl) {
      toast.error("No existing BL document found");
      return;
    }

    setStep("extracting");

    try {
      // Download the existing PDF from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("bl-documents")
        .download(existingBlUrl);

      if (downloadError) {
        console.error("Download error:", downloadError);
        throw new Error("Failed to download existing BL PDF");
      }

      // Create a File object from the blob
      const existingFile = new File([fileData], "existing_bl.pdf", { type: "application/pdf" });

      // Call the extract-bol edge function
      const formDataPayload = new FormData();
      formDataPayload.append("file", existingFile);

      const response = await fetch(
        "https://tbwkhqvrqhagoswehrkx.supabase.co/functions/v1/extract-bol",
        {
          method: "POST",
          body: formDataPayload,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Extraction failed");
      }

      const result = await response.json();
      
      if (!result.data) {
        throw new Error("No data returned from extraction");
      }

      setExtractedData(result.data);
      populateFormFromExtraction(result.data);
      setStep("review");
      toast.success("BL data re-extracted successfully");
    } catch (error: any) {
      console.error("Re-extraction error:", error);
      toast.error(error.message || "Failed to re-extract BL data");
      handleClose();
    }
  };

  const handleExtract = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setStep("extracting");

    try {
      // First, upload the PDF to storage
      const fileName = `${blOrderId}_${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("bl-documents")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Failed to upload PDF");
      }

      setUploadedBlUrl(fileName);

      // Call the extract-bol edge function
      const formDataPayload = new FormData();
      formDataPayload.append("file", file);

      const response = await fetch(
        "https://tbwkhqvrqhagoswehrkx.supabase.co/functions/v1/extract-bol",
        {
          method: "POST",
          body: formDataPayload,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Extraction failed");
      }

      const result = await response.json();
      
      if (!result.data) {
        throw new Error("No data returned from extraction");
      }

      setExtractedData(result.data);
      populateFormFromExtraction(result.data);
      setStep("review");
      toast.success("BL data extracted successfully");
    } catch (error: any) {
      console.error("Extraction error:", error);
      toast.error(error.message || "Failed to extract BL data");
      setStep("upload");
    }
  };

  const populateFormFromExtraction = (data: ExtractedData) => {
    setFormData({
      bl_number: data.basic_information?.bl_number || "",
      bl_issue_date: data.basic_information?.bl_issue_date || "",
      loading_date: data.shipping_information?.loading_date || "",
      port_of_loading: data.shipping_information?.port_of_loading || "",
      port_of_discharge: data.shipping_information?.port_of_discharge || "",
      final_destination: data.shipping_information?.final_destination || "",
      product_description: data.quantities?.commodity_description || "",
      country_of_origin: data.shipping_information?.country_of_origin || "",
      hs_code: data.shipping_information?.hs_code?.toString() || "",
      applicable_free_days: data.shipping_information?.applicable_free_days?.toString() || "",
      number_of_packages: data.quantities?.number_of_packages?.toString() || "",
      shipping_line: data.shipping_information?.shipping_line || "",
      shipper: data.shipping_information?.shipper || "",
      consignee_name: data.shipping_information?.consignee_name || "",
      consignee_address: data.shipping_information?.consignee_address || "",
      consignee_contact_person_name: data.shipping_information?.consignee_contact_person_name || "",
      consignee_contact_person_email: data.shipping_information?.consignee_contact_person_email || "",
      notify_name: data.shipping_information?.notify_name || "",
      notify_address: data.shipping_information?.notify_address || "",
      notify_contact_person_name: data.shipping_information?.notify_contact_person_name || "",
      notify_contact_person_email: data.shipping_information?.notify_contact_person_email || "",
      notes: data.documents_and_notes?.notes || "",
    });

    // Populate containers
    if (data.containers && data.containers.length > 0) {
      setContainers(
        data.containers.map((c) => ({
          container_number: c.container_number || "",
          seal_number: c.seal_number || "",
          net_weight: c.net_weight?.toString() || "",
          gross_weight: c.gross_weight?.toString() || "",
        }))
      );
    } else {
      setContainers([{ container_number: "", seal_number: "", net_weight: "", gross_weight: "" }]);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Calculate total weights from containers
      const totalNetWeight = containers.reduce((sum, c) => sum + (parseFloat(c.net_weight) || 0), 0);
      const totalGrossWeight = containers.reduce((sum, c) => sum + (parseFloat(c.gross_weight) || 0), 0);

      // Upsert BL extraction data
      const { error: blError } = await supabase
        .from("bl_extraction")
        .upsert({
          bl_order_id: blOrderId,
          bl_number: formData.bl_number,
          bl_issue_date: formData.bl_issue_date || null,
          loading_date: formData.loading_date || null,
          port_of_loading: formData.port_of_loading || null,
          port_of_discharge: formData.port_of_discharge || null,
          final_destination: formData.final_destination || null,
          product_description: formData.product_description || null,
          country_of_origin: formData.country_of_origin || null,
          hs_code: formData.hs_code ? parseInt(formData.hs_code, 10) : null,
          applicable_free_days: formData.applicable_free_days ? parseInt(formData.applicable_free_days, 10) : null,
          number_of_packages: formData.number_of_packages ? parseFloat(formData.number_of_packages) : null,
          number_of_containers: containers.filter(c => c.container_number).length,
          total_net_weight: totalNetWeight || null,
          total_gross_weight: totalGrossWeight || null,
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
          description_of_goods: formData.notes || null,
        }, { onConflict: 'bl_order_id' });

      if (blError) throw blError;

      // Update bl_order with extracted data
      const blOrderUpdate: any = {
        bl_number: formData.bl_number,
        bl_issue_date: formData.bl_issue_date || null,
        loading_date: formData.loading_date || null,
        port_of_loading: formData.port_of_loading || null,
        port_of_discharge: formData.port_of_discharge || null,
        final_destination: formData.final_destination || null,
        loaded_quantity_mt: totalNetWeight || null,
      };

      if (uploadedBlUrl) {
        blOrderUpdate.bl_url = uploadedBlUrl;
      }

      await supabase
        .from('bl_order')
        .update(blOrderUpdate)
        .eq('id', blOrderId);

      // Delete existing containers and insert new ones
      await supabase
        .from("bl_extraction_container")
        .delete()
        .eq("bl_order_id", blOrderId);

      // Insert container data
      const containerInserts = containers
        .filter(c => c.container_number)
        .map(container => ({
          bl_order_id: blOrderId,
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

      toast.success("BL extraction data saved successfully");
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Error saving BL extraction:", error);
      toast.error(error.message || "Failed to save BL extraction data");
    } finally {
      setSaving(false);
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

  const handleClose = () => {
    setStep("upload");
    setFile(null);
    setExtractedData(null);
    setUploadedBlUrl(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === "upload" && "Upload BL Document for AI Extraction"}
            {step === "extracting" && "Extracting BL Data..."}
            {step === "review" && "Review & Edit Extracted Data"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="flex-1 py-8">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors"
            >
              {file ? (
                <div className="flex flex-col items-center gap-4">
                  <FileText className="h-16 w-16 text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setFile(null)}>
                    Choose Different File
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Upload className="h-16 w-16 text-muted-foreground/50" />
                  <div>
                    <p className="text-lg font-medium">Drop your BL PDF here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="bl-file-upload"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="bl-file-upload" className="cursor-pointer">
                      Select PDF
                    </label>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Extracting */}
        {step === "extracting" && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-6">
            <div className="relative">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <Sparkles className="h-6 w-6 text-primary absolute -top-1 -right-1" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">Analyzing your Bill of Lading...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Our AI is extracting all relevant data from the document
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === "review" && (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              {/* Success indicator */}
              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-700">AI extraction completed. Review and edit the data below before saving.</span>
              </div>

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Basic Information</h3>
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
                  <div>
                    <Label htmlFor="loading_date">Loading Date</Label>
                    <Input
                      id="loading_date"
                      type="date"
                      value={formData.loading_date}
                      onChange={(e) => setFormData({ ...formData, loading_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Shipping Information</h3>
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
                    <Label htmlFor="country_of_origin">Country of Origin</Label>
                    <Input
                      id="country_of_origin"
                      value={formData.country_of_origin}
                      onChange={(e) => setFormData({ ...formData, country_of_origin: e.target.value })}
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
                <h3 className="font-semibold text-lg border-b pb-2">Product Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="product_description">Product / Commodity Description</Label>
                    <Textarea
                      id="product_description"
                      value={formData.product_description}
                      onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
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
                    <Label htmlFor="hs_code">HS Code</Label>
                    <Input
                      id="hs_code"
                      value={formData.hs_code}
                      onChange={(e) => setFormData({ ...formData, hs_code: e.target.value })}
                      placeholder="e.g., 72044900"
                    />
                  </div>
                  <div>
                    <Label htmlFor="applicable_free_days">Applicable Free Days</Label>
                    <Input
                      id="applicable_free_days"
                      type="number"
                      value={formData.applicable_free_days}
                      onChange={(e) => setFormData({ ...formData, applicable_free_days: e.target.value })}
                      placeholder="e.g., 14"
                    />
                  </div>
                </div>
              </div>

              {/* Containers */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-semibold text-lg">Containers ({containers.length})</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addContainer}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Container
                  </Button>
                </div>
                <div className="space-y-3">
                  {containers.map((container, index) => (
                    <div key={index} className="grid grid-cols-5 gap-3 items-end p-3 border rounded-lg bg-muted/30">
                      <div>
                        <Label className="text-xs">Container #</Label>
                        <Input
                          value={container.container_number}
                          onChange={(e) => updateContainer(index, "container_number", e.target.value)}
                          placeholder="XXXX1234567"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Seal #</Label>
                        <Input
                          value={container.seal_number}
                          onChange={(e) => updateContainer(index, "seal_number", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Net Weight (MT)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={container.net_weight}
                          onChange={(e) => updateContainer(index, "net_weight", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Gross Weight (MT)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={container.gross_weight}
                          onChange={(e) => updateContainer(index, "gross_weight", e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeContainer(index)}
                        disabled={containers.length === 1}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consignee Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Consignee Information</h3>
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
                    <Label htmlFor="consignee_contact_person_name">Contact Person</Label>
                    <Input
                      id="consignee_contact_person_name"
                      value={formData.consignee_contact_person_name}
                      onChange={(e) => setFormData({ ...formData, consignee_contact_person_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="consignee_contact_person_email">Contact Email</Label>
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
                <h3 className="font-semibold text-lg border-b pb-2">Notify Party Information</h3>
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
                    <Label htmlFor="notify_contact_person_name">Contact Person</Label>
                    <Input
                      id="notify_contact_person_name"
                      value={formData.notify_contact_person_name}
                      onChange={(e) => setFormData({ ...formData, notify_contact_person_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notify_contact_person_email">Contact Email</Label>
                    <Input
                      id="notify_contact_person_email"
                      type="email"
                      value={formData.notify_contact_person_email}
                      onChange={(e) => setFormData({ ...formData, notify_contact_person_email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Notes</h3>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="border-t pt-4">
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleExtract} disabled={!file}>
                <Sparkles className="mr-2 h-4 w-4" />
                Extract with AI
              </Button>
            </>
          )}
          {step === "review" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Upload Different File
              </Button>
              <Button onClick={handleSave} disabled={saving || !formData.bl_number}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Extraction Data"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
