import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  User,
  Pencil,
  Check,
  X,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  Shield,
  RefreshCw,
  ExternalLink,
  DollarSign,
  BarChart3,
  HandshakeIcon,
  Save,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CompanyDocuments } from "./CompanyDocuments";
import { CreditGauge } from "./CreditGauge";
import { CompanyNotes } from "./CompanyNotes";
import { KYBSearchDialog } from "./KYBSearchDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Constants } from "@/integrations/supabase/types";

type CompanyDetail = {
  id: number;
  name: string;
  kyb_status: string | null;
  kyb_effective_date: string | null;
  credit_limit: number | null;
  trade_credit_limit: number | null;
  current_exposure: number | null;
  amount_overdue: number | null;
  total_MT_signed: number | null;
  total_MT_loaded: number | null;
  total_traded_volume: number | null;
  trader_relationship_owner: string | null;
  risk_rating: string | null;
  payment_terms: string | null;
  aggregated_late_payment_days: number | null;
  detected_profile_id: string | null;
  detected_review_status: string | null;
  detected_risk_category: string | null;
  detected_risk_label: string | null;
  detected_last_checked: string | null;
};

type AddressDetail = {
  line1: string | null;
  post_code: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  is_primary: boolean | null;
  VAT_id: string | null;
  contact_name_1: string | null;
  email_1: string | null;
  phone_1: string | null;
  job_position_1: string | null;
  contact_name_2: string | null;
  email_2: string | null;
  phone_2: string | null;
  job_position_2: string | null;
};

interface CompanyDetailDialogProps {
  companyId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CompanyDetailDialog = ({ companyId, open, onOpenChange }: CompanyDetailDialogProps) => {
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [address, setAddress] = useState<AddressDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingKyb, setIsEditingKyb] = useState(false);
  const [editedKybStatus, setEditedKybStatus] = useState<string | null>(null);
  const [isKybSearchOpen, setIsKybSearchOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedCompany, setEditedCompany] = useState<CompanyDetail | null>(null);
  const [editedAddress, setEditedAddress] = useState<AddressDetail | null>(null);

  useEffect(() => {
    if (open && companyId) {
      fetchCompanyDetails();
    }
  }, [companyId, open]);

