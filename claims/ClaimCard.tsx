import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, DollarSign, Percent } from "lucide-react";
import { differenceInDays } from "date-fns";

type ClaimStatus = "Open" | "Closed" | string;

type Claim = {
  id: string;
  claim_reference: string | null;
  claim_type: string;
  claimed_value_amount: number | null;
  claimed_value_currency: string | null;
  final_settlement_amount: number | null;
  final_settlement_currency: string | null;
  status: ClaimStatus;
  ata: string | null;
  claimed_file_date?: string | null;
  created_at: string;
  buyer?: { name: string } | null;
  supplier?: { name: string } | null;
};

type ClaimCardProps = {
  claim: Claim;
  orderTotalAmount?: number | null;
  onDoubleClick: () => void;
};

export function ClaimCard({ claim, orderTotalAmount, onDoubleClick }: ClaimCardProps) {
  const getStatusColor = (status: ClaimStatus) => {
    // Normalize status to handle legacy values
    const normalizedStatus = status === "closed" || status === "Closed" ? "Closed" : "Open";
    switch (normalizedStatus) {
      case "Closed":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "Open":
      default:
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    }
  };

  const getStatusLabel = (status: ClaimStatus) => {
    // Normalize and display
    if (status === "closed" || status === "Closed") return "Closed";
    return "Open";
  };

  const getClaimTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      loss_of_metal: "Loss of Metal",
      contamination: "Contamination",
      weight_loss: "Weight Loss",
      dust: "Dust",
      other: "Other",
      // Legacy types for backwards compatibility
      quality: "Quality Issue",
      moisture: "Moisture",
    };
    return labels[type] || type;
  };

  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (amount === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  // Calculate days to raise claim (claimed_file_date - ATA)
  const daysToRaiseClaim = claim.ata && claim.claimed_file_date
    ? differenceInDays(new Date(claim.claimed_file_date), new Date(claim.ata))
    : claim.ata 
    ? differenceInDays(new Date(claim.created_at), new Date(claim.ata))
    : null;

  // Color coding for days: Green < 5, Yellow 5-15, Red > 15
  const getDaysColorClass = (days: number | null) => {
    if (days === null) return "bg-muted text-muted-foreground";
    if (days < 5) return "bg-green-500/10 text-green-600";
    if (days <= 15) return "bg-yellow-500/10 text-yellow-600";
    return "bg-red-500/10 text-red-600";
  };

  // Calculate claimed % of order total
  const claimedPercentage = orderTotalAmount && claim.claimed_value_amount
    ? (claim.claimed_value_amount / orderTotalAmount) * 100
    : null;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onDoubleClick={onDoubleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className="font-semibold">{claim.claim_reference || "New Claim"}</span>
              <Badge className={getStatusColor(claim.status)}>
                {getStatusLabel(claim.status)}
              </Badge>
            </div>

            {/* Claim Type */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{getClaimTypeLabel(claim.claim_type)}</span>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Claimed</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-orange-600">
                      {formatCurrency(claim.claimed_value_amount, claim.claimed_value_currency)}
                    </p>
                    {claimedPercentage !== null && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Percent className="h-3 w-3" />
                        {claimedPercentage.toFixed(1)}% of order
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Settlement</p>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(claim.final_settlement_amount, claim.final_settlement_currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Days to Raise Claim - Color Coded */}
            {daysToRaiseClaim !== null && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Days to Raise:</span>
                <Badge className={getDaysColorClass(daysToRaiseClaim)}>
                  {daysToRaiseClaim} days
                </Badge>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
          Double-click to view details
        </p>
      </CardContent>
    </Card>
  );
}