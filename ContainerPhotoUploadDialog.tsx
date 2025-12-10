import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, X, Image, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ContainerPhotoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blOrderId: number;
  containerId: number;
  containerNumber: string;
}

export const ContainerPhotoUploadDialog: React.FC<ContainerPhotoUploadDialogProps> = ({
  open,
  onOpenChange,
  blOrderId,
  containerId,
  containerNumber,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      setFiles(prev => [...prev, ...Array.from(selectedFiles)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${blOrderId}/${containerNumber}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('container-photos')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        // Insert record into database
        const { error: dbError } = await supabase
          .from('bl_container_photos')
          .insert({
            bl_order_id: blOrderId,
            container_id: containerId,
            container_number: containerNumber,
            file_path: filePath,
            file_name_original: file.name,
            content_type: file.type,
          });

        if (dbError) {
          console.error('DB error:', dbError);
          // Try to clean up the uploaded file
          await supabase.storage.from('container-photos').remove([filePath]);
          continue;
        }

        successCount++;
      }

      if (successCount > 0) {
        toast.success(`${successCount} photo(s) uploaded successfully`);
        queryClient.invalidateQueries({ queryKey: ['container-photos', blOrderId] });
        setFiles([]);
        onOpenChange(false);
      } else {
        toast.error('Failed to upload photos');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Photos - Container {containerNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Click to select photos or drag and drop
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports JPG, PNG, WEBP
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Selected files */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Image className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{file.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={files.length === 0 || uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              `Upload ${files.length} Photo${files.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
