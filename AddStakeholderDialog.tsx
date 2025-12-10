import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface AddStakeholderDialogProps {
  approvalRequestId: string;
  currentApprovers: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_APPROVERS = ["Hedging", "CFO", "Operations", "Management"];

export const AddStakeholderDialog = ({
  approvalRequestId,
  currentApprovers,
  open,
  onOpenChange,
}: AddStakeholderDialogProps) => {
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const addStakeholdersMutation = useMutation({
    mutationFn: async () => {
      const newApprovers = [...currentApprovers, ...selectedApprovers] as ("Hedging" | "CFO" | "Operations" | "Management")[];
      
      const { error } = await supabase
        .from("approval_requests")
        .update({
          required_approvers: newApprovers,
          updated_at: new Date().toISOString(),
        })
        .eq("id", approvalRequestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval_request"] });
      queryClient.invalidateQueries({ queryKey: ["all_approval_requests"] });
      toast.success("Stakeholders added successfully");
      setSelectedApprovers([]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to add stakeholders: ${error.message}`);
    },
  });

  const toggleApprover = (approver: string) => {
    setSelectedApprovers((prev) =>
      prev.includes(approver)
        ? prev.filter((a) => a !== approver)
        : [...prev, approver]
    );
  };

  const handleSubmit = () => {
    if (selectedApprovers.length === 0) {
      toast.error("Please select at least one approver to add");
      return;
    }
    addStakeholdersMutation.mutate();
  };

  const availableToAdd = AVAILABLE_APPROVERS.filter(
    (a) => !currentApprovers.includes(a)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Stakeholders</DialogTitle>
          <DialogDescription>
            Add additional approvers to this approval request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Current Approvers:</p>
            <div className="flex flex-wrap gap-2">
              {currentApprovers.map((approver) => (
                <Badge key={approver} variant="secondary">
                  {approver}
                </Badge>
              ))}
            </div>
          </div>

          {availableToAdd.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Add Approvers:</p>
              <div className="flex flex-wrap gap-2">
                {availableToAdd.map((approver) => (
                  <Button
                    key={approver}
                    type="button"
                    variant={selectedApprovers.includes(approver) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleApprover(approver)}
                  >
                    {selectedApprovers.includes(approver) ? "✓ " : "+ "}
                    {approver}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              All available approvers are already assigned to this request.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedApprovers.length === 0 || addStakeholdersMutation.isPending}
          >
            {addStakeholdersMutation.isPending ? "Adding..." : "Add Stakeholders"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
