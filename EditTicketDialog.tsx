import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TicketCreationForm } from "./TicketCreationForm";
import { TicketEvidenceSection, EvidencePhoto } from "./TicketEvidenceSection";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";

interface EditTicketDialogProps {
  ticketId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditTicketDialog = ({ ticketId, open, onOpenChange }: EditTicketDialogProps) => {
  const queryClient = useQueryClient();
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);

  // Fetch existing photos for this ticket
  const { data: fetchedPhotos } = useQuery({
    queryKey: ["ticket-photos", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("ticket_photos")
        .select("id, file_path, file_name")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!ticketId && open,
  });

  // Convert fetched photos to EvidencePhoto format
  useEffect(() => {
    if (fetchedPhotos) {
      const evidencePhotos: EvidencePhoto[] = fetchedPhotos.map((photo) => ({
        id: photo.id,
        url: `https://tbwkhqvrqhagoswehrkx.supabase.co/storage/v1/object/public/ticket-photos/${photo.file_path}`,
        fileName: photo.file_name,
        filePath: photo.file_path,
      }));
      setPhotos(evidencePhotos);
    }
  }, [fetchedPhotos]);

  const handlePhotosChange = (updatedPhotos: EvidencePhoto[]) => {
    setPhotos(updatedPhotos);
    // Invalidate queries to keep data in sync
    queryClient.invalidateQueries({ queryKey: ["ticket-photos", ticketId] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Ticket #{ticketId}</DialogTitle>
        </DialogHeader>
        
        {ticketId && (
          <div className="space-y-6">
            {/* Photo Attachments Section - Using shared component */}
            <TicketEvidenceSection
              ticketId={ticketId}
              existingPhotos={photos}
              onPhotosChange={handlePhotosChange}
            />

            <Separator />

            {/* Ticket Form */}
            <TicketCreationForm 
              onSuccess={() => onOpenChange(false)} 
              ticketId={ticketId}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
