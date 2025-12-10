import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, Download, Loader2, Image } from "lucide-react";
import { toast } from "sonner";
import { ContainerPhotoUploadDialog } from "./ContainerPhotoUploadDialog";
import { ContainerPhotoViewerDialog } from "./ContainerPhotoViewerDialog";

interface Container {
  id: number;
  container_number: string | null;
  seal_number: string | null;
  net_weight: number | null;
  gross_weight: number | null;
}

interface ContainersWithPhotosProps {
  blOrderId: number;
  blOrderName: string | null;
  containers: Container[];
}

export const ContainersWithPhotos: React.FC<ContainersWithPhotosProps> = ({ blOrderId, blOrderName, containers }) => {
  const [selectedContainers, setSelectedContainers] = useState<Set<number>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [activeContainer, setActiveContainer] = useState<Container | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerContainer, setViewerContainer] = useState<Container | null>(null);

  // Fetch photo counts for all containers
  const { data: photoCounts } = useQuery({
    queryKey: ["container-photos", blOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bl_container_photos")
        .select("container_id")
        .eq("bl_order_id", blOrderId);

      if (error) throw error;

      // Count photos per container
      const counts: Record<number, number> = {};
      data?.forEach((photo) => {
        counts[photo.container_id] = (counts[photo.container_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!blOrderId,
  });

  const formatAmount = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return value.toFixed(2);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContainers(new Set(containers.map((c) => c.id)));
    } else {
      setSelectedContainers(new Set());
    }
  };

  const handleSelectContainer = (containerId: number, checked: boolean) => {
    const newSelected = new Set(selectedContainers);
    if (checked) {
      newSelected.add(containerId);
    } else {
      newSelected.delete(containerId);
    }
    setSelectedContainers(newSelected);
  };

  const openUploadDialog = (container: Container) => {
    setActiveContainer(container);
    setUploadDialogOpen(true);
  };

  const handleBulkDownload = async () => {
    if (selectedContainers.size === 0) return;
    setDownloading(true);

    try {
      const supabaseUrl = "https://tbwkhqvrqhagoswehrkx.supabase.co";
      const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRid2tocXZycWhhZ29zd2Vocmt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MDQ3NDMsImV4cCI6MjA3OTM4MDc0M30.GkJN4dDbGbrViG45ThdlNNGjuobiRaEotiSp--rppzQ";

      const url = `${supabaseUrl}/functions/v1/download-container-photos`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          bl_order_id: blOrderId,
          container_ids: Array.from(selectedContainers),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Download error response:", response.status, errorText);
        throw new Error(`Download failed (${response.status})`);
      }

      const blob = await response.blob();
      console.log("ZIP blob size:", blob.size);

      if (blob.size === 0) {
        throw new Error("Received empty ZIP file");
      }

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `BL-${blOrderName || blOrderId}-containers.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success("Photos downloaded successfully");
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error(error.message || "Failed to download photos");
    } finally {
      setDownloading(false);
    }
  };

  const allSelected = containers.length > 0 && selectedContainers.size === containers.length;
  const someSelected = selectedContainers.size > 0 && selectedContainers.size < containers.length;

  // Check if any selected container has photos
  const selectedHavePhotos = Array.from(selectedContainers).some((id) => (photoCounts?.[id] || 0) > 0);

  return (
    <div className="border-t pt-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase">Containers ({containers.length})</h4>
        {selectedContainers.size > 0 && selectedHavePhotos && (
          <Button size="sm" variant="outline" onClick={handleBulkDownload} disabled={downloading}>
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download Selected Photos ({selectedContainers.size})
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="text-left text-sm">
              <th className="p-3 w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                />
              </th>
              <th className="p-3 font-semibold">Container #</th>
              <th className="p-3 font-semibold">Seal #</th>
              <th className="p-3 font-semibold">Net Weight (MT)</th>
              <th className="p-3 font-semibold">Gross Weight (MT)</th>
              <th className="p-3 font-semibold">Photos</th>
              <th className="p-3 font-semibold w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {containers.map((container) => {
              const photoCount = photoCounts?.[container.id] || 0;
              return (
                <tr key={container.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <Checkbox
                      checked={selectedContainers.has(container.id)}
                      onCheckedChange={(checked) => handleSelectContainer(container.id, checked as boolean)}
                      aria-label={`Select container ${container.container_number}`}
                    />
                  </td>
                  <td className="p-3 font-medium">{container.container_number || "-"}</td>
                  <td className="p-3">{container.seal_number || "-"}</td>
                  <td className="p-3">{formatAmount(container.net_weight)}</td>
                  <td className="p-3">{formatAmount(container.gross_weight)}</td>
                  <td className="p-3">
                    {photoCount > 0 ? (
                      <button
                        onClick={() => {
                          setViewerContainer(container);
                          setViewerOpen(true);
                        }}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <Badge variant="secondary" className="gap-1">
                          <Image className="h-3 w-3" />
                          {photoCount}
                        </Badge>
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" onClick={() => openUploadDialog(container)}>
                      <Camera className="mr-1 h-3 w-3" />
                      Upload
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Upload Dialog */}
      {activeContainer && (
        <ContainerPhotoUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          blOrderId={blOrderId}
          containerId={activeContainer.id}
          containerNumber={activeContainer.container_number || `container-${activeContainer.id}`}
        />
      )}

      {/* Photo Viewer Dialog */}
      {viewerContainer && (
        <ContainerPhotoViewerDialog
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          blOrderId={blOrderId}
          containerId={viewerContainer.id}
          containerNumber={viewerContainer.container_number || `container-${viewerContainer.id}`}
        />
      )}
    </div>
  );
};
