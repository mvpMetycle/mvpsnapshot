import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type CommodityType = Database["public"]["Enums"]["commodity_type_enum"];
type HedgeDirection = Database["public"]["Enums"]["hedge_direction"];
type ReferenceType = Database["public"]["Enums"]["reference_type"];
type HedgeRequest = Database["public"]["Tables"]["hedge_request"]["Row"];

interface HedgeExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hedgeRequest?: HedgeRequest | null;
  onSuccess?: () => void;
}

const METALS: CommodityType[] = ["Copper", "Aluminium", "Zinc", "Nickel/stainless/hi-temp", "Lead", "Steel"];
const DIRECTIONS: HedgeDirection[] = ["Buy", "Sell"];
const REFERENCE_TYPES: ReferenceType[] = ["LME_CASH", "LME_3M"];
const CURRENCIES = ["USD", "EUR", "GBP"];

export function HedgeExecutionDialog({ 
  open, 
  onOpenChange, 
  hedgeRequest,
  onSuccess 
}: HedgeExecutionDialogProps) {
  const queryClient = useQueryClient();
  const isLinkedToRequest = !!hedgeRequest;

  const [hedgeRequestId, setHedgeRequestId] = useState<string>("");
  const [metal, setMetal] = useState<CommodityType>("Copper");
  const [direction, setDirection] = useState<HedgeDirection>("Buy");
  const [quantityMt, setQuantityMt] = useState<string>("");
  const [executedPrice, setExecutedPrice] = useState<string>("");
  const [priceCurrency, setPriceCurrency] = useState<string>("USD");
  const [executionDate, setExecutionDate] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [brokerName, setBrokerName] = useState<string>("StoneX");
  const [referenceType, setReferenceType] = useState<ReferenceType>("LME_CASH");
  const [contractReference, setContractReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [expiryDateError, setExpiryDateError] = useState<string>("");

  // When hedgeRequest is provided, prefill the form
  useEffect(() => {
    if (open && hedgeRequest) {
      setHedgeRequestId(hedgeRequest.id);
      // Map Brass to Copper for hedging (LME trades Copper, not Brass)
      const hedgeMetal = hedgeRequest.metal === "Brass" ? "Copper" : hedgeRequest.metal;
      setMetal(hedgeMetal as CommodityType);
      setDirection(hedgeRequest.direction);
      setQuantityMt(hedgeRequest.quantity_mt.toString());
      setBrokerName("StoneX");
      setReferenceType(hedgeRequest.reference || "LME_CASH");
      setPriceCurrency(hedgeRequest.target_price_currency || "USD");
      // Don't prefill executed price - user must enter
      setExecutedPrice("");
      setExecutionDate("");
      setExpiryDate("");
      setContractReference("");
      setNotes("");
      setExpiryDateError("");
    } else if (open && !hedgeRequest) {
      resetForm();
    }
  }, [open, hedgeRequest]);

  // Fetch hedge requests for the dropdown (only used in manual mode)
  const { data: hedgeRequests } = useQuery({
    queryKey: ["hedge-requests-for-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hedge_request")
        .select("id, metal, quantity_mt, order_id, ticket_id")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !isLinkedToRequest,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const effectiveHedgeRequestId = isLinkedToRequest ? hedgeRequest!.id : (hedgeRequestId || null);
      
      // 1. Insert hedge_execution
      const { data: executionData, error: executionError } = await supabase
        .from("hedge_execution")
        .insert({
          hedge_request_id: effectiveHedgeRequestId,
          metal,
          direction,
          quantity_mt: parseFloat(quantityMt),
          executed_price: parseFloat(executedPrice),
          executed_price_currency: priceCurrency,
          execution_date: executionDate,
          expiry_date: expiryDate,
          broker_name: brokerName || "StoneX",
          reference_type: referenceType,
          contract_reference: contractReference || null,
          notes: notes || null,
          instrument: "Future",
          status: "OPEN",
        })
        .select()
        .single();
      
      if (executionError) throw executionError;

      // 2. If linked to a hedge request, create hedge_link and update status
      if (effectiveHedgeRequestId && isLinkedToRequest) {
        // Get order_id from hedge_request if available
        const { data: reqData } = await supabase
          .from("hedge_request")
          .select("order_id, ticket_id")
          .eq("id", effectiveHedgeRequestId)
          .single();
        
        // Determine link level and link_id
        let linkLevel: "Order" | "Ticket" = "Ticket";
        let linkId = effectiveHedgeRequestId;
        
        if (reqData?.order_id) {
          linkLevel = "Order";
          linkId = reqData.order_id;
        } else if (reqData?.ticket_id) {
          linkLevel = "Ticket";
          linkId = reqData.ticket_id.toString();
        }

        // Create hedge_link record
        const { error: linkError } = await supabase
          .from("hedge_link")
          .insert({
            hedge_execution_id: executionData.id,
            link_id: linkId,
            link_level: linkLevel,
            allocated_quantity_mt: parseFloat(quantityMt),
            side: direction === "Buy" ? "BUY" : "SELL",
          });
        
        if (linkError) throw linkError;

        // Update hedge_request status to Executed
        const { error: updateError } = await supabase
          .from("hedge_request")
          .update({ 
            status: "Executed",
            updated_at: new Date().toISOString() 
          })
          .eq("id", effectiveHedgeRequestId);
        
        if (updateError) throw updateError;
      }

      return executionData;
    },
    onSuccess: () => {
      toast.success("Priced contract added successfully");
      queryClient.invalidateQueries({ queryKey: ["hedge-executions"] });
      queryClient.invalidateQueries({ queryKey: ["hedge-requests"] });
      queryClient.invalidateQueries({ queryKey: ["hedge-link-counts"] });
      queryClient.invalidateQueries({ queryKey: ["hedge-links-matching"] });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Failed to add priced contract: " + error.message);
    },
  });

  const resetForm = () => {
    setHedgeRequestId("");
    setMetal("Copper");
    setDirection("Buy");
    setQuantityMt("");
    setExecutedPrice("");
    setPriceCurrency("USD");
    setExecutionDate("");
    setExpiryDate("");
    setBrokerName("StoneX");
    setReferenceType("LME_CASH");
    setContractReference("");
    setNotes("");
    setExpiryDateError("");
  };

  const handleSave = () => {
    // Clear previous errors
    setExpiryDateError("");
    
    if (!quantityMt || parseFloat(quantityMt) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (!executedPrice || parseFloat(executedPrice) <= 0) {
      toast.error("Please enter a valid executed price");
      return;
    }
    if (!executionDate) {
      toast.error("Please select an execution date");
      return;
    }
    if (!expiryDate) {
      setExpiryDateError("Maturity date is required");
      toast.error("Please select a maturity date");
      return;
    }
    createMutation.mutate();
  };

  const formatHedgeRequestOption = (req: any) => {
    const parts = [`${req.id.slice(0, 8)}`];
    if (req.order_id) parts.push(`Order ${req.order_id}`);
    if (req.ticket_id) parts.push(`Ticket ${req.ticket_id}`);
    parts.push(req.metal);
    parts.push(`${req.quantity_mt?.toFixed(2) ?? 0} MT`);
    return parts.join(" – ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Priced Contract</DialogTitle>
          <DialogDescription>
            {isLinkedToRequest 
              ? `Create a hedge execution with trade price and maturity, linked to request ${hedgeRequest?.id.slice(0, 8)}`
              : "Create a new hedge execution with trade price and maturity."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Hedge Request - only show dropdown in manual mode */}
          {!isLinkedToRequest && (
            <div className="space-y-2">
              <Label>Hedge Request (Optional)</Label>
              <Select 
                value={hedgeRequestId || "__none__"} 
                onValueChange={(v) => setHedgeRequestId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a hedge request..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {hedgeRequests?.map((req) => (
                    <SelectItem key={req.id} value={req.id}>
                      {formatHedgeRequestOption(req)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Metal */}
          <div className="space-y-2">
            <Label>Metal *</Label>
            <Select 
              value={metal} 
              onValueChange={(v) => setMetal(v as CommodityType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METALS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Direction */}
          <div className="space-y-2">
            <Label>Direction *</Label>
            <Select 
              value={direction} 
              onValueChange={(v) => setDirection(v as HedgeDirection)}
              disabled={isLinkedToRequest}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIRECTIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantity (MT) *</Label>
            <Input
              type="number"
              step="0.01"
              value={quantityMt}
              onChange={(e) => setQuantityMt(e.target.value)}
              placeholder="e.g. 100.00"
            />
          </div>

          {/* Executed Price + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Executed Price *</Label>
              <Input
                type="number"
                step="0.01"
                value={executedPrice}
                onChange={(e) => setExecutedPrice(e.target.value)}
                placeholder="e.g. 9500.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Price Currency</Label>
              <Select value={priceCurrency} onValueChange={setPriceCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Execution Date + Maturity Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Trade Date *</Label>
              <Input
                type="date"
                value={executionDate}
                onChange={(e) => setExecutionDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Maturity (Expiry Date) *</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => {
                  setExpiryDate(e.target.value);
                  setExpiryDateError("");
                }}
                className={expiryDateError ? "border-destructive" : ""}
              />
              {expiryDateError && (
                <p className="text-xs text-destructive">{expiryDateError}</p>
              )}
            </div>
          </div>

          {/* Broker */}
          <div className="space-y-2">
            <Label>Broker</Label>
            <Input
              value={brokerName}
              onChange={(e) => setBrokerName(e.target.value)}
              placeholder="StoneX"
            />
          </div>

          {/* Reference Type */}
          <div className="space-y-2">
            <Label>Reference Type</Label>
            <Select value={referenceType} onValueChange={(v) => setReferenceType(v as ReferenceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFERENCE_TYPES.map((r) => (
                  <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contract Reference */}
          <div className="space-y-2">
            <Label>Contract Reference</Label>
            <Input
              value={contractReference}
              onChange={(e) => setContractReference(e.target.value)}
              placeholder="External broker ticket ID"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}