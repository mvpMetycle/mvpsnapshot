import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EvidencePhotoViewer } from './EvidencePhotoViewer';

export interface EvidencePhoto {
  id?: string;
  url: string;
  fileName?: string;
  filePath?: string;
}

interface TicketEvidenceSectionProps {
  ticketId?: number | null;
  existingPhotos: EvidencePhoto[];
  onPhotosChange: (photos: EvidencePhoto[]) => void;
}

export const TicketEvidenceSection: React.FC<TicketEvidenceSectionProps> = ({
  ticketId,
  existingPhotos,
  onPhotosChange,
}) => {
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newPhotos: EvidencePhoto[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from('ticket-photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('ticket-photos')
          .getPublicUrl(filePath);

        // If ticketId exists, save to ticket_photos table
        if (ticketId) {
          const { data: insertedPhoto, error: insertError } = await supabase
            .from('ticket_photos')
            .insert({
              ticket_id: ticketId,
              file_path: filePath,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type
            })
            .select('id')
            .single();

          if (insertError) throw insertError;

          newPhotos.push({
            id: insertedPhoto.id,
            url: publicUrl,
            fileName: file.name,
            filePath: filePath,
          });
        } else {
          // For new tickets, just track the URL
          newPhotos.push({
            url: publicUrl,
            fileName: file.name,
            filePath: filePath,
          });
        }
      }

      const updatedPhotos = [...existingPhotos, ...newPhotos];
      onPhotosChange(updatedPhotos);

      toast({
        title: "Photos uploaded",
        description: `${newPhotos.length} photo(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: "Upload failed",
        description: "Could not upload photos",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (index: number) => {
    const photoToRemove = existingPhotos[index];
    
    try {
      // If photo has an ID and ticketId, delete from database
      if (photoToRemove.id && ticketId) {
        // Delete from storage if we have the file path
        if (photoToRemove.filePath) {
          await supabase.storage.from('ticket-photos').remove([photoToRemove.filePath]);
        }
        
        // Delete from database
        await supabase.from('ticket_photos').delete().eq('id', photoToRemove.id);
      }

      const updatedPhotos = existingPhotos.filter((_, i) => i !== index);
      onPhotosChange(updatedPhotos);
    } catch (error) {
      console.error('Error removing photo:', error);
      toast({
        title: "Error",
        description: "Could not remove photo",
        variant: "destructive",
      });
    }
  };

  const openViewer = (index: number) => {
    setViewerInitialIndex(index);
    setViewerOpen(true);
  };

  // Generate unique IDs for inputs to avoid conflicts when multiple instances exist
  const inputIdPrefix = ticketId ? `ticket-${ticketId}` : `new-${Date.now()}`;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Attach Evidence (Photos)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => document.getElementById(`${inputIdPrefix}-file-upload`)?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Photos
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => document.getElementById(`${inputIdPrefix}-camera-capture`)?.click()}
              >
                <Camera className="mr-2 h-4 w-4" />
                Take Photo
              </Button>

              <input
                id={`${inputIdPrefix}-file-upload`}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />

              <input
                id={`${inputIdPrefix}-camera-capture`}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {existingPhotos.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {existingPhotos.map((photo, index) => (
                  <div key={photo.id || index} className="relative group">
                    <button
                      type="button"
                      className="block focus:outline-none focus:ring-2 focus:ring-primary rounded"
                      onClick={() => openViewer(index)}
                    >
                      <img
                        src={photo.url}
                        alt={photo.fileName || `Photo ${index + 1}`}
                        className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    </button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(index);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {uploading && (
              <p className="text-sm text-muted-foreground">Uploading photos...</p>
            )}
          </div>
        </CardContent>
      </Card>

      <EvidencePhotoViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        photos={existingPhotos}
        initialIndex={viewerInitialIndex}
      />
    </>
  );
};
