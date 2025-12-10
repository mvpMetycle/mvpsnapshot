import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CheckCircle, XCircle, AlertCircle, Clock, Filter, Settings, ChevronDown, ChevronRight, User } from "lucide-react";
import { ApprovalStatus } from "./ApprovalStatus";
import { ApprovalRulesSettings } from "./ApprovalRulesSettings";

// Map rules to specific approvers
const RULE_TO_APPROVER_MAP: Record<string, string[]> = {
  "Non-standard pricing detected": ["Hedging", "CFO"],
  "Deal requires hedge": ["Hedging", "CFO"],
  "Counterparty KYB not approved": ["Operations"],
};

// Parse rule_triggered string into per-approver rules
const parseRulesPerApprover = (ruleTriggered: string): Record<string, string[]> => {
  const rules = ruleTriggered.split(" + ").map(r => r.trim());
  const approverRules: Record<string, string[]> = {};
  
  rules.forEach(rule => {
    const approvers = RULE_TO_APPROVER_MAP[rule] || [];
    approvers.forEach(approver => {
      if (!approverRules[approver]) {
        approverRules[approver] = [];
      }
      approverRules[approver].push(rule);
    });
  });
  
  return approverRules;
};

interface ApprovalCardProps {
  request: any;
  isExpanded: boolean;
  onToggle: () => void;
  onRefetch: () => void;
}

const ApprovalCard = ({ request, isExpanded, onToggle, onRefetch }: ApprovalCardProps) => {
  const approverRules = parseRulesPerApprover(request.rule_triggered);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Rejected":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "Pending Approval":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "Rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "Pending Approval":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Card className="border-border overflow-hidden">
      <div 
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <CardTitle className="text-base font-semibold">
                  Ticket #{request.ticket?.id || request.ticket_id}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {request.ticket?.client_name || "Unknown Counterparty"}
                </p>
              </div>
            </div>
            <Badge className={`${getStatusBadgeClass(request.status)} flex items-center gap-1`}>
              {getStatusIcon(request.status)}
              {request.status}
            </Badge>
          </div>
          
          {/* Summary row */}
          <div className="flex flex-wrap gap-2 mt-3 ml-8">
            <Badge variant="outline" className="text-xs">
              {request.ticket?.type || "N/A"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {request.ticket?.commodity_type || "N/A"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {request.ticket?.quantity ? `${request.ticket.quantity} MT` : "N/A"}
            </Badge>
          </div>
          
          {/* Required approvers preview with rules */}
          <div className="mt-3 ml-8 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Required Approvers:</p>
            <div className="flex flex-wrap gap-2">
              {request.required_approvers.map((approver: string, idx: number) => (
                <div key={idx} className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    {approver}
                  </Badge>
                  {approverRules[approver] && (
                    <span className="text-xs text-muted-foreground italic">
                      — {approverRules[approver].join(", ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground ml-8 mt-2">
            Created: {new Date(request.created_at).toLocaleDateString()}
          </p>
        </CardHeader>
      </div>
      
      {/* Expanded content - stays open until user closes it */}
      {isExpanded && (
        <CardContent className="pt-0 border-t">
          <ApprovalStatus 
            ticketId={request.ticket_id}
            onUpdate={() => {
              // Only refetch data, do NOT close the card
              onRefetch();
            }}
          />
        </CardContent>
      )}
    </Card>
  );
};

export const ApprovalsList = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [ruleFilter, setRuleFilter] = useState<string>("all");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [completedSectionOpen, setCompletedSectionOpen] = useState(false);

  const { data: approvalRequests, isLoading, refetch } = useQuery({
    queryKey: ["all_approval_requests", statusFilter, roleFilter, ruleFilter],
    queryFn: async () => {
      let query = supabase
        .from("approval_requests")
        .select(`
          *,
          ticket:ticket_id (
            id,
            type,
            client_name,
            commodity_type,
            quantity,
            pricing_type,
            company_id
          )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data;

      // Filter by role if specified
      if (roleFilter !== "all") {
        filtered = filtered.filter((req: any) => 
          req.required_approvers.includes(roleFilter)
        );
      }

      // Filter by rule if specified
      if (ruleFilter !== "all") {
        filtered = filtered.filter((req: any) => 
          req.rule_triggered.toLowerCase().includes(ruleFilter.toLowerCase())
        );
      }

      return filtered;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["approval_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_requests")
        .select("status");

      if (error) throw error;

      const pending = data.filter((r) => r.status === "Pending Approval").length;
      const approved = data.filter((r) => r.status === "Approved").length;
      const rejected = data.filter((r) => r.status === "Rejected").length;

      return { pending, approved, rejected, total: data.length };
    },
  });

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  // Split approvals into pending and completed
  const pendingApprovals = approvalRequests?.filter((r: any) => r.status === "Pending Approval") || [];
  const completedApprovals = approvalRequests?.filter((r: any) => r.status !== "Pending Approval") || [];

  if (isLoading) {
    return <div className="text-muted-foreground">Loading approvals...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Approval Workflows</h2>
        <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Configure Rules
        </Button>
      </div>

      {/* Stats Cards - Compact Design */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-baseline justify-between">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-xl font-bold">{stats?.total || 0}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-baseline justify-between">
              <div className="text-xs text-muted-foreground">Pending</div>
              <div className="text-xl font-bold text-orange-600">{stats?.pending || 0}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-baseline justify-between">
              <div className="text-xs text-muted-foreground">Approved</div>
              <div className="text-xl font-bold text-green-600">{stats?.approved || 0}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-baseline justify-between">
              <div className="text-xs text-muted-foreground">Rejected</div>
              <div className="text-xl font-bold text-red-600">{stats?.rejected || 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[150px]">
            <label className="text-sm text-muted-foreground mb-2 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="text-sm text-muted-foreground mb-2 block">Approver Role</label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Hedging">Hedging</SelectItem>
                <SelectItem value="CFO">CFO</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="text-sm text-muted-foreground mb-2 block">Rule Triggered</label>
            <Select value={ruleFilter} onValueChange={setRuleFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rules</SelectItem>
                <SelectItem value="Deal requires hedge">Deal requires hedge</SelectItem>
                <SelectItem value="Non-standard pricing">Non-standard pricing</SelectItem>
                <SelectItem value="Counterparty KYB not approved">KYB not approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter("all");
                setRoleFilter("all");
                setRuleFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SECTION A: Pending Approvals */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-semibold">Pending Approvals</h3>
          <Badge variant="secondary" className="ml-2">
            {pendingApprovals.length}
          </Badge>
        </div>
        
        {pendingApprovals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              No pending approvals at this time.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingApprovals.map((request: any) => (
              <ApprovalCard
                key={request.id}
                request={request}
                isExpanded={expandedCards.has(request.id)}
                onToggle={() => toggleCard(request.id)}
                onRefetch={refetch}
              />
            ))}
          </div>
        )}
      </div>

      {/* SECTION B: Completed Approvals (Collapsible) */}
      <Collapsible open={completedSectionOpen} onOpenChange={setCompletedSectionOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            {completedSectionOpen ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Completed Approvals</h3>
            <Badge variant="secondary" className="ml-2">
              {completedApprovals.length}
            </Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-3">
          {completedApprovals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                No completed approvals yet.
              </CardContent>
            </Card>
          ) : (
            completedApprovals.map((request: any) => (
              <ApprovalCard
                key={request.id}
                request={request}
                isExpanded={expandedCards.has(request.id)}
                onToggle={() => toggleCard(request.id)}
                onRefetch={refetch}
              />
            ))
          )}
        </CollapsibleContent>
      </Collapsible>

      <ApprovalRulesSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};
