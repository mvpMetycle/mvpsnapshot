import { useState } from "react";
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
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  DollarSign,
  CreditCard,
  Building2,
  Package,
  Settings,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  RULE_CATEGORIES,
  OPERATOR_LABELS,
  type RuleCategory,
  type FieldOperator,
  type FieldDefinition,
} from "@/lib/approvalRuleFields";

interface CreateApprovalRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ConditionRule {
  field: string;
  operator: FieldOperator;
  value?: string | number;
  values?: string[];
}

const ICON_MAP = {
  DollarSign,
  CreditCard,
  Building2,
  Package,
  Settings,
};

const AVAILABLE_APPROVERS = ["Hedging", "CFO", "Operations", "Management"];

export const CreateApprovalRuleDialog = ({
  open,
  onOpenChange,
}: CreateApprovalRuleDialogProps) => {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<RuleCategory | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [conditions, setConditions] = useState<ConditionRule[]>([
    { field: "", operator: "equals" },
  ]);
  const [logic, setLogic] = useState<"AND" | "OR">("AND");
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const categoryConfig = selectedCategory
    ? RULE_CATEGORIES.find((c) => c.id === selectedCategory)
    : null;

  const createRuleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("approval_rules").insert({
        name: ruleName,
        description: ruleDescription || null,
        conditions: {
          logic,
          rules: conditions.map((c) => ({
            field: c.field,
            operator: c.operator,
            ...(c.operator === "in" || c.operator === "not_in" || c.operator === "is_one_of"
              ? { values: c.values }
              : { value: c.value }),
          })),
        },
        required_approvers: selectedApprovers,
        is_enabled: true,
        priority: 100,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
      toast.success("Approval rule created successfully");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to create rule: ${error.message}`);
    },
  });

  const resetForm = () => {
    setStep(1);
    setSelectedCategory(null);
    setRuleName("");
    setRuleDescription("");
    setConditions([{ field: "", operator: "equals" }]);
    setLogic("AND");
    setSelectedApprovers([]);
  };

  const addCondition = () => {
    setConditions([...conditions, { field: "", operator: "equals" }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (
    index: number,
    updates: Partial<ConditionRule>
  ) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  const toggleApprover = (approver: string) => {
    setSelectedApprovers((prev) =>
      prev.includes(approver)
        ? prev.filter((a) => a !== approver)
        : [...prev, approver]
    );
  };

  const getFieldDefinition = (fieldName: string): FieldDefinition | undefined => {
    return categoryConfig?.fields.find((f) => f.name === fieldName);
  };

  const canProceedToStep2 = selectedCategory !== null;
  const canProceedToStep3 =
    ruleName.trim() !== "" &&
    conditions.every((c) => c.field !== "" && (c.value !== undefined || c.values !== undefined));
  const canSubmit = selectedApprovers.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error("Please select at least one approver");
      return;
    }
    createRuleMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Create New Approval Rule - Step {step} of 3
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Choose Category */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a category that best describes your approval rule
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {RULE_CATEGORIES.map((category) => {
                const Icon = ICON_MAP[category.icon as keyof typeof ICON_MAP];
                return (
                  <Card
                    key={category.id}
                    className={`p-4 cursor-pointer transition-all hover:border-primary ${
                      selectedCategory === category.id
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{category.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Configure Conditions */}
        {step === 2 && categoryConfig && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ruleName">Rule Name *</Label>
              <Input
                id="ruleName"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g., High value trades require CFO approval"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruleDescription">Description</Label>
              <Textarea
                id="ruleDescription"
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                placeholder="Describe when this rule should trigger"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conditions</Label>
                <Select value={logic} onValueChange={(v) => setLogic(v as "AND" | "OR")}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {conditions.map((condition, index) => {
                  const fieldDef = getFieldDefinition(condition.field);
                  const isMultiValue =
                    condition.operator === "in" ||
                    condition.operator === "not_in" ||
                    condition.operator === "is_one_of";

                  return (
                    <Card key={index} className="p-3">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          {/* Field Selector */}
                          <Select
                            value={condition.field}
                            onValueChange={(value) =>
                              updateCondition(index, {
                                field: value,
                                value: undefined,
                                values: undefined,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {categoryConfig.fields.map((field) => (
                                <SelectItem key={field.name} value={field.name}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Operator Selector */}
                          <Select
                            value={condition.operator}
                            onValueChange={(value) =>
                              updateCondition(index, {
                                operator: value as FieldOperator,
                                value: undefined,
                                values: undefined,
                              })
                            }
                            disabled={!condition.field}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Operator" />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldDef?.operators.map((op) => (
                                <SelectItem key={op} value={op}>
                                  {OPERATOR_LABELS[op]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Value Input */}
                          {fieldDef?.type === "enum" && !isMultiValue && (
                            <Select
                              value={condition.value as string}
                              onValueChange={(value) =>
                                updateCondition(index, { value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select value" />
                              </SelectTrigger>
                              <SelectContent>
                                {fieldDef.enumValues?.map((val) => (
                                  <SelectItem key={val} value={val}>
                                    {val}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {fieldDef?.type === "enum" && isMultiValue && (
                            <div className="col-span-1">
                              <Select
                                onValueChange={(value) => {
                                  const currentValues = condition.values || [];
                                  if (!currentValues.includes(value)) {
                                    updateCondition(index, {
                                      values: [...currentValues, value],
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Add values" />
                                </SelectTrigger>
                                <SelectContent>
                                  {fieldDef.enumValues?.map((val) => (
                                    <SelectItem key={val} value={val}>
                                      {val}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {condition.values && condition.values.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {condition.values.map((val) => (
                                    <Badge
                                      key={val}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {val}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-3 w-3 p-0 ml-1"
                                        onClick={() =>
                                          updateCondition(index, {
                                            values: condition.values?.filter(
                                              (v) => v !== val
                                            ),
                                          })
                                        }
                                      >
                                        <X className="h-2 w-2" />
                                      </Button>
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {fieldDef?.type === "number" && (
                            <Input
                              type="number"
                              value={condition.value || ""}
                              onChange={(e) =>
                                updateCondition(index, {
                                  value: parseFloat(e.target.value),
                                })
                              }
                              placeholder="Enter number"
                            />
                          )}

                          {fieldDef?.type === "text" && (
                            <Input
                              value={condition.value || ""}
                              onChange={(e) =>
                                updateCondition(index, { value: e.target.value })
                              }
                              placeholder="Enter value"
                            />
                          )}
                        </div>

                        {conditions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCondition(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCondition}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Condition
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Select Approvers & Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Required Approvers *</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedApprovers.map((approver) => (
                  <Badge key={approver} variant="secondary" className="pl-2 pr-1">
                    {approver}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                      onClick={() =>
                        setSelectedApprovers((prev) =>
                          prev.filter((a) => a !== approver)
                        )
                      }
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_APPROVERS.filter(
                  (a) => !selectedApprovers.includes(a)
                ).map((approver) => (
                  <Button
                    key={approver}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleApprover(approver)}
                  >
                    + {approver}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-muted/30">
              <h3 className="font-semibold mb-3">Rule Summary</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-medium">{ruleName}</span>
                </div>
                {ruleDescription && (
                  <div>
                    <span className="text-muted-foreground">Description:</span>{" "}
                    {ruleDescription}
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Category:</span>{" "}
                  {categoryConfig?.label}
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Conditions ({logic}):
                  </span>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    {conditions.map((c, i) => {
                      const fieldDef = getFieldDefinition(c.field);
                      return (
                        <li key={i}>
                          {fieldDef?.label} {OPERATOR_LABELS[c.operator]}{" "}
                          {c.values ? c.values.join(", ") : c.value}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div>
                  <span className="text-muted-foreground">Approvers:</span>{" "}
                  {selectedApprovers.join(", ") || "None selected"}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            {step < 3 && (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !canProceedToStep2) ||
                  (step === 2 && !canProceedToStep3)
                }
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {step === 3 && (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || createRuleMutation.isPending}
              >
                {createRuleMutation.isPending ? "Creating..." : "Create Rule"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
