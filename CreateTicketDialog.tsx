import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TicketCreationForm } from "./TicketCreationForm";

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateTicketDialog = ({ open, onOpenChange }: CreateTicketDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Trade Ticket</DialogTitle>
        </DialogHeader>
        <TicketCreationForm onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
};
