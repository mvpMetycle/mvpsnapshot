import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { seedApprovalRules } from "@/lib/seedApprovalRules";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Edit, Trash2, Plus } from "lucide-react";
import { EditApprovalRuleDialog } from "./EditApprovalRuleDialog";
import { CreateApprovalRuleDialog } from "./CreateApprovalRuleDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface ApprovalRulesSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ApprovalRulesSettings = ({
  open,
  onOpenChange,
}: ApprovalRulesSettingsProps) => {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Seed rules on first open
  useEffect(() => {
    if (open) {
      seedApprovalRules().then((result) => {
        if (result.success && !result.alreadySeeded) {
          queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
        }
      });
    }
  }, [open, queryClient]);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["approval-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_rules")
        .select("*")
        .order("priority");

      if (error) throw error;
      return data as ApprovalRule[];
    },
    enabled: open,
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from("approval_rules")
        .update({ is_enabled, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
      toast.success("Rule updated successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("approval_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
      toast.success("Rule deleted successfully");
      setDeletingRuleId(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to delete rule: ${error.message}`);
    },
  });

  const toggleExpanded = (ruleId: string) => {
    setExpandedRules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ruleId)) {
        newSet.delete(ruleId);
      } else {
        newSet.add(ruleId);
      }
      return newSet;
    });
  };

  const renderConditions = (conditions: any) => {
    if (!conditions || !conditions.rules) return null;

    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Conditions ({conditions.logic}):</p>
        <ul className="list-disc list-inside space-y-1">
          {conditions.rules.map((rule: any, index: number) => (
            <li key={index}>
              <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                {rule.field}
              </span>{" "}
              {rule.operator}{" "}
              {rule.values ? JSON.stringify(rule.values) : rule.value}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Approval Rules Settings</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading rules...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rules?.map((rule) => (
              <Card key={rule.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Switch
                      checked={rule.is_enabled}
                      onCheckedChange={(checked) =>
                        toggleRuleMutation.mutate({ id: rule.id, is_enabled: checked })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{rule.name}</h3>
                        {!rule.is_enabled && (
                          <Badge variant="outline" className="text-xs">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground">
                          {rule.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Requires: </span>
                          {rule.required_approvers.map((approver, index) => (
                            <Badge key={index} variant="secondary" className="ml-1">
                              {approver}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {expandedRules.has(rule.id) && (
                        <>
                          <Separator className="my-3" />
                          {renderConditions(rule.conditions)}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingRule(rule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingRuleId(rule.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(rule.id)}
                    >
                      {expandedRules.has(rule.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Rule
            </Button>
          </div>
        )}
      </DialogContent>

      <EditApprovalRuleDialog
        rule={editingRule}
        open={editingRule !== null}
        onOpenChange={(open) => !open && setEditingRule(null)}
      />

      <CreateApprovalRuleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <AlertDialog open={deletingRuleId !== null} onOpenChange={(open) => !open && setDeletingRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Approval Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this approval rule? This action cannot be undone.
              Any tickets currently pending approval under this rule will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRuleId && deleteRuleMutation.mutate(deletingRuleId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
