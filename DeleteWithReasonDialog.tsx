import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteWithReasonDialogProps {
  entityLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  isDeleting?: boolean;
}

export const DeleteWithReasonDialog = ({
  entityLabel,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
}: DeleteWithReasonDialogProps) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const isValid = reason.trim().length >= 5;

  const handleConfirm = async () => {
    if (!isValid) {
      setError("Please provide a reason (at least 5 characters)");
      return;
    }
    setError("");
    await onConfirm(reason.trim());
    setReason("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
      setError("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {entityLabel}
          </DialogTitle>
          <DialogDescription>
            Please provide a reason for deleting this {entityLabel.toLowerCase()}. 
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="delete-reason">
              Reason for deletion <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="delete-reason"
              placeholder="Describe why this item is being deleted…"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim().length >= 5) {
                  setError("");
                }
              }}
              className={error ? "border-destructive" : ""}
              rows={3}
              disabled={isDeleting}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
