import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ExternalLink, ImageOff } from "lucide-react";
import type { EvidencePhoto } from "./TicketEvidenceSection";

interface EvidencePhotoViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: EvidencePhoto[];
  initialIndex?: number;
  title?: string;
}

export const EvidencePhotoViewer: React.FC<EvidencePhotoViewerProps> = ({
  open,
  onOpenChange,
  photos,
  initialIndex = 0,
  title = "Evidence Photos",
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  // Reset active index when dialog opens
  useEffect(() => {
    if (open) {
      setActiveIndex(initialIndex);
    }
  }, [open, initialIndex]);

  // Adjust active index if current photo was deleted
  useEffect(() => {
    if (photos && activeIndex >= photos.length && photos.length > 0) {
      setActiveIndex(photos.length - 1);
    }
  }, [photos, activeIndex]);

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

  const activePhoto = photos?.[activeIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {!photos || photos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
            <ImageOff className="h-12 w-12 mb-4" />
            <p>No photos available</p>
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
                  href={activePhoto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block max-h-full max-w-full"
                  title="Open full size in new tab"
                >
                  <img
                    src={activePhoto.url}
                    alt={activePhoto.fileName || `Photo ${activeIndex + 1}`}
                    className="max-h-[400px] max-w-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </a>
              )}

              {/* Action button */}
              {activePhoto && (
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-background/80 hover:bg-background"
                    onClick={() => window.open(activePhoto.url, "_blank")}
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Photo metadata */}
            {activePhoto && (
              <div className="text-sm text-muted-foreground text-center">
                {activePhoto.fileName && (
                  <span className="font-medium">{activePhoto.fileName}</span>
                )}
                <span className="mx-2">•</span>
                <span>{activeIndex + 1} of {photos.length}</span>
              </div>
            )}

            {/* Thumbnails */}
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id || index}
                    onClick={() => setActiveIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === activeIndex
                        ? "border-primary"
                        : "border-transparent hover:border-muted-foreground/50"
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={photo.fileName || `Photo ${index + 1}`}
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
  );
};
