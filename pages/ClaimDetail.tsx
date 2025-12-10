import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  AlertTriangle,
  Building,
  Calendar,
  DollarSign,
  FileText,
  Upload,
  Save,
  Loader2,
  Image,
  File,
  Ship,
  Clock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

type ClaimStatus = 
  | "draft"
  | "submitted"
  | "under_supplier_review"
  | "accepted"
  | "rejected"
  | "counter_offer"
  | "settled"
  | "closed";

export default function ClaimDetail() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // File input refs
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const debitNoteInputRef = useRef<HTMLInputElement>(null);
  const externalInspectionInputRef = useRef<HTMLInputElement>(null);
  const supplierDocsInputRef = useRef<HTMLInputElement>(null);
  const settlementInputRef = useRef<HTMLInputElement>(null);

  const { data: claim, isLoading } = useQuery({
    queryKey: ["claim-detail", claimId],
    queryFn: async () => {
      if (!claimId) throw new Error("Invalid claim ID");
      const { data, error } = await supabase
        .from("claims")
        .select(`
          *,
          buyer:Company!claims_buyer_id_fkey(id, name),
          supplier:Company!claims_supplier_id_fkey(id, name),
          inspection_company:Company!claims_inspection_company_id_fkey(id, name),
          trader:traders!claims_assigned_trader_id_fkey(id, name)
        `)
        .eq("id", claimId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!claimId,
  });

  // Fetch order data for commodity type and buyer/seller ticket IDs
  const { data: orderData } = useQuery({
    queryKey: ["order-for-claim-detail", claim?.order_id],
    queryFn: async () => {
      if (!claim?.order_id) return null;
      const { data, error } = await supabase
        .from("order")
        .select("id, commodity_type, buyer, seller")
        .eq("id", claim.order_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!claim?.order_id,
  });

  // Fetch buyer ticket to get client_name (order.buyer is a ticket ID stored as text)
  const { data: buyerTicket } = useQuery({
    queryKey: ["ticket-for-buyer-detail", orderData?.buyer],
    queryFn: async () => {
      if (!orderData?.buyer) return null;
      const ticketId = parseInt(orderData.buyer, 10);
      if (isNaN(ticketId)) return null;
      const { data, error } = await supabase
        .from("ticket")
        .select("id, client_name")
        .eq("id", ticketId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderData?.buyer,
  });

  // Fetch seller ticket to get client_name (order.seller is a ticket ID stored as text)
  const { data: sellerTicket } = useQuery({
    queryKey: ["ticket-for-seller-detail", orderData?.seller],
    queryFn: async () => {
      if (!orderData?.seller) return null;
      const ticketId = parseInt(orderData.seller, 10);
      if (isNaN(ticketId)) return null;
      const { data, error } = await supabase
        .from("ticket")
        .select("id, client_name")
        .eq("id", ticketId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderData?.seller,
  });

  const { data: companies } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Company")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState<any>({});

  // Initialize form data when claim loads
  useEffect(() => {
    if (claim) {
      setFormData({
        claim_type: claim.claim_type,
        claim_description: claim.claim_description || "",
        claimed_value_amount: claim.claimed_value_amount?.toString() || "",
        claimed_value_currency: claim.claimed_value_currency || "USD",
        claimed_file_date: claim.claimed_file_date || "",
        claim_due_date: (claim as any).claim_due_date || "",
        external_inspection_provided: claim.external_inspection_provided || false,
        third_party_inspection_costs: (claim as any).third_party_inspection_costs?.toString() || "",
        first_day_communicated_to_supplier: claim.first_day_communicated_to_supplier || "",
        raised_to_supplier: (claim as any).raised_to_supplier || false,
        supplier_response_status: claim.supplier_response_status || "pending",
        supplier_notes: claim.supplier_notes || "",
        supplier_counter_offer_amount: claim.supplier_counter_offer_amount?.toString() || "",
        final_settlement_amount: claim.final_settlement_amount?.toString() || "",
        final_settlement_currency: claim.final_settlement_currency || "USD",
        settlement_agreed_date: claim.settlement_agreed_date || "",
        settlement_status: (claim as any).settlement_status || "Open",
        settlement_option: (claim as any).settlement_option || "",
        way_of_settling: (claim as any).way_of_settling || "",
        trader_notes: claim.trader_notes || "",
        // Normalize status to Open/Closed format for the dropdown
        status: claim.status === "closed" ? "Closed" : "Open",
      });
    }
  }, [claim]);

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("claims")
        .update(updates)
        .eq("id", claimId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claim-detail", claimId] });
      toast.success("Claim updated successfully");
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update claim");
    },
  });

  const handleSave = () => {
    // Calculate days to resolve fields
    let daysToResolveSinceAta: number | null = null;
    let daysToResolveSinceClaim: number | null = null;
    
    if (formData.settlement_agreed_date && claim?.ata) {
      daysToResolveSinceAta = differenceInDays(
        new Date(formData.settlement_agreed_date),
        new Date(claim.ata)
      );
    }
    
    if (formData.settlement_agreed_date && formData.claimed_file_date) {
      daysToResolveSinceClaim = differenceInDays(
        new Date(formData.settlement_agreed_date),
        new Date(formData.claimed_file_date)
      );
    }

    const updates: any = {
      claim_type: formData.claim_type || claim?.claim_type,
      claim_description: formData.claim_description,
      claimed_value_amount: formData.claimed_value_amount ? parseFloat(formData.claimed_value_amount) : null,
      claimed_value_currency: formData.claimed_value_currency,
      claimed_file_date: formData.claimed_file_date || null,
      claim_due_date: formData.claim_due_date || null,
      external_inspection_provided: formData.external_inspection_provided,
      third_party_inspection_costs: formData.external_inspection_provided && formData.third_party_inspection_costs 
        ? parseFloat(formData.third_party_inspection_costs) 
        : null,
      first_day_communicated_to_supplier: formData.first_day_communicated_to_supplier || null,
      raised_to_supplier: formData.raised_to_supplier,
      supplier_response_status: formData.supplier_response_status,
      supplier_notes: formData.supplier_notes,
      supplier_counter_offer_amount: formData.supplier_counter_offer_amount ? parseFloat(formData.supplier_counter_offer_amount) : null,
      final_settlement_amount: formData.final_settlement_amount ? parseFloat(formData.final_settlement_amount) : null,
      final_settlement_currency: formData.final_settlement_currency,
      settlement_agreed_date: formData.settlement_agreed_date || null,
      settlement_status: formData.settlement_status || "Open",
      settlement_option: formData.settlement_option || null,
      way_of_settling: formData.way_of_settling || null,
      days_to_resolve_since_ata: daysToResolveSinceAta,
      days_to_resolve_since_claim: daysToResolveSinceClaim,
      trader_notes: formData.trader_notes,
      // Map UI status values back to database format
      status: formData.status === "Closed" ? "closed" : "draft",
    };

    updateMutation.mutate(updates);
  };

  const handleFileUpload = async (file: File, field: string, isArray: boolean = false) => {
    setIsSaving(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `claims/${claimId}/${field}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("claim-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("claim-documents")
        .getPublicUrl(filePath);

      if (isArray) {
        const currentFiles = (claim as any)?.[field] || [];
        await supabase
          .from("claims")
          .update({ [field]: [...currentFiles, urlData.publicUrl] })
          .eq("id", claimId);
      } else {
        await supabase
          .from("claims")
          .update({ [field]: urlData.publicUrl })
          .eq("id", claimId);
      }

      queryClient.invalidateQueries({ queryKey: ["claim-detail", claimId] });
      toast.success("File uploaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: ClaimStatus) => {
    if (newStatus === "closed") {
      if (!claim?.final_settlement_amount) {
        toast.error("Settlement data required before closing claim");
        return;
      }
    }

    await updateMutation.mutateAsync({ status: newStatus });
  };

  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (amount === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadgeColor = (status: string) => {
    // Normalize status - treat any value other than Closed/closed as Open
    const normalizedStatus = status === "Closed" || status === "closed" ? "Closed" : "Open";
    const colors: Record<string, string> = {
      Open: "bg-yellow-500/10 text-yellow-600",
      Closed: "bg-green-500/10 text-green-600",
    };
    return colors[normalizedStatus] || "bg-muted text-muted-foreground";
  };

  const getClaimTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      loss_of_metal: "Loss of Metal",
      contamination: "Contamination",
      weight_loss: "Weight Loss",
      dust: "Dust",
      other: "Other",
      // Legacy support
      quality: "Quality Issue",
      moisture: "Moisture",
    };
    return labels[type] || type;
  };

  // Calculate days to raise claim
  const daysToRaiseClaim = claim?.ata && claim?.claimed_file_date
    ? differenceInDays(new Date(claim.claimed_file_date), new Date(claim.ata))
    : null;

  // Color coding: Green < 5, Yellow 5-15, Red > 15
  const getDaysColorClass = (days: number | null) => {
    if (days === null) return "bg-muted text-muted-foreground";
    if (days < 5) return "bg-green-500/10 text-green-600";
    if (days <= 15) return "bg-yellow-500/10 text-yellow-600";
    return "bg-red-500/10 text-red-600";
  };

  // Get commodity type from order
  const commodityType = orderData?.commodity_type || claim?.commodity_type || null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-muted-foreground">Claim not found</div>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  // Navigate back to parent BL Order
  const handleBackNavigation = () => {
    if (claim.bl_order_id) {
      navigate(`/bl-orders/${claim.bl_order_id}`);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header - Claim reference, status badge, back arrow, and edit controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackNavigation}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              <h1 className="text-3xl font-bold">{claim.claim_reference}</h1>
              <Badge className={getStatusBadgeColor(claim.status)}>
                {claim.status === "closed" ? "CLOSED" : "OPEN"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              BL Order:{" "}
              <Link to={`/bl-orders/${claim.bl_order_id}`} className="text-primary hover:underline">
                {claim.bl_order_name}
              </Link>
            </p>
          </div>
        </div>
        {/* Edit controls only - no action menu */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              Edit Claim
            </Button>
          )}
        </div>
      </div>

      {/* SECTION 1: Claim Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Claim Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Commodity Type - from Order */}
          <div>
            <Label className="text-muted-foreground">Commodity Type</Label>
            <p className="font-semibold">{commodityType || "—"}</p>
          </div>

          {/* Claim Type */}
          <div>
            <Label className="text-muted-foreground">Claim Type</Label>
            {isEditing ? (
              <Select
                value={formData.claim_type}
                onValueChange={(value) => setFormData({ ...formData, claim_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loss_of_metal">Loss of Metal</SelectItem>
                  <SelectItem value="contamination">Contamination</SelectItem>
                  <SelectItem value="weight_loss">Weight Loss</SelectItem>
                  <SelectItem value="dust">Dust</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="font-semibold">{getClaimTypeLabel(claim.claim_type)}</p>
            )}
          </div>

          {/* Claimed Amount */}
          <div>
            <Label className="text-muted-foreground">Claimed Amount</Label>
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.claimed_value_amount}
                  onChange={(e) => setFormData({ ...formData, claimed_value_amount: e.target.value })}
                  placeholder="0.00"
                />
                <Select
                  value={formData.claimed_value_currency}
                  onValueChange={(value) => setFormData({ ...formData, claimed_value_currency: value })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="font-semibold text-orange-600 text-lg">
                {formatCurrency(claim.claimed_value_amount, claim.claimed_value_currency)}
              </p>
            )}
          </div>

          {/* Claim Filed Date */}
          <div>
            <Label className="text-muted-foreground">Claim Filed Date</Label>
            {isEditing ? (
              <Input
                type="date"
                value={formData.claimed_file_date}
                onChange={(e) => setFormData({ ...formData, claimed_file_date: e.target.value })}
              />
            ) : (
              <p className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatDate(claim.claimed_file_date)}
              </p>
            )}
          </div>

          {/* ATA */}
          <div>
            <Label className="text-muted-foreground">ATA (Actual Time of Arrival)</Label>
            <p className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {formatDate(claim.ata)}
            </p>
          </div>

          {/* Days to Raise Claim - Color Coded */}
          <div>
            <Label className="text-muted-foreground">Days to Raise Claim</Label>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {daysToRaiseClaim !== null ? (
                <Badge className={getDaysColorClass(daysToRaiseClaim)}>
                  {daysToRaiseClaim} days
                </Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {daysToRaiseClaim !== null && daysToRaiseClaim < 5 && "✓ Within optimal window"}
              {daysToRaiseClaim !== null && daysToRaiseClaim >= 5 && daysToRaiseClaim <= 15 && "⚠ Moderate delay"}
              {daysToRaiseClaim !== null && daysToRaiseClaim > 15 && "⚠ Significant delay"}
            </p>
          </div>

          {/* Claim Status */}
          <div>
            <Label className="text-muted-foreground">Claim Status</Label>
            {isEditing ? (
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge className={getStatusBadgeColor(claim.status)}>
                {claim.status === "closed" ? "CLOSED" : "OPEN"}
              </Badge>
            )}
          </div>
          {/* Buyer (from ticket.client_name via order.buyer → ticket.id) */}
          <div>
            <Label className="text-muted-foreground">Buyer</Label>
            <p className="font-semibold flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              {buyerTicket?.client_name || "—"}
            </p>
          </div>

          {/* Supplier (from ticket.client_name via order.seller → ticket.id) */}
          <div>
            <Label className="text-muted-foreground">Supplier</Label>
            <p className="font-semibold flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              {sellerTicket?.client_name || "—"}
            </p>
          </div>

          {/* Order ID */}
          <div>
            <Label className="text-muted-foreground">Order ID</Label>
            <p className="font-semibold">
              {claim.order_id ? (
                <Link to={`/inventory/${claim.order_id}`} className="text-primary hover:underline">
                  {claim.order_id}
                </Link>
              ) : "—"}
            </p>
          </div>

          {/* Description - Full Width */}
          <div className="md:col-span-3">
            <Label className="text-muted-foreground">Description</Label>
            {isEditing ? (
              <Textarea
                value={formData.claim_description}
                onChange={(e) => setFormData({ ...formData, claim_description: e.target.value })}
                rows={3}
              />
            ) : (
              <p className="text-sm">{claim.claim_description || "—"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: Claim Evidence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Claim Evidence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Claimed Amount (repeated from Overview for clarity) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-muted-foreground">Claimed Amount</Label>
              <p className="font-semibold text-orange-600 text-lg">
                {formatCurrency(claim.claimed_value_amount, claim.claimed_value_currency)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Claim Due Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formData.claim_due_date}
                  onChange={(e) => setFormData({ ...formData, claim_due_date: e.target.value })}
                />
              ) : (
                <p className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDate((claim as any).claim_due_date)}
                </p>
              )}
            </div>
          </div>

          {/* Evidence Files (Word, Excel, PDF) */}
          <div>
            <Label className="text-muted-foreground">Evidence Files</Label>
            <p className="text-xs text-muted-foreground mb-2">Word, Excel, PDF documents</p>
            <div className="flex flex-wrap gap-2">
              {(claim.claim_evidence_files as string[] | null)?.map((url: string, idx: number) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80"
                >
                  <File className="h-4 w-4" />
                  Evidence {idx + 1}
                </a>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => evidenceInputRef.current?.click()}
                disabled={isSaving}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Evidence
              </Button>
              <input
                ref={evidenceInputRef}
                type="file"
                accept=".doc,.docx,.xls,.xlsx,.pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "claim_evidence_files", true)}
              />
            </div>
          </div>

          {/* Pictures */}
          <div>
            <Label className="text-muted-foreground">Pictures</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(claim.claim_photo_urls as string[] | null)?.map((url: string, idx: number) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group"
                >
                  <img src={url} alt={`Photo ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                </a>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => photoInputRef.current?.click()}
                disabled={isSaving}
              >
                <Image className="h-4 w-4 mr-2" />
                Upload Photo
              </Button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "claim_photo_urls", true)}
              />
            </div>
          </div>

          {/* Claim Debit Note (renamed from "Claim Debit Note Request") */}
          <div>
            <Label className="text-muted-foreground">Claim Debit Note</Label>
            <p className="text-xs text-muted-foreground mb-2">Document from buyer requesting compensation</p>
            <div className="flex items-center gap-2">
              {claim.claim_debit_note_url ? (
                <a
                  href={claim.claim_debit_note_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80"
                >
                  <FileText className="h-4 w-4" />
                  View Debit Note
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">No debit note uploaded</span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => debitNoteInputRef.current?.click()}
                disabled={isSaving}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <input
                ref={debitNoteInputRef}
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "claim_debit_note_url")}
              />
            </div>
          </div>

          {/* External Inspection Report */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Label className="text-muted-foreground">External inspection provided?</Label>
              {isEditing ? (
                <Switch
                  checked={formData.external_inspection_provided}
                  onCheckedChange={(checked) => setFormData({ ...formData, external_inspection_provided: checked })}
                />
              ) : (
                <Badge variant={claim.external_inspection_provided ? "default" : "secondary"}>
                  {claim.external_inspection_provided ? "Yes" : "No"}
                </Badge>
              )}
            </div>
            
            {(claim.external_inspection_provided || formData.external_inspection_provided) && (
              <div className="flex flex-col gap-3 ml-4">
                <div className="flex items-center gap-2">
                  {claim.external_inspection_report_url ? (
                    <a
                      href={claim.external_inspection_report_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80"
                    >
                      <FileText className="h-4 w-4" />
                      View Inspection Report
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">No report uploaded</span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => externalInspectionInputRef.current?.click()}
                    disabled={isSaving}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                  <input
                    ref={externalInspectionInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "external_inspection_report_url")}
                  />
                </div>
                
                {/* 3rd Party Inspection Costs */}
                <div className="max-w-xs">
                  <Label className="text-muted-foreground">3rd Party inspection costs</Label>
                  {isEditing ? (
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        value={formData.third_party_inspection_costs}
                        onChange={(e) => setFormData({ ...formData, third_party_inspection_costs: e.target.value })}
                        placeholder="0.00"
                      />
                      <span className="flex items-center text-sm text-muted-foreground">USD</span>
                    </div>
                  ) : (
                    <p className="font-semibold mt-1">
                      {(claim as any).third_party_inspection_costs 
                        ? formatCurrency((claim as any).third_party_inspection_costs, "USD")
                        : "—"}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3: Supplier Response */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Supplier Response
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Raised to Supplier - FIRST and REQUIRED */}
          <div>
            <Label className="text-muted-foreground">Raised to Supplier *</Label>
            {isEditing ? (
              <div className="flex items-center gap-2 mt-2">
                <Switch
                  checked={formData.raised_to_supplier}
                  onCheckedChange={(checked) => setFormData({ ...formData, raised_to_supplier: checked })}
                />
                <span className="text-sm">{formData.raised_to_supplier ? "Yes" : "No"}</span>
              </div>
            ) : (
              <Badge variant={(claim as any).raised_to_supplier ? "default" : "secondary"} className="mt-1">
                {(claim as any).raised_to_supplier ? "Yes" : "No"}
              </Badge>
            )}
          </div>

          {/* Show rest of fields only if Raised to Supplier = Yes */}
          {(formData.raised_to_supplier || (claim as any).raised_to_supplier) && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* First Day Communicated to Supplier */}
                <div>
                  <Label className="text-muted-foreground">First Day Communicated to Supplier</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={formData.first_day_communicated_to_supplier}
                      onChange={(e) => setFormData({ ...formData, first_day_communicated_to_supplier: e.target.value })}
                    />
                  ) : (
                    <p className="font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(claim.first_day_communicated_to_supplier)}
                    </p>
                  )}
                </div>

                {/* Response Status */}
                <div>
                  <Label className="text-muted-foreground">Response Status</Label>
                  {isEditing ? (
                    <Select
                      value={formData.supplier_response_status}
                      onValueChange={(value) => setFormData({ ...formData, supplier_response_status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="counter_offer">Counter Offer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="capitalize">
                      {claim.supplier_response_status?.replace(/_/g, " ") || "Pending"}
                    </Badge>
                  )}
                </div>

                {/* Counter Offer Amount */}
                {(claim.supplier_response_status === "counter_offer" || formData.supplier_response_status === "counter_offer" || isEditing) && (
                  <div>
                    <Label className="text-muted-foreground">Counter Offer Amount</Label>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={formData.supplier_counter_offer_amount}
                          onChange={(e) => setFormData({ ...formData, supplier_counter_offer_amount: e.target.value })}
                          placeholder="0.00"
                        />
                        <Select
                          value={formData.claimed_value_currency}
                          onValueChange={(value) => setFormData({ ...formData, claimed_value_currency: value })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <p className="font-semibold">
                        {formatCurrency(claim.supplier_counter_offer_amount, claim.claimed_value_currency)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Supplier Notes */}
              <div>
                <Label className="text-muted-foreground">Supplier Notes</Label>
                {isEditing ? (
                  <Textarea
                    value={formData.supplier_notes}
                    onChange={(e) => setFormData({ ...formData, supplier_notes: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm">{claim.supplier_notes || "—"}</p>
                )}
              </div>

              {/* Supplier Shared Documents */}
              <div>
                <Label className="text-muted-foreground">Documentation Shared with Supplier</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(claim.supplier_shared_docs_urls as string[] | null)?.map((url: string, idx: number) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80"
                    >
                      <File className="h-4 w-4" />
                      Document {idx + 1}
                    </a>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => supplierDocsInputRef.current?.click()}
                    disabled={isSaving}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                  <input
                    ref={supplierDocsInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "supplier_shared_docs_urls", true)}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Settlement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Settlement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-muted-foreground">Settlement Amount</Label>
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.final_settlement_amount}
                    onChange={(e) => setFormData({ ...formData, final_settlement_amount: e.target.value })}
                    placeholder="0.00"
                  />
                  <Select
                    value={formData.final_settlement_currency}
                    onValueChange={(value) => setFormData({ ...formData, final_settlement_currency: value })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="font-semibold text-green-600 text-lg">
                  {formatCurrency(claim.final_settlement_amount, claim.final_settlement_currency)}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Settlement Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formData.settlement_agreed_date}
                  onChange={(e) => setFormData({ ...formData, settlement_agreed_date: e.target.value })}
                />
              ) : (
                <p className="font-semibold">{formatDate(claim.settlement_agreed_date)}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Settlement Status</Label>
              {isEditing ? (
              <Select
                  value={formData.settlement_status}
                  onValueChange={(value) => {
                    // Auto-set claim status to "Closed" when Settlement Status is "Paid"
                    if (value === "Paid") {
                      setFormData({ ...formData, settlement_status: value, status: "Closed" });
                    } else {
                      setFormData({ ...formData, settlement_status: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={(claim as any).settlement_status === "Paid" ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"}>
                  {(claim as any).settlement_status || "Open"}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground">Settlement Option</Label>
              {isEditing ? (
                <Select
                  value={formData.settlement_option}
                  onValueChange={(value) => setFormData({ ...formData, settlement_option: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Credit Note">Credit Note</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-semibold">{(claim as any).settlement_option || "—"}</p>
              )}
            </div>
            
            {/* Way of Settling - NEW FIELD */}
            <div>
              <Label className="text-muted-foreground">Way of Settling</Label>
              {isEditing ? (
                <Select
                  value={formData.way_of_settling}
                  onValueChange={(value) => setFormData({ ...formData, way_of_settling: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select way of settling" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Settled via Supplier">Settled via Supplier</SelectItem>
                    <SelectItem value="Settled via own cash">Settled via own cash</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-semibold">{(claim as any).way_of_settling || "—"}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Days to Resolve (from ATA)</Label>
              <p className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {(claim as any).days_to_resolve_since_ata !== null && (claim as any).days_to_resolve_since_ata !== undefined 
                  ? `${(claim as any).days_to_resolve_since_ata} days` 
                  : "—"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Days to Resolve (from Claim Filed)</Label>
              <p className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {(claim as any).days_to_resolve_since_claim !== null && (claim as any).days_to_resolve_since_claim !== undefined 
                  ? `${(claim as any).days_to_resolve_since_claim} days` 
                  : "—"}
              </p>
            </div>
          </div>

          {/* Settlement Document */}
          <div>
            <Label className="text-muted-foreground">Settlement Document</Label>
            <div className="flex items-center gap-2 mt-2">
              {claim.settlement_document_url ? (
                <a
                  href={claim.settlement_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80"
                >
                  <FileText className="h-4 w-4" />
                  View Settlement Document
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">No document uploaded</span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => settlementInputRef.current?.click()}
                disabled={isSaving}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <input
                ref={settlementInputRef}
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "settlement_document_url")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 4: Internal Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Internal Notes (Trader)</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={formData.trader_notes}
              onChange={(e) => setFormData({ ...formData, trader_notes: e.target.value })}
              rows={4}
              placeholder="Internal notes..."
            />
          ) : (
            <p className="text-sm">{claim.trader_notes || "No internal notes"}</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}