import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface ApprovalStatusProps {
  ticketId: number;
  onUpdate?: () => void;
}

export const ApprovalStatus = ({ ticketId, onUpdate }: ApprovalStatusProps) => {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: approvalRequest, refetch } = useQuery({
    queryKey: ["approval_request", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_requests")
        .select("*")
        .eq("ticket_id", ticketId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: ticketData } = useQuery({
    queryKey: ["ticket_details", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase.from("ticket").select("*").eq("id", ticketId).maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: companyData } = useQuery({
    queryKey: ["company_details", ticketData?.company_id],
    queryFn: async () => {
      if (!ticketData?.company_id) return null;

      const { data: company, error: companyError } = await supabase
        .from("Company")
        .select("*")
        .eq("id", ticketData.company_id)
        .maybeSingle();

      if (companyError) throw companyError;

      if (company?.address_id) {
        const { data: address, error: addressError } = await supabase
          .from("Company_address")
          .select("*")
          .eq("id", company.address_id)
          .maybeSingle();

        if (addressError) throw addressError;
        return { ...company, address };
      }

      return company;
    },
    enabled: !!ticketData?.company_id,
  });

  const { data: approvalActions } = useQuery({
    queryKey: ["approval_actions", approvalRequest?.id],
    queryFn: async () => {
      if (!approvalRequest) return [];
      const { data, error } = await supabase
        .from("approval_actions")
        .select("*")
        .eq("approval_request_id", approvalRequest.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!approvalRequest,
  });

  const handleApprovalAction = async (
    action: "Approve" | "Reject" | "Request Changes",
    approverRole: "Hedging" | "CFO" | "Management" | "Operations",
  ) => {
    if (!approvalRequest) return;

    setIsSubmitting(true);
    try {
      // Check if this role has already taken an action
      const existingAction = approvalActions?.find((a) => a.approver_role === approverRole && a.action === "Approve");

      if (existingAction) {
        toast.error("This role has already approved this request");
        setIsSubmitting(false);
        return;
      }

      // Record the action
      const { error: actionError } = await supabase.from("approval_actions").insert([
        {
          approval_request_id: approvalRequest.id,
          approver_role: approverRole,
          action,
          comment: comment || null,
        },
      ]);

      if (actionError) throw actionError;

      // Determine new status
      let newStatus = approvalRequest.status;

      if (action === "Reject") {
        newStatus = "Rejected";
      } else if (action === "Approve") {
        // Check if all required approvers have approved
        const approvedRoles = new Set(
          approvalActions?.filter((a) => a.action === "Approve").map((a) => a.approver_role) || [],
        );
        approvedRoles.add(approverRole);

        const allApproved = approvalRequest.required_approvers.every((role) => approvedRoles.has(role));

        if (allApproved) {
          newStatus = "Approved";
        }
      }

      const { error: updateError } = await supabase
        .from("approval_requests")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", approvalRequest.id);

      if (updateError) throw updateError;

      // Update ticket status
      const { error: ticketError } = await supabase.from("ticket").update({ status: newStatus }).eq("id", ticketId);

      if (ticketError) throw ticketError;

      toast.success(`Ticket ${action.toLowerCase()}d successfully`);
      setComment("");
      refetch();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to process approval action");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!approvalRequest) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        No Approval Required
      </Badge>
    );
  }

  const approvedRoles = new Set(
    approvalActions?.filter((a) => a.action === "Approve").map((a) => a.approver_role) || [],
  );
  const pendingRoles = approvalRequest.required_approvers.filter((role) => !approvedRoles.has(role));

  const statusVariant =
    approvalRequest.status === "Approved"
      ? "default"
      : approvalRequest.status === "Rejected"
        ? "destructive"
        : "secondary";

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Approval Workflow</CardTitle>
          <Badge variant={statusVariant}>
            {approvalRequest.status === "Approved" && <CheckCircle className="h-3 w-3 mr-1" />}
            {approvalRequest.status === "Rejected" && <XCircle className="h-3 w-3 mr-1" />}
            {approvalRequest.status === "Pending Approval" && <AlertCircle className="h-3 w-3 mr-1" />}
            {approvalRequest.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Rules Triggered:</p>
          <p className="font-medium">{approvalRequest.rule_triggered}</p>
        </div>

        {/* Context-Specific Ticket Information */}
        {ticketData && approvalRequest && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Relevant Information:</p>

            {/* Always show Company Details first if company exists */}
            {companyData && (
              <div className="space-y-3 bg-muted/30 p-4 rounded-lg mb-4">
                <h4 className="font-semibold text-sm">Company Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <span className="text-muted-foreground">Company Name:</span>
                    <p className="font-medium">{companyData.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">KYB Status:</span>
                    <p className="font-medium">
                      <Badge variant={companyData.kyb_status === "Approved" ? "default" : "destructive"}>
                        {companyData.kyb_status || "Not Set"}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">KYB Effective Date:</span>
                    <p className="font-medium">
                      {companyData.kyb_effective_date
                        ? new Date(companyData.kyb_effective_date).toLocaleDateString()
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Risk Rating:</span>
                    <p className="font-medium">{companyData.risk_rating || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Credit Limit:</span>
                    <p className="font-medium">
                      {companyData.credit_limit ? `$${companyData.credit_limit.toLocaleString()}` : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Overdues:</span>
                    <p className="font-medium">
                      {companyData.amount_overdue ? `$${companyData.amount_overdue.toLocaleString()}` : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Trader Relationship Owner:</span>
                    <p className="font-medium">{companyData.trader_relationship_owner || "-"}</p>
                  </div>
                </div>

                {(companyData as any).address && (
                  <>
                    <h4 className="font-semibold text-sm pt-3 border-t">Company Address</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Address:</span>
                        <p className="font-medium">{(companyData as any).address.line1 || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">City:</span>
                        <p className="font-medium">{(companyData as any).address.city || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Region:</span>
                        <p className="font-medium">{(companyData as any).address.region || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Country:</span>
                        <p className="font-medium">{(companyData as any).address.country || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Postal Code:</span>
                        <p className="font-medium">{(companyData as any).address.post_code || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">TAX ID:</span>
                        <p className="font-medium">{(companyData as any).address.VAT_id || "-"}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Non-standard pricing: Show Financial Terms + Type/Transaction Type */}
            {approvalRequest.rule_triggered.toLowerCase().includes("non-standard pricing") && (
              <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                <h4 className="font-semibold text-sm">Ticket Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm mb-3 pb-3 border-b">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium">{ticketData.type || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Transaction Type:</span>
                    <p className="font-medium">{ticketData.transaction_type || "-"}</p>
                  </div>
                </div>
                <h4 className="font-semibold text-sm">Financial Terms</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Payment Terms:</span>
                    <p className="font-medium">{ticketData.payment_terms || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment Trigger Event:</span>
                    <p className="font-medium">{ticketData.payment_trigger_event || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment Trigger Timing:</span>
                    <p className="font-medium">{ticketData.payment_trigger_timing || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment Offset Days:</span>
                    <p className="font-medium">{ticketData.payment_offset_days || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Down Payment:</span>
                    <p className="font-medium">
                      {ticketData.down_payment_amount_percent != null
                        ? `${(ticketData.down_payment_amount_percent * 100).toFixed(1)}%`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Down Payment Trigger:</span>
                    <p className="font-medium">{ticketData.downpayment_trigger || "-"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Hedge: Show Complete Pricing Section + Type/Transaction Type */}
            {approvalRequest.rule_triggered.toLowerCase().includes("hedge") && (
              <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                <h4 className="font-semibold text-sm">Ticket Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm mb-3 pb-3 border-b">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium">{ticketData.type || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Transaction Type:</span>
                    <p className="font-medium">{ticketData.transaction_type || "-"}</p>
                  </div>
                </div>
                <h4 className="font-semibold text-sm">Pricing Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Currency:</span>
                    <p className="font-medium">{ticketData.currency || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pricing Type:</span>
                    <p className="font-medium">{ticketData.pricing_type || "-"}</p>
                  </div>

                  {/* Fixed Pricing Fields */}
                  {ticketData.pricing_type === "Fixed" && (
                    <div>
                      <span className="text-muted-foreground">Signed Price:</span>
                      <p className="font-medium">{ticketData.signed_price || "-"}</p>
                    </div>
                  )}

                  {/* Formula Pricing Fields */}
                  {ticketData.pricing_type === "Formula" && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Basis:</span>
                        <p className="font-medium">{ticketData.basis || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Payable %:</span>
                        <p className="font-medium">
                          {ticketData.payable_percent ? `${(ticketData.payable_percent * 100).toFixed(2)}%` : "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">LME Action Needed:</span>
                        <p className="font-medium">
                          {ticketData.lme_action_needed === true || ticketData.lme_action_needed === (1 as any)
                            ? "Yes"
                            : ticketData.lme_action_needed === false || ticketData.lme_action_needed === (0 as any)
                              ? "No"
                              : "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pricing Option:</span>
                        <p className="font-medium">{ticketData.pricing_option || "-"}</p>
                      </div>
                    </>
                  )}

                  {/* Index Pricing Fields */}
                  {ticketData.pricing_type === "Index" && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Basis:</span>
                        <p className="font-medium">{ticketData.basis || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Premium/Discount:</span>
                        <p className="font-medium">{ticketData.premium_discount || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pricing Option:</span>
                        <p className="font-medium">{ticketData.pricing_option || "-"}</p>
                      </div>
                    </>
                  )}

                  {/* Common Fields for Formula and Index */}
                  {(ticketData.pricing_type === "Formula" || ticketData.pricing_type === "Index") && (
                    <>
                      <div>
                        <span className="text-muted-foreground">QP Start:</span>
                        <p className="font-medium">
                          {ticketData.qp_start ? new Date(ticketData.qp_start).toLocaleDateString() : "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">QP End:</span>
                        <p className="font-medium">
                          {ticketData.qp_end ? new Date(ticketData.qp_end).toLocaleDateString() : "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">LME Price:</span>
                        <p className="font-medium">{ticketData.lme_price || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fixation Method:</span>
                        <p className="font-medium">{ticketData.fixation_method || "-"}</p>
                      </div>
                      {ticketData.fixation_method === "Custom" && ticketData.fixation_custom && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Fixation Custom:</span>
                          <p className="font-medium">{ticketData.fixation_custom}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Price Fixation Date:</span>
                        <p className="font-medium">
                          {ticketData.price_fixation_date
                            ? new Date(ticketData.price_fixation_date).toLocaleDateString()
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Reference Price Source:</span>
                        <p className="font-medium">{ticketData.reference_price_source || "-"}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {approvalActions && approvalActions.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Audit Trail:</p>
            <div className="space-y-2">
              {approvalActions.map((action) => (
                <div key={action.id} className="text-sm border-l-2 pl-3 py-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {action.approver_role}
                    </Badge>
                    <span className="font-medium">{action.action}</span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(action.created_at).toLocaleString()}
                    </span>
                  </div>
                  {action.comment && <p className="text-muted-foreground mt-1">{action.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {approvalRequest.status === "Pending Approval" && pendingRoles.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium">
              Pending approval from:
              <span className="ml-2">
                {pendingRoles.map((role, idx) => (
                  <Badge key={idx} variant="secondary" className="ml-1">
                    {role}
                  </Badge>
                ))}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Select your role and take action below:</p>

            {/* Action buttons for each pending role */}
            <div className="space-y-3">
              {pendingRoles.map((role) => {
                // Get the specific rule for this approver
                const allRules = approvalRequest.rule_triggered.split(" + ").map((r: string) => r.trim());
                const approverRuleMap: Record<string, string[]> = {
                  "Hedging": ["Non-standard pricing detected", "Deal requires hedge"],
                  "CFO": ["Non-standard pricing detected", "Deal requires hedge"],
                  "Operations": ["Counterparty KYB not approved"],
                };
                const relevantRules = allRules.filter((rule: string) => 
                  approverRuleMap[role]?.includes(rule)
                );
                
                return (
                  <div key={role} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="outline" className="mb-1">{role}</Badge>
                        {relevantRules.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">Rule triggered:</span> {relevantRules.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <Textarea
                      placeholder={`Add a comment as ${role} (optional)`}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprovalAction("Approve", role)}
                        disabled={isSubmitting}
                        size="sm"
                        className="flex-1"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleApprovalAction("Request Changes", role)}
                        disabled={isSubmitting}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        Request Changes
                      </Button>
                      <Button
                        onClick={() => handleApprovalAction("Reject", role)}
                        disabled={isSubmitting}
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

    </Card>
  );
};
