import { useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, FileText, Download, Edit2, Ship, Package, MapPin, Plus, Sparkles, RefreshCw, Eye, Trash2, FilePlus } from "lucide-react";
import { toast } from "sonner";
import { BLExtractionFormDialog } from "@/components/BLExtractionFormDialog";
import { AIBLExtractionDialog } from "@/components/AIBLExtractionDialog";
import { BLPaymentsSection } from "@/components/payments";
import { BLClaimsSection } from "@/components/claims";
import { BLDocumentGeneration } from "@/components/BLDocumentGeneration";
import { ContainersWithPhotos } from "@/components/ContainersWithPhotos";
import { PdfViewerModal } from "@/components/PdfViewerModal";
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

export default function BLOrderDetail() {
  const { blOrderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const blOrderIdNum = blOrderId ? parseInt(blOrderId, 10) : null;
  const fromCashAvailability = location.state?.from === 'cash-availability';
  const [extractionDialogOpen, setExtractionDialogOpen] = useState(false);
  const [aiExtractionDialogOpen, setAiExtractionDialogOpen] = useState(false);
  const [aiExtractionRerunOnly, setAiExtractionRerunOnly] = useState(false);
  const [removeExtractionDialogOpen, setRemoveExtractionDialogOpen] = useState(false);
  const [isRemovingExtraction, setIsRemovingExtraction] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);

  const { data: blOrder, isLoading: blOrderLoading } = useQuery({
    queryKey: ["bl-order", blOrderIdNum],
    queryFn: async () => {
      if (!blOrderIdNum) throw new Error("Invalid BL Order ID");
      const { data, error } = await supabase
        .from("bl_order")
        .select("*")
        .eq("id", blOrderIdNum)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!blOrderIdNum,
  });

  const { data: blExtraction } = useQuery({
    queryKey: ["bl-extraction", blOrderIdNum],
    queryFn: async () => {
      if (!blOrderIdNum) throw new Error("Invalid BL Order ID");
      const { data, error } = await supabase
        .from("bl_extraction")
        .select("*")
        .eq("bl_order_id", blOrderIdNum)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!blOrderIdNum,
  });

  const { data: containers } = useQuery({
    queryKey: ["bl-containers", blOrderIdNum],
    queryFn: async () => {
      if (!blOrderIdNum) throw new Error("Invalid BL Order ID");
      const { data, error } = await supabase
        .from("bl_extraction_container")
        .select("*")
        .eq("bl_order_id", blOrderIdNum);

      if (error) throw error;
      return data || [];
    },
    enabled: !!blOrderIdNum,
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  const formatAmount = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return value.toFixed(2);
  };

  const formatWeight = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return value.toFixed(3);
  };

  const handleDownloadBL = async () => {
    if (!blOrder?.bl_url) return;

    try {
      const { data, error } = await supabase.storage
        .from('bl-documents')
        .download(blOrder.bl_url);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BL_${blOrder.bl_number || blOrder.bl_order_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("BL document downloaded");
    } catch (error) {
      console.error('Error downloading BL:', error);
      toast.error("Failed to download BL document");
    }
  };

  const handleViewBL = () => {
    if (!blOrder?.bl_url) return;
    setPdfViewerOpen(true);
  };

  const getBlPdfUrl = () => {
    if (!blOrder?.bl_url) return "";
    const { data } = supabase.storage.from('bl-documents').getPublicUrl(blOrder.bl_url);
    return data.publicUrl;
  };

  const handleRemoveExtraction = async () => {
    if (!blOrderIdNum) return;
    
    setIsRemovingExtraction(true);
    try {
      // Delete containers first
      const { error: containerError } = await supabase
        .from("bl_extraction_container")
        .delete()
        .eq("bl_order_id", blOrderIdNum);
      
      if (containerError) throw containerError;

      // Delete extraction data
      const { error: extractionError } = await supabase
        .from("bl_extraction")
        .delete()
        .eq("bl_order_id", blOrderIdNum);
      
      if (extractionError) throw extractionError;

      // Delete PDF from storage if it exists
      if (blOrder?.bl_url) {
        try {
          const url = new URL(blOrder.bl_url);
          const pathParts = url.pathname.split('/bl-documents/');
          if (pathParts.length > 1) {
            const filePath = decodeURIComponent(pathParts[1]);
            await supabase.storage.from("bl-documents").remove([filePath]);
          }
        } catch (storageError) {
          console.error("Error deleting PDF from storage:", storageError);
          // Continue even if storage delete fails
        }
      }

      // Clear all extraction-driven fields AND bl_url
      const { error: blOrderError } = await supabase
        .from("bl_order")
        .update({
          bl_number: null,
          bl_issue_date: null,
          port_of_loading: null,
          port_of_discharge: null,
          final_destination: null,
          bl_url: null,
        })
        .eq("id", blOrderIdNum);
      
      if (blOrderError) throw blOrderError;

      // Refetch data
      await queryClient.invalidateQueries({ queryKey: ["bl-order", blOrderIdNum] });
      await queryClient.invalidateQueries({ queryKey: ["bl-extraction", blOrderIdNum] });
      await queryClient.invalidateQueries({ queryKey: ["bl-containers", blOrderIdNum] });

      toast.success("BL extraction and PDF removed successfully");
      setRemoveExtractionDialogOpen(false);
    } catch (error: any) {
      console.error("Error removing extraction:", error);
      toast.error(error.message || "Failed to remove BL extraction");
    } finally {
      setIsRemovingExtraction(false);
    }
  };

  if (blOrderLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading BL order details...</div>
      </div>
    );
  }

  if (!blOrder) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-muted-foreground">BL order not found</div>
        <Button onClick={() => navigate(fromCashAvailability ? "/finance/cash-availability" : "/bl-level")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {fromCashAvailability ? "Back to Cash Availability" : "Back to BL Level"}
        </Button>
      </div>
    );
  }

  const totalNetWeight = containers?.reduce((sum, c) => sum + (c.net_weight || 0), 0) || 0;
  const totalGrossWeight = containers?.reduce((sum, c) => sum + (c.gross_weight || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(fromCashAvailability ? "/finance/cash-availability" : "/bl-level")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{blOrder.bl_order_name || "BL Order"}</h1>
            {blOrder.order_id && (
              <p className="text-sm text-muted-foreground mt-1">
                Linked to{" "}
                <Link to={`/inventory/${blOrder.order_id}`} className="text-primary hover:underline font-medium">
                  Order {blOrder.order_id}
                </Link>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {blOrder.status && (
            <Badge variant="secondary" className="text-sm">
              {blOrder.status}
            </Badge>
          )}
          <Button variant="outline" size="sm">
            <Edit2 className="mr-2 h-4 w-4" />
            Edit BL Order
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Loaded Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatWeight(blOrder.loaded_quantity_mt)} MT</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${formatAmount(blOrder.revenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${formatAmount(blOrder.cost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {blOrder.revenue && blOrder.cost
                ? `$${formatAmount(blOrder.revenue - blOrder.cost)}`
                : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BL Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            BL Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">BL Number</span>
              <p className="text-base font-semibold mt-1">{blOrder.bl_number || "-"}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">BL Issue Date</span>
              <p className="text-base font-semibold mt-1">{formatDate(blOrder.bl_issue_date)}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Loading Date</span>
              <p className="text-base font-semibold mt-1">{formatDate(blOrder.loading_date)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-muted-foreground">Port of Loading</span>
                <p className="text-base font-semibold mt-1">{blOrder.port_of_loading || "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-muted-foreground">Port of Discharge</span>
                <p className="text-base font-semibold mt-1">{blOrder.port_of_discharge || "-"}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Final Destination</span>
              <p className="text-base font-semibold mt-1">{blOrder.final_destination || "-"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">ETD</span>
                <p className="text-base font-semibold mt-1">{formatDate(blOrder.etd)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">ATD</span>
                <p className="text-base font-semibold mt-1">{formatDate(blOrder.atd)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">ETA</span>
              <p className="text-base font-semibold mt-1">{formatDate(blOrder.eta)}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">ATA</span>
              <p className="text-base font-semibold mt-1">{formatDate(blOrder.ata)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deal Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Deal Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {blOrderIdNum && (
            <BLDocumentGeneration 
              blOrderId={blOrderIdNum} 
              blOrder={{
                bl_url: blOrder.bl_url,
                bl_number: blOrder.bl_number,
                bl_order_name: blOrder.bl_order_name,
              }}
              onViewBL={handleViewBL}
              onDownloadBL={handleDownloadBL}
            />
          )}
        </CardContent>
      </Card>

      {/* AI BL Extraction - Unified Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI BL Extraction
            </span>
            <div className="flex items-center gap-2">
              {/* Status Badge */}
              {blExtraction ? (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                  AI Extracted
                </Badge>
              ) : blOrder.bl_url ? (
                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                  PDF Uploaded
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Not uploaded
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Action Toolbar */}
          <div className="flex flex-wrap gap-2">
            {/* Upload & Extract Button */}
            <Button 
              onClick={() => {
                setAiExtractionRerunOnly(false);
                setAiExtractionDialogOpen(true);
              }}
              variant={blExtraction ? "outline" : "default"}
            >
              <Upload className="mr-2 h-4 w-4" />
              {blExtraction ? "Re-upload & Extract" : "Upload BL (AI Extract)"}
            </Button>

            {/* Re-run Extraction (only if PDF exists) */}
            {blOrder.bl_url && (
              <Button 
                variant="outline"
                onClick={() => {
                  setAiExtractionRerunOnly(true);
                  setAiExtractionDialogOpen(true);
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-run Extraction
              </Button>
            )}

            {/* Edit Extracted Data (only if extraction exists) */}
            {blExtraction && (
              <Button 
                variant="outline"
                onClick={() => setExtractionDialogOpen(true)}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Extracted Data
              </Button>
            )}

            {/* View BL PDF (only if PDF exists) */}
            {blOrder.bl_url && (
              <Button variant="outline" onClick={handleViewBL}>
                <Eye className="mr-2 h-4 w-4" />
                View BL PDF
              </Button>
            )}

            {/* Remove Extraction (only if extraction exists) */}
            {blExtraction && (
              <Button 
                variant="outline"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setRemoveExtractionDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Extraction
              </Button>
            )}
          </div>

          {/* Extraction Data Display */}
          {blExtraction ? (
            <>
              {/* Basic Information */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Vessel Name</span>
                    <p className="text-base mt-1">{blExtraction.vessel_name || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Shipper</span>
                    <p className="text-base mt-1">{blExtraction.shipper || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Shipping Line</span>
                    <p className="text-base mt-1">{blExtraction.shipping_line || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Shipping Information */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Shipping Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Country of Origin</span>
                    <p className="text-base mt-1">{blExtraction.country_of_origin || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Final Destination</span>
                    <p className="text-base mt-1">{blExtraction.final_destination || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Port of Loading</span>
                    <p className="text-base mt-1">{blExtraction.port_of_loading || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Port of Discharge</span>
                    <p className="text-base mt-1">{blExtraction.port_of_discharge || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Product Information */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Product Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <span className="text-sm font-medium text-muted-foreground">Product Description</span>
                    <p className="text-base mt-1">{blExtraction.product_description || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">HS Code</span>
                    <p className="text-base mt-1">{blExtraction.hs_code || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Applicable Free Days</span>
                    <p className="text-base mt-1">{blExtraction.applicable_free_days ?? "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Number of Packages</span>
                    <p className="text-base mt-1">{blExtraction.number_of_packages || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Total Net Weight (MT)</span>
                    <p className="text-base font-semibold mt-1">{formatWeight(totalNetWeight)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Total Gross Weight (MT)</span>
                    <p className="text-base font-semibold mt-1">{formatWeight(totalGrossWeight)}</p>
                  </div>
                </div>
              </div>

              {/* Consignee Information */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Consignee Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Consignee Name</span>
                    <p className="text-base mt-1">{blExtraction.consignee_name || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Consignee Address</span>
                    <p className="text-base mt-1">{blExtraction.consignee_address || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Contact Person</span>
                    <p className="text-base mt-1">{blExtraction.consignee_contact_person_name || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Contact Email</span>
                    <p className="text-base mt-1">{blExtraction.consignee_contact_person_email || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Notify Party Information */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Notify Party Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Notify Party Name</span>
                    <p className="text-base mt-1">{blExtraction.notify_name || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Notify Party Address</span>
                    <p className="text-base mt-1">{blExtraction.notify_address || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Contact Person</span>
                    <p className="text-base mt-1">{blExtraction.notify_contact_person_name || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Contact Email</span>
                    <p className="text-base mt-1">{blExtraction.notify_contact_person_email || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Notes / Description of Goods */}
              {blExtraction.description_of_goods && (
                <div className="border-t pt-6">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Notes</h4>
                  <p className="text-base whitespace-pre-wrap">{blExtraction.description_of_goods}</p>
                </div>
              )}

              {/* Containers with Photos */}
              {containers && containers.length > 0 && blOrderIdNum && (
                <ContainersWithPhotos
                  blOrderId={blOrderIdNum}
                  blOrderName={blOrder.bl_order_name}
                  containers={containers}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center border-t">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No BL extraction data yet.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Upload a BL PDF to extract data automatically.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Section */}
      {blOrder.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{blOrder.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Payments & Invoices Section */}
      {blOrder.bl_order_name && blOrderIdNum && (
        <BLPaymentsSection
          blOrderName={blOrder.bl_order_name}
          blOrderId={blOrderIdNum}
          orderId={blOrder.order_id}
          eta={blOrder.eta}
          ata={blOrder.ata}
          loadedQuantityMt={blOrder.loaded_quantity_mt}
          totalQuantityMt={blOrder.total_quantity_mt}
        />
      )}

      {/* Claims Section */}
      {blOrderIdNum && blOrder.bl_order_name && (
        <BLClaimsSection 
          blOrderId={blOrderIdNum} 
          blOrderName={blOrder.bl_order_name}
          orderId={blOrder.order_id}
          ata={blOrder.ata}
        />
      )}

      {/* BL Extraction Dialog (Manual Edit) */}
      <BLExtractionFormDialog
        open={extractionDialogOpen}
        onOpenChange={setExtractionDialogOpen}
        blOrderId={blOrderIdNum || undefined}
        blNumber={blOrder.bl_number || undefined}
        existingData={blExtraction ? { ...blExtraction, containers } : undefined}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["bl-extraction", blOrderIdNum] });
          queryClient.invalidateQueries({ queryKey: ["bl-containers", blOrderIdNum] });
          queryClient.invalidateQueries({ queryKey: ["bl-order", blOrderIdNum] });
        }}
      />

      {/* AI BL Extraction Dialog */}
      {blOrderIdNum && (
        <AIBLExtractionDialog
          open={aiExtractionDialogOpen}
          onOpenChange={(open) => {
            setAiExtractionDialogOpen(open);
            if (!open) setAiExtractionRerunOnly(false);
          }}
          blOrderId={blOrderIdNum}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["bl-extraction", blOrderIdNum] });
            queryClient.invalidateQueries({ queryKey: ["bl-containers", blOrderIdNum] });
            queryClient.invalidateQueries({ queryKey: ["bl-order", blOrderIdNum] });
          }}
          existingBlUrl={blOrder?.bl_url}
          rerunOnly={aiExtractionRerunOnly}
        />
      )}

      {/* Remove Extraction Confirmation Dialog */}
      <AlertDialog open={removeExtractionDialogOpen} onOpenChange={setRemoveExtractionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove BL Extraction?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes extracted data and containers but does not delete the BL PDF.
              You can re-run extraction later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingExtraction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveExtraction}
              disabled={isRemovingExtraction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemovingExtraction ? "Removing..." : "Remove Extraction"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {blOrder?.bl_url && (
        <PdfViewerModal
          isOpen={pdfViewerOpen}
          onClose={() => setPdfViewerOpen(false)}
          pdfUrl={getBlPdfUrl()}
          documentName={`BL - ${blOrder.bl_number || blOrder.bl_order_name}`}
          onDownload={handleDownloadBL}
        />
      )}
    </div>
  );
}
