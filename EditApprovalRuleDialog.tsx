import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X } from "lucide-react";

interface ApprovalRule {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  priority: number;
  conditions: any;
  required_approvers: string[];
  created_at: string;
  updated_at: string;
}

interface EditApprovalRuleDialogProps {
  rule: ApprovalRule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_APPROVERS = ["Hedging", "CFO", "Operations", "Management"];

export const EditApprovalRuleDialog = ({
  rule,
  open,
  onOpenChange,
}: EditApprovalRuleDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setDescription(rule.description || "");
      setSelectedApprovers(rule.required_approvers);
    }
  }, [rule]);

  const updateRuleMutation = useMutation({
    mutationFn: async () => {
      if (!rule) return;

      const { error } = await supabase
        .from("approval_rules")
        .update({
          name,
          description: description || null,
          required_approvers: selectedApprovers,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rule.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
      toast.success("Rule updated successfully");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });

  const toggleApprover = (approver: string) => {
    setSelectedApprovers((prev) =>
      prev.includes(approver)
        ? prev.filter((a) => a !== approver)
        : [...prev, approver]
    );
  };

  const removeApprover = (approver: string) => {
    setSelectedApprovers((prev) => prev.filter((a) => a !== approver));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedApprovers.length === 0) {
      toast.error("Please select at least one approver");
      return;
    }
    updateRuleMutation.mutate();
  };

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Approval Rule</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter rule name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when this rule should trigger"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Required Approvers</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedApprovers.map((approver) => (
                <Badge key={approver} variant="secondary" className="pl-2 pr-1">
                  {approver}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                    onClick={() => removeApprover(approver)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_APPROVERS.filter((a) => !selectedApprovers.includes(a)).map(
                (approver) => (
                  <Button
                    key={approver}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleApprover(approver)}
                  >
                    + {approver}
                  </Button>
                )
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateRuleMutation.isPending}>
              {updateRuleMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
