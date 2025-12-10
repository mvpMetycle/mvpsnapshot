import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface OptimizeMatchingProps {
  onBack: () => void;
  onClose: () => void;
}

export const OptimizeMatching = ({ onBack, onClose }: OptimizeMatchingProps) => {
  const [commodityType, setCommodityType] = useState("");
  const [quantity, setQuantity] = useState("");
  const queryClient = useQueryClient();

  const calculateTicketPrice = (ticket: any): number => {
    if (ticket.pricing_type === "Fixed") {
      return ticket.signed_price || 0;
    } else if (ticket.pricing_type === "Formula") {
      if (ticket.lme_price && ticket.payable_percent) {
        return ticket.lme_price * ticket.payable_percent;
      }
      return 0;
    } else if (ticket.pricing_type === "Index") {
      if (ticket.lme_price && ticket.premium_discount) {
        return ticket.lme_price + ticket.premium_discount;
      }
      return 0;
    }
    return 0;
  };

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const { data, error } = await supabase.from("order").insert(orderData).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Optimized orders created successfully");
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to create orders: ${error.message}`);
    },
  });

  const handleOptimize = async () => {
    if (!commodityType || !quantity) {
      toast.error("Please fill in commodity type and quantity");
      return;
    }

    const targetQty = parseFloat(quantity);

    // Fetch approved tickets matching criteria
    const [buyResult, sellResult] = await Promise.all([
      supabase
        .from("ticket")
        .select("*")
        .eq("type", "Buy")
        .eq("status", "Approved")
        .eq("commodity_type", commodityType as any),
      supabase
        .from("ticket")
        .select("*")
        .eq("type", "Sell")
        .eq("status", "Approved")
        .eq("commodity_type", commodityType as any),
    ]);

    if (buyResult.error || sellResult.error) {
      toast.error("Failed to fetch tickets");
      return;
    }

    const buyTickets = buyResult.data || [];
    const sellTickets = sellResult.data || [];

    if (buyTickets.length === 0 || sellTickets.length === 0) {
      toast.error("No matching tickets found with the specified criteria");
      return;
    }

    // Sort tickets by calculated price
    const sortedBuyTickets = buyTickets
      .map(t => ({ ...t, calculatedPrice: calculateTicketPrice(t) }))
      .sort((a, b) => a.calculatedPrice - b.calculatedPrice); // Lowest price first
    
    const sortedSellTickets = sellTickets
      .map(t => ({ ...t, calculatedPrice: calculateTicketPrice(t) }))
      .sort((a, b) => b.calculatedPrice - a.calculatedPrice); // Highest price first

    // Optimize: maximize margin
    let remainingQty = targetQty;
    const selectedBuys: any[] = [];
    const selectedSells: any[] = [];

    // Select best sell tickets (highest price first)
    for (const sellTicket of sortedSellTickets) {
      if (remainingQty <= 0) break;
      const allocQty = Math.min(remainingQty, sellTicket.quantity || 0);
      selectedSells.push({ ...sellTicket, allocQty });
      remainingQty -= allocQty;
    }

    if (remainingQty > 0) {
      toast.error(`Not enough sell tickets to match ${targetQty} MT`);
      return;
    }

    // Select best buy tickets (lowest price first)
    remainingQty = targetQty;
    for (const buyTicket of sortedBuyTickets) {
      if (remainingQty <= 0) break;
      const allocQty = Math.min(remainingQty, buyTicket.quantity || 0);
      selectedBuys.push({ ...buyTicket, allocQty });
      remainingQty -= allocQty;
    }

    if (remainingQty > 0) {
      toast.error(`Not enough buy tickets to match ${targetQty} MT`);
      return;
    }

    // Calculate average prices using proper pricing logic
    const avgBuyPrice =
      selectedBuys.reduce((sum, t) => sum + calculateTicketPrice(t) * t.allocQty, 0) / targetQty;
    const avgSellPrice =
      selectedSells.reduce((sum, t) => sum + calculateTicketPrice(t) * t.allocQty, 0) / targetQty;

    if (avgBuyPrice >= avgSellPrice) {
      toast.error("Cannot create order: Buy price exceeds sell price");
      return;
    }

    // Generate order ID
    const orderId = String(Math.floor(10000 + Math.random() * 90000));

    const buyIncoterms = selectedBuys[0]?.incoterms || "—";
    const sellIncoterms = selectedSells[0]?.incoterms || "—";

    const orderData = {
      id: orderId,
      buyer: selectedBuys.map((t) => t.id).join(","),
      seller: selectedSells.map((t) => t.id).join(","),
      commodity_type: commodityType,
      metal_form: selectedBuys[0]?.metal_form,
      isri_grade: selectedBuys[0]?.isri_grade,
      allocated_quantity_mt: targetQty,
      buy_price: avgBuyPrice,
      sell_price: avgSellPrice,
      margin: (avgSellPrice - avgBuyPrice) / avgBuyPrice,
      status: "Allocated",
      transaction_type: "B2B",
      ship_to: selectedSells[0]?.ship_to,
      ship_from: selectedBuys[0]?.ship_from,
      product_details: `${buyIncoterms} / ${sellIncoterms}`,
      created_at: new Date().toISOString(),
    };

    createOrderMutation.mutate(orderData);
  };

  const commodityOptions = [
    { value: "Aluminium", label: "Aluminium" },
    { value: "Mixed metals", label: "Mixed metals" },
    { value: "Zinc", label: "Zinc" },
    { value: "Magnesium", label: "Magnesium" },
    { value: "Lead", label: "Lead" },
    { value: "Nickel/stainless/hi-temp", label: "Nickel/stainless/hi-temp" },
    { value: "Copper", label: "Copper" },
    { value: "Brass", label: "Brass" },
    { value: "Steel", label: "Steel" },
    { value: "Iron", label: "Iron" },
  ];

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="space-y-4">
        <p className="text-muted-foreground">
          Enter your requirements and the system will automatically find and match the best
          tickets to maximize margin.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Commodity Type *</Label>
            <SearchableSelect
              value={commodityType}
              onValueChange={setCommodityType}
              options={commodityOptions}
              placeholder="Select commodity"
              searchPlaceholder="Search commodities..."
            />
          </div>

          <div className="space-y-2">
            <Label>Quantity (MT) *</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button onClick={handleOptimize}>
            Optimize & Create Orders
          </Button>
        </div>
      </div>
    </div>
  );
};
