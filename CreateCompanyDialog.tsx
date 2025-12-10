import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CompanyCreationForm } from "./CompanyCreationForm";

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateCompanyDialog = ({ open, onOpenChange, onSuccess }: CreateCompanyDialogProps) => {
  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Create New Company</DialogTitle>
        </DialogHeader>
        <CompanyCreationForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
};