  const fetchCompanyDetails = async () => {
    try {
      const { data: companyData, error: companyError } = await supabase
        .from("Company")
        .select("*")
        .eq("id", companyId)
        .single();

      if (companyError) throw companyError;

      const { data: addressData, error: addressError } = await supabase
        .from("Company_address")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_primary", true)
        .single();

      if (addressError && addressError.code !== "PGRST116") throw addressError;

      setCompany(companyData);
      setAddress(addressData);
    } catch (error) {
      console.error("Error fetching company details:", error);
      toast.error("Failed to load company details");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRiskRatingColor = (rating: string | null) => {
    if (!rating) return "secondary";
    const lowerRating = rating.toLowerCase();
    if (lowerRating.includes("low") || lowerRating.includes("a")) return "default";
    if (lowerRating.includes("medium") || lowerRating.includes("b")) return "secondary";
    if (lowerRating.includes("high") || lowerRating.includes("c")) return "destructive";
    return "secondary";
  };

  const getKybStatusVariant = (status: string | null): "success" | "destructive" | "secondary" => {
    switch (status) {
      case "Approved":
        return "success";
      case "Rejected":
        return "destructive";
      case "Needs Review":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const formatLargeNumber = (value: number | null) => {
    if (value === null) return "-";
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K MT`;
    }
    return `${value} MT`;
  };

  const handleEditKybStatus = () => {
    setEditedKybStatus(company?.kyb_status || null);
    setIsEditingKyb(true);
  };

  const handleCancelKybEdit = () => {
    setIsEditingKyb(false);
    setEditedKybStatus(null);
  };

  const handleSaveKybStatus = async () => {
    if (!company) return;

    try {
      const { error } = await supabase
        .from("Company")
        .update({ kyb_status: editedKybStatus as any })
        .eq("id", companyId);

      if (error) throw error;

      setCompany({ ...company, kyb_status: editedKybStatus });
      setIsEditingKyb(false);
      toast.success("KYB status updated successfully");
    } catch (error) {
      console.error("Error updating KYB status:", error);
      toast.error("Failed to update KYB status");
    }
  };

  const handleKybCheckComplete = async () => {
    await fetchCompanyDetails();
  };

  const handleRefreshKybStatus = async () => {
    if (!company?.detected_profile_id) return;

    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("detected-kyb", {
        body: {
          action: "refresh-profile",
          companyId: company.id,
          profileId: company.detected_profile_id,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      await fetchCompanyDetails();
      toast.success("KYB status refreshed successfully");
    } catch (error) {
      console.error("Error refreshing KYB status:", error);
      toast.error("Failed to refresh KYB status");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEditCompany = () => {
    setEditedCompany(company);
    setEditedAddress(address);
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditedCompany(null);
    setEditedAddress(null);
    setIsEditMode(false);
  };

  const handleSaveEdit = async () => {
    if (!editedCompany || !editedAddress) return;

    try {
      // Update company table
      const { error: companyError } = await supabase
        .from("Company")
        .update({
          name: editedCompany.name,
          credit_limit: editedCompany.credit_limit,
          trade_credit_limit: editedCompany.trade_credit_limit,
          payment_terms: editedCompany.payment_terms,
          trader_relationship_owner: editedCompany.trader_relationship_owner as any,
        })
        .eq("id", companyId);

      if (companyError) throw companyError;

      // Update address table
      const { error: addressError } = await supabase
        .from("Company_address")
        .update({
          line1: editedAddress.line1,
          city: editedAddress.city,
          region: editedAddress.region,
          post_code: editedAddress.post_code,
          VAT_id: editedAddress.VAT_id,
          contact_name_1: editedAddress.contact_name_1,
          email_1: editedAddress.email_1,
          job_position_1: editedAddress.job_position_1,
          contact_name_2: editedAddress.contact_name_2,
          email_2: editedAddress.email_2,
          job_position_2: editedAddress.job_position_2,
        })
        .eq("company_id", companyId)
        .eq("is_primary", true);

      if (addressError) throw addressError;

      setCompany(editedCompany);
      setAddress(editedAddress);
      setIsEditMode(false);
      toast.success("Company updated successfully");
    } catch (error) {
      console.error("Error updating company:", error);
      toast.error("Failed to update company");
    }
  };

  const getDetectedStatusColor = (status: string | null) => {
    if (!status) return "secondary";
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes("approved")) return "success";
    if (lowerStatus.includes("processed")) return "secondary";
    if (lowerStatus.includes("needs review") || lowerStatus.includes("incomplete")) return "secondary";
    if (lowerStatus.includes("declined")) return "destructive";
    return "secondary";
  };

  const getDetectedRiskColor = (category: string | null) => {
    if (!category) return "secondary";
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes("low")) return "success";
    if (lowerCategory.includes("medium")) return "secondary";
    if (lowerCategory.includes("high")) return "destructive";
    return "secondary";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : company ? (
          <>
            <DialogHeader className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {isEditMode ? (
                    <Input
                      value={editedCompany?.name || ""}
                      onChange={(e) => setEditedCompany((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                      className="text-3xl font-bold mb-2 h-auto py-2"
                    />
                  ) : (
                    <DialogTitle className="text-3xl font-bold mb-2">{company.name}</DialogTitle>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {address?.country && (
                      <>
                        <MapPin className="h-4 w-4" />
                        <span>{address.country}</span>
                        <span>·</span>
                      </>
                    )}
                    <User className="h-4 w-4" />
                    <span>{company.trader_relationship_owner || "No Owner"}</span>
                    <span>·</span>
                    {company.kyb_status ? (
                      <Badge variant={getKybStatusVariant(company.kyb_status)}>{company.kyb_status}</Badge>
                    ) : (
                      <span className="text-muted-foreground">No KYB Status</span>
                    )}
                  </div>
                </div>
                {isEditMode ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleEditCompany}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Company
                  </Button>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-4 mt-6">
              {/* Company Info Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Company Info</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {address && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Address</Label>
                          {isEditMode ? (
                            <Input
                              value={editedAddress?.line1 || ""}
                              onChange={(e) =>
                                setEditedAddress((prev) => (prev ? { ...prev, line1: e.target.value } : null))
                              }
                            />
                          ) : (
                            <p className="text-sm font-medium">{address.line1 || "-"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Postal Code</Label>
                          {isEditMode ? (
                            <Input
                              value={editedAddress?.post_code || ""}
                              onChange={(e) =>
                                setEditedAddress((prev) => (prev ? { ...prev, post_code: e.target.value } : null))
                              }
                            />
                          ) : (
                            <p className="text-sm font-medium">{address.post_code || "-"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">City</Label>
                          {isEditMode ? (
                            <Input
                              value={editedAddress?.city || ""}
                              onChange={(e) =>
                                setEditedAddress((prev) => (prev ? { ...prev, city: e.target.value } : null))
                              }
                            />
                          ) : (
                            <p className="text-sm font-medium">{address.city || "-"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Region</Label>
                          {isEditMode ? (
                            <Input
                              value={editedAddress?.region || ""}
                              onChange={(e) =>
                                setEditedAddress((prev) => (prev ? { ...prev, region: e.target.value } : null))
                              }
                            />
                          ) : (
                            <p className="text-sm font-medium">{address.region || "-"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">TAX ID</Label>
                          {isEditMode ? (
                            <Input
                              value={editedAddress?.VAT_id || ""}
                              onChange={(e) =>
                                setEditedAddress((prev) => (prev ? { ...prev, VAT_id: e.target.value } : null))
                              }
                            />
                          ) : (
                            <p className="text-sm font-medium">{address.VAT_id || "-"}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* KYB Check Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">KYB Check</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {company.detected_profile_id && (
                        <Button size="sm" variant="outline" onClick={handleRefreshKybStatus} disabled={isRefreshing}>
                          <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
                          Refresh
                        </Button>
                      )}
                      <Button size="sm" onClick={() => setIsKybSearchOpen(true)}>
                        Run KYB Check
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {company.detected_profile_id ? (
                    <div className="space-y-4">
                      {/* Status Timeline */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                              company.detected_profile_id
                                ? "bg-success border-success text-success-foreground"
                                : "bg-muted border-border text-muted-foreground"
                            }`}
                          >
                            {company.detected_profile_id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <span className="text-xs">1</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground text-center">Profile Created</span>
                        </div>
                        <div
                          className={`h-0.5 flex-1 ${company.detected_review_status ? "bg-success" : "bg-border"}`}
                        />
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                              company.detected_review_status &&
                              !["Approved", "Declined"].includes(company.detected_review_status)
                                ? "bg-warning border-warning text-warning-foreground animate-pulse"
                                : company.detected_review_status &&
                                    ["Approved", "Declined"].includes(company.detected_review_status)
                                  ? "bg-success border-success text-success-foreground"
                                  : "bg-muted border-border text-muted-foreground"
                            }`}
                          >
                            {company.detected_review_status &&
                            ["Approved", "Declined"].includes(company.detected_review_status) ? (
                              <Check className="h-4 w-4" />
                            ) : company.detected_review_status ? (
                              <Clock className="h-4 w-4" />
                            ) : (
                              <span className="text-xs">2</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground text-center">In Review</span>
                        </div>
                        <div
                          className={`h-0.5 flex-1 ${
                            company.detected_review_status &&
                            ["Approved", "Declined"].includes(company.detected_review_status)
                              ? company.detected_review_status === "Approved"
                                ? "bg-success"
                                : "bg-destructive"
                              : "bg-border"
                          }`}
                        />
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                              company.detected_review_status === "Approved"
                                ? "bg-success border-success text-success-foreground"
                                : company.detected_review_status === "Declined"
                                  ? "bg-destructive border-destructive text-destructive-foreground"
                                  : "bg-muted border-border text-muted-foreground"
                            }`}
                          >
                            {company.detected_review_status === "Approved" ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : company.detected_review_status === "Declined" ? (
                              <X className="h-4 w-4" />
                            ) : (
                              <span className="text-xs">3</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground text-center">Complete</span>
                        </div>
                      </div>

                      {/* Status Message */}
                      <div className="p-3 rounded-md bg-muted/50 border">
                        {!company.detected_review_status ? (
                          <p className="text-sm text-muted-foreground">
                            ⏳ KYB check initiated - awaiting status from Detected
                          </p>
                        ) : company.detected_review_status === "Approved" ? (
                          <p className="text-sm text-success flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            KYB verification complete - Approved
                          </p>
                        ) : company.detected_review_status === "Declined" ? (
                          <p className="text-sm text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            KYB verification complete - Declined
                          </p>
                        ) : (
                          <p className="text-sm text-warning flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Under review by Detected compliance team
                          </p>
                        )}
                      </div>

                      <a
                        href={`https://app.detected.app/profiles/${company.detected_profile_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View in Detected
                      </a>

                      {company.detected_review_status && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs">Status</Label>
                            <Badge variant={getDetectedStatusColor(company.detected_review_status) as any}>
                              {company.detected_review_status}
                            </Badge>
                          </div>
                          {company.detected_risk_category && (
                            <div className="space-y-1">
                              <Label className="text-muted-foreground text-xs">Risk Category</Label>
                              <Badge variant={getDetectedRiskColor(company.detected_risk_category) as any}>
                                {company.detected_risk_category}
                              </Badge>
                            </div>
                          )}
                          {company.detected_risk_label && (
                            <div className="space-y-1 col-span-2">
                              <Label className="text-muted-foreground text-xs">Risk Label</Label>
                              <p className="text-sm">{company.detected_risk_label}</p>
                            </div>
                          )}
                          {company.detected_last_checked && (
                            <div className="space-y-1 col-span-2">
                              <Label className="text-muted-foreground text-xs">Last Checked</Label>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(company.detected_last_checked)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground mb-2">No KYB check has been initiated yet.</p>
                      <p className="text-xs text-muted-foreground">
                        Click "Run KYB Check" to verify this company with Detected.
                      </p>
                    </div>
                  )}

                  <Separator className="my-4" />

                  {/* Internal KYB Status */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Internal KYB Status</Label>
                    <div className="flex items-center gap-2">
                      {isEditingKyb ? (
                        <>
                          <Select value={editedKybStatus || ""} onValueChange={setEditedKybStatus}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {Constants.public.Enums.kyb_status.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" onClick={handleSaveKybStatus}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={handleCancelKybEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {company.kyb_status ? (
                            <Badge variant={getKybStatusVariant(company.kyb_status)}>{company.kyb_status}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                          <Button size="icon" variant="ghost" onClick={handleEditKybStatus}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <span className="text-sm text-muted-foreground ml-2">
                        {company.kyb_effective_date ? `Effective: ${formatDate(company.kyb_effective_date)}` : ""}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Credit Limits Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Credit Limits</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isEditMode ? (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Credit Limit</Label>
                        <Input
                          type="number"
                          value={editedCompany?.credit_limit || ""}
                          onChange={(e) =>
                            setEditedCompany((prev) =>
                              prev ? { ...prev, credit_limit: parseFloat(e.target.value) || null } : null,
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Trade Credit Limit</Label>
                        <Input
                          type="number"
                          value={editedCompany?.trade_credit_limit || ""}
                          onChange={(e) =>
                            setEditedCompany((prev) =>
                              prev ? { ...prev, trade_credit_limit: parseFloat(e.target.value) || null } : null,
                            )
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-6 justify-center">
                      <CreditGauge
                        current={company.current_exposure || 0}
                        max={company.credit_limit || 0}
                        label="Credit Limit"
                      />
                      <CreditGauge
                        current={company.current_exposure || 0}
                        max={company.trade_credit_limit || 0}
                        label="Trade Credit Limit"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Trading Summary Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Trading Summary</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Total Traded Volume</Label>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <p className="text-2xl font-bold">{formatLargeNumber(company.total_traded_volume)}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Amount Overdue</Label>
                      <div className="flex items-center gap-2">
                        {company.amount_overdue && company.amount_overdue > 0 ? (
                          <>
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <p className="text-lg font-semibold text-destructive">
                              {formatCurrency(company.amount_overdue)}
                            </p>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 text-success" />
                            <p className="text-lg font-semibold text-success">No overdue</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground text-xs">Fulfillment Progress</Label>
                      <span className="text-sm text-muted-foreground">
                        {company.total_MT_loaded || 0} / {company.total_MT_signed || 0} MT
                      </span>
                    </div>
                    <Progress
                      value={
                        company.total_MT_signed && company.total_MT_signed > 0
                          ? ((company.total_MT_loaded || 0) / company.total_MT_signed) * 100
                          : 0
                      }
                      className="h-2"
                    />
                    <span className="text-xs text-muted-foreground">
                      {company.total_MT_signed && company.total_MT_signed > 0
                        ? `${Math.round(((company.total_MT_loaded || 0) / company.total_MT_signed) * 100)}% fulfilled`
                        : "No data"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Risk & Payment Behaviour Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Risk & Payment Behaviour</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Risk Rating</Label>
                      {company.risk_rating ? (
                        <Badge variant={getRiskRatingColor(company.risk_rating) as any} className="text-sm">
                          {company.risk_rating}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Payment Terms</Label>
                      {isEditMode ? (
                        <Input
                          value={editedCompany?.payment_terms || ""}
                          onChange={(e) =>
                            setEditedCompany((prev) => (prev ? { ...prev, payment_terms: e.target.value } : null))
                          }
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          {company.payment_terms ? (
                            <>
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="outline" className="text-sm">
                                {company.payment_terms}
                              </Badge>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Late Payment Days</Label>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {company.aggregated_late_payment_days !== null &&
                          company.aggregated_late_payment_days !== undefined
                            ? `${company.aggregated_late_payment_days} days`
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Relationship Details Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <HandshakeIcon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Relationship Details</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-muted-foreground text-xs">Relationship Owner</Label>
                    {isEditMode ? (
                      <Select
                        value={editedCompany?.trader_relationship_owner || ""}
                        onValueChange={(value) =>
                          setEditedCompany((prev) =>
                            prev ? { ...prev, trader_relationship_owner: value as any } : null,
                          )
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {Constants.public.Enums.trader_relationship_owner.map((owner) => (
                            <SelectItem key={owner} value={owner}>
                              {owner}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm font-medium mt-1">{company.trader_relationship_owner || "-"}</p>
                    )}
                  </div>

                  <Separator />

                  {/* Company Contacts */}
                  {address && (address.contact_name_1 || address.contact_name_2 || isEditMode) && (
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Contacts</Label>
                      {isEditMode ? (
                        <div className="space-y-4">
                          <div className="p-3 rounded-lg border bg-card space-y-3">
                            <Badge variant="outline" className="text-xs">
                              Primary Contact
                            </Badge>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Name</Label>
                                <Input
                                  value={editedAddress?.contact_name_1 || ""}
                                  onChange={(e) =>
                                    setEditedAddress((prev) =>
                                      prev ? { ...prev, contact_name_1: e.target.value } : null,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Job Position</Label>
                                <Input
                                  value={editedAddress?.job_position_1 || ""}
                                  onChange={(e) =>
                                    setEditedAddress((prev) =>
                                      prev ? { ...prev, job_position_1: e.target.value } : null,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Email</Label>
                                <Input
                                  type="email"
                                  value={editedAddress?.email_1 || ""}
                                  onChange={(e) =>
                                    setEditedAddress((prev) => (prev ? { ...prev, email_1: e.target.value } : null))
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Phone</Label>
                                <Input
                                  value={editedAddress?.phone_1 || ""}
                                  onChange={(e) =>
                                    setEditedAddress((prev) => (prev ? { ...prev, phone_1: e.target.value } : null))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                          <div className="p-3 rounded-lg border bg-card space-y-3">
                            <Badge variant="outline" className="text-xs">
                              Secondary Contact
                            </Badge>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Name</Label>
                                <Input
                                  value={editedAddress?.contact_name_2 || ""}
                                  onChange={(e) =>
                                    setEditedAddress((prev) =>
                                      prev ? { ...prev, contact_name_2: e.target.value } : null,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Job Position</Label>
                                <Input
                                  value={editedAddress?.job_position_2 || ""}
                                  onChange={(e) =>
                                    setEditedAddress((prev) =>
                                      prev ? { ...prev, job_position_2: e.target.value } : null,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Email</Label>
                                <Input
                                  type="email"
                                  value={editedAddress?.email_2 || ""}
                                  onChange={(e) =>
                                    setEditedAddress((prev) => (prev ? { ...prev, email_2: e.target.value } : null))
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Phone</Label>
                                <Input
                                  value={editedAddress?.phone_2 || ""}
                                  onChange={(e) =>
                                    setEditedAddress((prev) => (prev ? { ...prev, phone_2: e.target.value } : null))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {address.contact_name_1 && (
                            <div className="p-3 rounded-lg border bg-muted/30">
                              <div className="flex items-start gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                    {getInitials(address.contact_name_1)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-sm">{address.contact_name_1}</p>
                                    <Badge variant="outline" className="text-xs">
                                      Primary
                                    </Badge>
                                  </div>
                                  {address.job_position_1 && (
                                    <p className="text-xs text-muted-foreground mb-2">{address.job_position_1}</p>
                                  )}
                                  <div className="flex flex-wrap gap-3">
                                    {address.email_1 && (
                                      <a
                                        href={`mailto:${address.email_1}`}
                                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        <Mail className="h-3 w-3" />
                                        {address.email_1}
                                      </a>
                                    )}
                                    {address.phone_1 && (
                                      <a
                                        href={`tel:${address.phone_1}`}
                                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        <Phone className="h-3 w-3" />
                                        {address.phone_1}
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {address.contact_name_2 && (
                            <div className="p-3 rounded-lg border bg-muted/30">
                              <div className="flex items-start gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                                    {getInitials(address.contact_name_2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-sm">{address.contact_name_2}</p>
                                    <Badge variant="outline" className="text-xs">
                                      Secondary
                                    </Badge>
                                  </div>
                                  {address.job_position_2 && (
                                    <p className="text-xs text-muted-foreground mb-2">{address.job_position_2}</p>
                                  )}
                                  <div className="flex flex-wrap gap-3">
                                    {address.email_2 && (
                                      <a
                                        href={`mailto:${address.email_2}`}
                                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        <Mail className="h-3 w-3" />
                                        {address.email_2}
                                      </a>
                                    )}
                                    {address.phone_2 && (
                                      <a
                                        href={`tel:${address.phone_2}`}
                                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        <Phone className="h-3 w-3" />
                                        {address.phone_2}
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Documents */}
                  <CompanyDocuments companyId={companyId} />

                  <Separator />

                  {/* Notes */}
                  <CompanyNotes companyId={companyId} />
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Company not found</div>
        )}
      </DialogContent>

      <KYBSearchDialog
        companyId={companyId}
        companyName={company?.name || ""}
        countryCode={address?.country?.slice(0, 2).toUpperCase() || ""}
        open={isKybSearchOpen}
        onOpenChange={setIsKybSearchOpen}
        onComplete={handleKybCheckComplete}
      />
    </Dialog>
  );
};
