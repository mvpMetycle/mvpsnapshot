import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ExternalLink, ImageOff, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { DeleteWithReasonDialog } from "./DeleteWithReasonDialog";
import { softDeleteContainerPhoto } from "@/hooks/useDeleteEntity";

interface ContainerPhotoViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blOrderId: number;
  containerId: number;
  containerNumber: string;
}

interface ContainerPhoto {
  id: string;
  file_path: string;
  file_name_original: string;
  content_type: string;
  created_at: string;
}

export const ContainerPhotoViewerDialog: React.FC<ContainerPhotoViewerDialogProps> = ({
  open,
  onOpenChange,
  blOrderId,
  containerId,
  containerNumber,
}) => {
  const queryClient = useQueryClient();
  const [activeIndex, setActiveIndex] = useState(0);
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Fetch photos for this container
  const { data: photos, isLoading, error, refetch } = useQuery({
    queryKey: ["container-photo-list", blOrderId, containerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bl_container_photos")
        .select("id, file_path, file_name_original, content_type, created_at")
        .eq("bl_order_id", blOrderId)
        .eq("container_id", containerId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ContainerPhoto[];
    },
    enabled: open && !!blOrderId && !!containerId,
  });

  // Reset active index when dialog opens or photos change
  useEffect(() => {
    if (open) {
      setActiveIndex(0);
    }
  }, [open, containerId]);

  // Adjust active index if current photo was deleted
  useEffect(() => {
    if (photos && activeIndex >= photos.length && photos.length > 0) {
      setActiveIndex(photos.length - 1);
    }
  }, [photos, activeIndex]);

  // Build public URL for a photo
  const getPhotoUrl = (filePath: string) => {
    const { data } = supabase.storage.from("container-photos").getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    if (photos && photos.length > 0) {
      setActiveIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    }
  }, [photos]);

  const goToNext = useCallback(() => {
    if (photos && photos.length > 0) {
      setActiveIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    }
  }, [photos]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, goToPrevious, goToNext]);

  // Handle single photo delete
  const handleDeletePhoto = async (reason: string) => {
    if (!deletePhotoId) return;
    
    const photoToDelete = photos?.find(p => p.id === deletePhotoId);
    if (!photoToDelete) return;

    setIsDeleting(true);
    try {
      // Soft delete in database (keeps storage file for audit)
      await softDeleteContainerPhoto(deletePhotoId, reason);

      toast.success("Photo deleted successfully");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["container-photos"] });
    } catch (error: any) {
      toast.error("Failed to delete photo: " + error.message);
    } finally {
      setIsDeleting(false);
      setDeletePhotoId(null);
    }
  };

  // Handle delete all photos for container
  const handleDeleteAllPhotos = async (reason: string) => {
    if (!photos || photos.length === 0) return;

    setIsDeletingAll(true);
    try {
      // Soft delete all photos
      for (const photo of photos) {
        await softDeleteContainerPhoto(photo.id, reason);
      }

      toast.success("All photos deleted successfully");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["container-photos"] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to delete photos: " + error.message);
    } finally {
      setIsDeletingAll(false);
      setDeleteAllDialogOpen(false);
    }
  };
  const activePhoto = photos?.[activeIndex];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Photos – {containerNumber}</DialogTitle>
              {photos && photos.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive mr-8"
                  onClick={() => setDeleteAllDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All
                </Button>
              )}
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex-1 flex flex-col gap-4">
              <Skeleton className="flex-1 min-h-[400px]" />
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="w-20 h-20 rounded" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-destructive">
              <p>Failed to load photos</p>
            </div>
          ) : !photos || photos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
              <ImageOff className="h-12 w-12 mb-4" />
              <p>No photos available for this container</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {/* Main preview area */}
              <div className="relative flex-1 min-h-[400px] bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden">
                {/* Navigation buttons */}
                {photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background z-10"
                      onClick={goToPrevious}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background z-10"
                      onClick={goToNext}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}

                {/* Main image */}
                {activePhoto && (
                  <a
                    href={getPhotoUrl(activePhoto.file_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block max-h-full max-w-full"
                    title="Open full size in new tab"
                  >
                    <img
                      src={getPhotoUrl(activePhoto.file_path)}
                      alt={activePhoto.file_name_original}
                      className="max-h-[400px] max-w-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </a>
                )}

                {/* Action buttons */}
                {activePhoto && (
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-background/80 hover:bg-background"
                      onClick={() => window.open(getPhotoUrl(activePhoto.file_path), "_blank")}
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-background/80 hover:bg-background text-destructive hover:text-destructive"
                      onClick={() => setDeletePhotoId(activePhoto.id)}
                      title="Delete photo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Photo metadata */}
              {activePhoto && (
                <div className="text-sm text-muted-foreground text-center">
                  <span className="font-medium">{activePhoto.file_name_original}</span>
                  <span className="mx-2">•</span>
                  <span>{format(new Date(activePhoto.created_at), "MMM d, yyyy h:mm a")}</span>
                  <span className="mx-2">•</span>
                  <span>{activeIndex + 1} of {photos.length}</span>
                </div>
              )}

              {/* Thumbnails */}
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => setActiveIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        index === activeIndex
                          ? "border-primary"
                          : "border-transparent hover:border-muted-foreground/50"
                      }`}
                    >
                      <img
                        src={getPhotoUrl(photo.file_path)}
                        alt={photo.file_name_original}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Single Photo Confirmation */}
      <DeleteWithReasonDialog
        entityLabel="Photo"
        open={deletePhotoId !== null}
        onOpenChange={(open) => !open && setDeletePhotoId(null)}
        onConfirm={handleDeletePhoto}
        isDeleting={isDeleting}
      />

      {/* Delete All Photos Confirmation */}
      <DeleteWithReasonDialog
        entityLabel={`All ${photos?.length || 0} Photos`}
        open={deleteAllDialogOpen}
        onOpenChange={setDeleteAllDialogOpen}
        onConfirm={handleDeleteAllPhotos}
        isDeleting={isDeletingAll}
      />
    </>
  );
};
