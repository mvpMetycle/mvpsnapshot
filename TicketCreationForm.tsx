import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Constants } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";

interface FreightLeg {
  freight_type: string;
  cost_amount: string;
  cost_currency: string;
}

interface TicketCreationFormProps {
  onSuccess: () => void;
  ticketId?: number;
  initialData?: any;
  hideTraderField?: boolean;
  photos?: string[];
  prefilledFields?: string[];
}

export const TicketCreationForm = ({ 
  onSuccess, 
  ticketId, 
  initialData, 
  hideTraderField = false,
  photos = [],
  prefilledFields = []
}: TicketCreationFormProps) => {
  const { register, handleSubmit, watch, setValue, reset } = useForm();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [freightLegs, setFreightLegs] = useState<FreightLeg[]>([
    { freight_type: "", cost_amount: "", cost_currency: "USD" }
  ]);
  const enums = Constants.public.Enums;

  // Load existing ticket data if editing
  useEffect(() => {
    if (ticketId) {
      const loadTicket = async () => {
        const { data, error } = await supabase
          .from("ticket")
          .select("*")
          .eq("id", ticketId)
          .maybeSingle();

        if (error) {
          toast.error("Failed to load ticket");
          return;
        }

        if (data) {
          // Convert payable_percent and down_payment_amount_percent from decimal to percentage for display
          const formData = { ...data };
          if (formData.payable_percent !== null && formData.payable_percent !== undefined) {
            formData.payable_percent = parseFloat(String(formData.payable_percent)) * 100;
          }
          if (formData.down_payment_amount_percent !== null && formData.down_payment_amount_percent !== undefined) {
            formData.down_payment_amount_percent = parseFloat(String(formData.down_payment_amount_percent)) * 100;
          }
          // Convert lme_action_needed from boolean/integer to string for display
          if (formData.lme_action_needed === true || (formData.lme_action_needed as any) === 1) {
            (formData as any).lme_action_needed = "Yes";
          } else if (formData.lme_action_needed === false || (formData.lme_action_needed as any) === 0) {
            (formData as any).lme_action_needed = "No";
          }
          reset(formData);
        }
      };
      loadTicket();
    } else if (initialData) {
      // Load initial data from voice/AI parsing
      reset(initialData);
    }
  }, [ticketId, initialData, reset]);

  const ticketType = watch("type");
  const pricingType = watch("pricing_type");
  const quantity = watch("quantity");
  const signedPrice = watch("signed_price");
  const lmePrice = watch("lme_price");
  const payablePercent = watch("payable_percent");
  const premiumDiscount = watch("premium_discount");

  // Calculate signed_volume based on pricing type
  useEffect(() => {
    let calculatedVolume = null;

    if (quantity && pricingType) {
      if (pricingType === "Fixed" && signedPrice) {
        calculatedVolume = parseFloat(quantity) * parseFloat(signedPrice);
      } else if (pricingType === "Formula" && lmePrice && payablePercent) {
        // payablePercent is now in percentage form (95), convert to decimal
        calculatedVolume = parseFloat(quantity) * parseFloat(lmePrice) * (parseFloat(payablePercent) / 100);
      } else if (pricingType === "Index" && lmePrice && premiumDiscount) {
        calculatedVolume = parseFloat(quantity) * (parseFloat(lmePrice) + parseFloat(premiumDiscount));
      }
    }

    const newValue = calculatedVolume ? calculatedVolume.toFixed(2) : "";
    
    // Only update if the value has actually changed to avoid infinite loops
    if (watch("signed_volume") !== newValue) {
      setValue("signed_volume", newValue);
    }
  }, [quantity, pricingType, signedPrice, lmePrice, payablePercent, premiumDiscount, setValue, watch]);

  // Query shipping locations
  const { data: shippingLocations } = useQuery({
    queryKey: ["shipping_locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_location")
        .select("name")
        .order("name")
        .limit(15000); // Fetch all locations (currently ~13,860)
      
      if (error) throw error;
      return data;
    },
  });

  // Query traders
  const { data: traders } = useQuery({
    queryKey: ["traders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("traders")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Query companies
  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Company")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const onSubmit = async (data: any) => {
    if (isSubmitting) return; // Prevent duplicate submissions
    setIsSubmitting(true);
    try {
      // Clean up the data: convert empty strings to null for numeric and date fields
      const cleanedData = Object.entries(data).reduce((acc, [key, value]) => {
        // Skip computed fields that shouldn't be submitted
        if (key === 'qp_start_date' || key === 'qp_end_date') {
          return acc;
        }
        
        // Convert month input to full date (YYYY-MM to YYYY-MM-01)
        if (key === 'shipment_window' && value && typeof value === 'string' && value.match(/^\d{4}-\d{2}$/)) {
          acc[key] = `${value}-01`;
          return acc;
        }
        
        // Convert payable_percent from percentage to decimal (95 -> 0.95)
        if (key === 'payable_percent' && value !== null && value !== '' && value !== undefined) {
          acc[key] = parseFloat(String(value)) / 100;
          return acc;
        }
        
        // Convert down_payment_amount_percent from percentage to decimal (30 -> 0.30)
        if (key === 'down_payment_amount_percent' && value !== null && value !== '' && value !== undefined) {
          acc[key] = parseFloat(String(value)) / 100;
          return acc;
        }
        
        // Convert lme_action_needed from string to integer (Yes -> 1, No -> 0)
        if (key === 'lme_action_needed' && value !== null && value !== '') {
          acc[key] = value === "Yes" ? 1 : value === "No" ? 0 : null;
          return acc;
        }
        
        // Convert empty strings to null
        if (value === "" || value === undefined) {
          acc[key] = null;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      let ticketData;

      if (ticketId) {
        // Update existing ticket
        const { data: updateData, error: updateError } = await supabase
          .from("ticket")
          .update(cleanedData)
          .eq("id", ticketId)
          .select()
          .single();

        if (updateError) throw updateError;
        ticketData = updateData;

        toast.success("Ticket updated successfully");
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
        queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
        onSuccess();
        return;
      }

      // Calculate freight totals
      const validFreightLegs = freightLegs.filter(
        leg => leg.freight_type && leg.cost_amount && leg.cost_currency
      );
      const hasMultimodal = validFreightLegs.length > 1;
      const freightEstimateTotal = validFreightLegs.reduce(
        (sum, leg) => sum + parseFloat(leg.cost_amount || "0"), 
        0
      );

      // Insert the ticket first with freight summary
      const { data: insertData, error: ticketError } = await supabase
        .from("ticket")
        .insert([{ 
          ...cleanedData, 
          status: "Draft",
          has_multimodal_freight: hasMultimodal,
          freight_estimate_total: freightEstimateTotal > 0 ? freightEstimateTotal : null
        }])
        .select()
        .single();

      if (ticketError) throw ticketError;
      ticketData = insertData;

      // Save freight legs if any
      if (validFreightLegs.length > 0) {
        for (let i = 0; i < validFreightLegs.length; i++) {
          const leg = validFreightLegs[i];
          
          // Create freight leg
          const { data: legData, error: legError } = await supabase
            .from("ticket_freight_legs")
            .insert([{
              ticket_id: ticketData.id,
              leg_index: i,
              freight_type: leg.freight_type as any,
            }] as any)
            .select()
            .single();

          if (legError) throw legError;

          // Create initial freight cost (ESTIMATE stage)
          const { error: costError } = await supabase
            .from("ticket_freight_costs")
            .insert([{
              freight_leg_id: legData.id,
              cost_amount: parseFloat(leg.cost_amount),
              cost_currency: leg.cost_currency,
              stage: "ESTIMATE" as any,
              is_current: true,
              source: "QUOTE" as any
            }] as any);

          if (costError) throw costError;
        }
      }

      // Evaluate approval rules - explicitly convert lme_action_needed to string to avoid function overload ambiguity
      const lmeActionStr = cleanedData.lme_action_needed === true || cleanedData.lme_action_needed === 1 
        ? "Yes" 
        : cleanedData.lme_action_needed === false || cleanedData.lme_action_needed === 0 
          ? "No" 
          : null;
      
      const { data: rulesResult, error: rulesError } = await supabase.rpc(
        "evaluate_ticket_approval_rules" as any,
        {
          p_ticket_id: ticketData.id,
          p_payment_trigger_event: cleanedData.payment_trigger_event || "",
          p_payment_trigger_timing: cleanedData.payment_trigger_timing || "",
          p_pricing_type: cleanedData.pricing_type || "",
          p_company_id: cleanedData.company_id || 0,
          p_transaction_type: cleanedData.transaction_type || "",
          p_lme_action_needed: lmeActionStr || "",
        }
      ) as any;

      if (rulesError) throw rulesError;

      const rules = rulesResult as any;

      // If approval is required, create approval request
      if (rules.requires_approval) {
        const { error: approvalError } = await supabase
          .from("approval_requests")
          .insert({
            ticket_id: ticketData.id,
            rule_triggered: rules.rule_triggered,
            required_approvers: rules.required_approvers,
            status: "Pending Approval",
          });

        if (approvalError) throw approvalError;

        // Update ticket status to pending approval
        const { error: updateError } = await supabase
          .from("ticket")
          .update({ status: "Pending Approval" })
          .eq("id", ticketData.id);

        if (updateError) throw updateError;

        toast.success(
          "Trade ticket created and sent for approval",
          {
            description: `Requires approval from: ${rules.required_approvers.join(", ")}`,
          }
        );
      } else {
        // No approval needed, mark as approved
        const { error: updateError } = await supabase
          .from("ticket")
          .update({ status: "Approved" })
          .eq("id", ticketData.id);

        if (updateError) throw updateError;

        toast.success("Trade ticket created successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* P1. Trade Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b pb-2">
          Trade Details
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <SearchableSelect
              value={ticketType}
              onValueChange={(value) => setValue("type", value)}
              options={enums.trade_type.map((v) => ({ value: v, label: v }))}
              placeholder="Select type"
              searchPlaceholder="Search type..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction_type">Transaction Type</Label>
            <SearchableSelect
              value={watch("transaction_type")}
              onValueChange={(value) => setValue("transaction_type", value)}
              options={[
                { value: "B2B", label: "B2B" },
                { value: "Warehouse", label: "Warehouse" }
              ]}
              placeholder="Select transaction type"
              searchPlaceholder="Search transaction type..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commodity_type">Commodity Type</Label>
            <SearchableSelect
              value={watch("commodity_type")}
              onValueChange={(value) => setValue("commodity_type", value)}
              options={enums.commodity_type_enum.map((v) => ({ value: v, label: v }))}
              placeholder="Select commodity type"
              searchPlaceholder="Search commodity..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity (MT)</Label>
            <Input
              type="number"
              step="0.01"
              {...register("quantity")}
              placeholder="e.g., 1000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signed_volume">Transaction Volume (Calculated)</Label>
            <Input
              type="text"
              {...register("signed_volume")}
              placeholder="Auto-calculated"
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_id">Counterparty</Label>
            <SearchableSelect
              value={watch("company_id")?.toString()}
              onValueChange={(value) => {
                const companyId = parseInt(value);
                setValue("company_id", companyId);
                // Also set the client_name from the selected company
                const selectedCompany = companies?.find(c => c.id === companyId);
                if (selectedCompany) {
                  setValue("client_name", selectedCompany.name);
                }
              }}
              options={companies?.map((c) => ({ value: c.id.toString(), label: c.name })) || []}
              placeholder="Select counterparty"
              searchPlaceholder="Search counterparty..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="isri_grade">ISRI Grade</Label>
            <SearchableSelect
              value={watch("isri_grade")}
              onValueChange={(value) => setValue("isri_grade", value)}
              options={enums.isri_grade_enum.map((v) => ({ value: v, label: v }))}
              placeholder="Select ISRI grade"
              searchPlaceholder="Search ISRI grade..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metal_form">Metal Form</Label>
            <SearchableSelect
              value={watch("metal_form")}
              onValueChange={(value) => setValue("metal_form", value)}
              options={enums.metal_form_enum.map((v) => ({ value: v, label: v }))}
              placeholder="Select metal form"
              searchPlaceholder="Search metal form..."
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label htmlFor="product_details">Product Details</Label>
            <Textarea
              {...register("product_details")}
              placeholder="Additional product information"
            />
          </div>
        </div>
      </div>

      {/* P2. Logistics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b pb-2">
          Logistics
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {ticketType === "Buy" && (
            <div className="space-y-2">
              <Label htmlFor="country_of_origin">Country of Origin</Label>
              <SearchableSelect
                value={watch("country_of_origin")}
                onValueChange={(value) => setValue("country_of_origin", value)}
                options={enums.country_of_origin_enum.map((v) => ({ value: v, label: v }))}
                placeholder="Select country of origin"
                searchPlaceholder="Search country..."
              />
            </div>
          )}

          {ticketType === "Buy" && (
            <div className="space-y-2">
              <Label htmlFor="ship_from">Ship From</Label>
              <SearchableSelect
                value={watch("ship_from")}
                onValueChange={(value) => setValue("ship_from", value)}
                options={shippingLocations?.map((l) => ({ value: l.name, label: l.name })) || []}
                placeholder="Select origin location"
                searchPlaceholder="Search location..."
              />
            </div>
          )}

          {ticketType === "Sell" && (
            <div className="space-y-2">
              <Label htmlFor="ship_to">Ship To</Label>
              <SearchableSelect
                value={watch("ship_to")}
                onValueChange={(value) => setValue("ship_to", value)}
                options={shippingLocations?.map((l) => ({ value: l.name, label: l.name })) || []}
                placeholder="Select destination location"
                searchPlaceholder="Search location..."
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="incoterms">Incoterms</Label>
            <SearchableSelect
              value={watch("incoterms")}
              onValueChange={(value) => setValue("incoterms", value)}
              options={enums.incoterms_enum.map((v) => ({ value: v, label: v }))}
              placeholder="Select incoterms"
              searchPlaceholder="Search incoterms..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipment_window">Shipment Window</Label>
            <Input type="month" {...register("shipment_window")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="planned_shipments">Planned Shipments</Label>
            <Input
              type="number"
              {...register("planned_shipments")}
              placeholder="Number of shipments"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transport_method">Transport Method</Label>
            <SearchableSelect
              value={watch("transport_method")}
              onValueChange={(value) => setValue("transport_method", value)}
              options={enums.transport_method_enum.map((v) => ({ value: v, label: v }))}
              placeholder="Select transport method"
              searchPlaceholder="Search transport..."
            />
          </div>

          {/* Freight Section */}
          <div className="col-span-2 space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Freight</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFreightLegs([...freightLegs, { freight_type: "", cost_amount: "", cost_currency: "USD" }])}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Leg
              </Button>
            </div>

            <div className="space-y-2">
              {freightLegs.map((leg, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={leg.freight_type}
                      onValueChange={(value) => {
                        const updated = [...freightLegs];
                        updated[index].freight_type = value;
                        setFreightLegs(updated);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ship">Ship</SelectItem>
                        <SelectItem value="Barge">Barge</SelectItem>
                        <SelectItem value="Truck">Truck</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={leg.cost_amount}
                      onChange={(e) => {
                        const updated = [...freightLegs];
                        updated[index].cost_amount = e.target.value;
                        setFreightLegs(updated);
                      }}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Currency</Label>
                    <Select
                      value={leg.cost_currency}
                      onValueChange={(value) => {
                        const updated = [...freightLegs];
                        updated[index].cost_currency = value;
                        setFreightLegs(updated);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CNY">CNY</SelectItem>
                        <SelectItem value="JPY">JPY</SelectItem>
                        <SelectItem value="AUD">AUD</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="CHF">CHF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {freightLegs.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFreightLegs(freightLegs.filter((_, i) => i !== index))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* P3. Pricing */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b pb-2">
          Pricing
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <SearchableSelect
              value={watch("currency")}
              onValueChange={(value) => setValue("currency", value)}
              options={enums.currency_enum.map((v) => ({ value: v, label: v }))}
              placeholder="Select currency"
              searchPlaceholder="Search currency..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pricing_type">Pricing Type *</Label>
            <SearchableSelect
              value={pricingType}
              onValueChange={(value) => setValue("pricing_type", value)}
              options={enums.pricing_type_enum.map((v) => ({ value: v, label: v }))}
              placeholder="Select pricing type"
              searchPlaceholder="Search pricing type..."
            />
          </div>

          {pricingType === "Fixed" && (
            <div className="space-y-2">
              <Label htmlFor="signed_price">Signed Price</Label>
              <Input
                type="number"
                step="0.01"
                {...register("signed_price")}
                placeholder="Fixed price"
              />
            </div>
          )}

          {(pricingType === "Formula" || pricingType === "Index") && (
            <>
              <div className="space-y-2">
                <Label htmlFor="basis">Basis</Label>
                <Input
                  {...register("basis")}
                  placeholder="e.g., 3M LME"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricing_option">Pricing Option</Label>
                <SearchableSelect
                  value={watch("pricing_option")}
                  onValueChange={(value) => setValue("pricing_option", value)}
                  options={[
                    { value: "Buyer", label: "Buyer" },
                    { value: "Seller", label: "Seller" }
                  ]}
                  placeholder="Select pricing option"
                  searchPlaceholder="Search..."
                />
              </div>

              {pricingType === "Formula" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="payable_percent">Payable %</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        {...register("payable_percent")}
                        placeholder="e.g., 95"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lme_action_needed">LME Action Needed</Label>
                    <SearchableSelect
                      value={watch("lme_action_needed")}
                      onValueChange={(value) => setValue("lme_action_needed", value)}
                      options={[
                        { value: "Yes", label: "Yes" },
                        { value: "No", label: "No" }
                      ]}
                      placeholder="Select LME action needed"
                    />
                  </div>
                </>
              )}

              {pricingType === "Index" && (
                <div className="space-y-2">
                  <Label htmlFor="premium_discount">Premium/Discount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("premium_discount")}
                    placeholder="e.g., 100"
                  />
                </div>
              )}

              {/* QP Start Section */}
              <div className="col-span-2 border rounded-md p-4 space-y-4 bg-muted/30">
                <Label className="text-sm font-medium">QP Start</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qp_start_anchor" className="text-xs text-muted-foreground">Anchor Event</Label>
                    <SearchableSelect
                      value={watch("qp_start_anchor")}
                      onValueChange={(value) => setValue("qp_start_anchor", value)}
                      options={[
                        { value: "DEAL_DATE", label: "Deal Date" },
                        { value: "CONTRACT_SIGNED", label: "Contract Signed" },
                        { value: "MATERIAL_READY", label: "Material Ready" },
                        { value: "LOADING_DATE", label: "Loading Date" },
                        { value: "BL_DATE", label: "BL Date" },
                        { value: "ETA_DATE", label: "ETA Date" },
                        { value: "FULLY_PAID", label: "Fully Paid" },
                        { value: "DP_PAID", label: "DP Paid" },
                        { value: "TITLE_TRANSFER", label: "Title Transfer" },
                      ]}
                      placeholder="Select anchor"
                      searchPlaceholder="Search anchor..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qp_start_offset_days" className="text-xs text-muted-foreground">Offset Days (+/-)</Label>
                    <Input
                      type="number"
                      {...register("qp_start_offset_days")}
                      placeholder="e.g., 5 or -3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qp_start" className="text-xs text-muted-foreground">Calculated/Manual Date</Label>
                    <Input type="date" {...register("qp_start")} />
                  </div>
                </div>
              </div>

              {/* QP End Section */}
              <div className="col-span-2 border rounded-md p-4 space-y-4 bg-muted/30">
                <Label className="text-sm font-medium">QP End</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qp_end_anchor" className="text-xs text-muted-foreground">Anchor Event</Label>
                    <SearchableSelect
                      value={watch("qp_end_anchor")}
                      onValueChange={(value) => setValue("qp_end_anchor", value)}
                      options={[
                        { value: "DEAL_DATE", label: "Deal Date" },
                        { value: "CONTRACT_SIGNED", label: "Contract Signed" },
                        { value: "MATERIAL_READY", label: "Material Ready" },
                        { value: "LOADING_DATE", label: "Loading Date" },
                        { value: "BL_DATE", label: "BL Date" },
                        { value: "ETA_DATE", label: "ETA Date" },
                        { value: "FULLY_PAID", label: "Fully Paid" },
                        { value: "DP_PAID", label: "DP Paid" },
                        { value: "TITLE_TRANSFER", label: "Title Transfer" },
                      ]}
                      placeholder="Select anchor"
                      searchPlaceholder="Search anchor..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qp_end_offset_days" className="text-xs text-muted-foreground">Offset Days (+/-)</Label>
                    <Input
                      type="number"
                      {...register("qp_end_offset_days")}
                      placeholder="e.g., -7 or 0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qp_end" className="text-xs text-muted-foreground">Calculated/Manual Date</Label>
                    <Input type="date" {...register("qp_end")} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fixation_method">Fixation Method</Label>
                <SearchableSelect
                  value={watch("fixation_method")}
                  onValueChange={(value) => setValue("fixation_method", value)}
                  options={enums.fixation_method_enum.map((v) => ({ value: v, label: v }))}
                  placeholder="Select fixation method"
                  searchPlaceholder="Search fixation method..."
                />
              </div>

              {watch("fixation_method") === "Custom" && (
                <div className="space-y-2">
                  <Label htmlFor="fixation_custom">Custom Fixation Details</Label>
                  <Input
                    {...register("fixation_custom")}
                    placeholder="Enter custom fixation details"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="lme_price">LME Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("lme_price")}
                  placeholder="LME price"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference_price_source">
                  Reference Price Source
                </Label>
                <Input
                  {...register("reference_price_source")}
                  placeholder="e.g., LME"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* P4. Financial Terms */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b pb-2">
          Financial Terms
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="payment_terms">Payment Terms</Label>
            <Input
              {...register("payment_terms")}
              placeholder="e.g., NET 30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_trigger_event">
              Payment Trigger Event
            </Label>
            <SearchableSelect
              value={watch("payment_trigger_event")}
              onValueChange={(value) => setValue("payment_trigger_event", value)}
              options={enums.payment_trigger_event_enum.map((v) => ({ value: v, label: v }))}
              placeholder="Select trigger event"
              searchPlaceholder="Search event..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_trigger_timing">
              Payment Trigger Timing
            </Label>
            <SearchableSelect
              value={watch("payment_trigger_timing")}
              onValueChange={(value) => setValue("payment_trigger_timing", value)}
              options={enums.payment_trigger_timing_enum.map((v) => ({ value: v, label: v }))}
              placeholder="Select trigger timing"
              searchPlaceholder="Search timing..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_offset_days">Payment Offset Days</Label>
            <Input
              type="number"
              {...register("payment_offset_days")}
              placeholder="Days"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="down_payment_amount_percent">
              Down Payment
            </Label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                {...register("down_payment_amount_percent")}
                placeholder="e.g., 30"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="downpayment_trigger">Down Payment Trigger</Label>
            <SearchableSelect
              value={watch("downpayment_trigger")}
              onValueChange={(value) => setValue("downpayment_trigger", value)}
              options={[
                { value: "Advance with Proforma", label: "Advance with Proforma" },
                { value: "Against Loading", label: "Against Loading" },
                { value: "Against Released BL", label: "Against Released BL" },
                { value: "Booking", label: "Booking" },
                { value: "Invoice", label: "Invoice" },
                { value: "Loading", label: "Loading" },
                { value: "Order Signed Date", label: "Order Signed Date" }
              ]}
              placeholder="Select down payment trigger"
              searchPlaceholder="Search trigger..."
            />
          </div>
        </div>
      </div>

      {/* P5. Internal/Ops */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b pb-2">
          Internal / Ops
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="trader_id">Trader</Label>
            <SearchableSelect
              value={watch("trader_id")?.toString()}
              onValueChange={(value) => setValue("trader_id", parseInt(value))}
              options={traders?.map((t) => ({ value: t.id.toString(), label: t.name })) || []}
              placeholder="Select trader"
              searchPlaceholder="Search trader..."
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea {...register("notes")} placeholder="Internal notes" rows={4} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (ticketId ? "Updating..." : "Creating...") : (ticketId ? "Update Ticket" : "Create Ticket")}
        </Button>
      </div>
    </form>
  );
};
