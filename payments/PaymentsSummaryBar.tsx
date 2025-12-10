import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, AlertCircle, CheckCircle2, Calendar, CalendarCheck } from "lucide-react";

type PaymentsSummaryBarProps = {
  totalRequired: number;
  totalPaid: number;
  outstanding: number;
  overdueAmount?: number;
  currency?: string;
  eta?: string | null;
  ata?: string | null;
  finalInvoiceTotal?: number;
  variant?: "order" | "bl";
  paidDate?: string | null;
};

export function PaymentsSummaryBar({
  totalRequired,
  totalPaid,
  outstanding,
  overdueAmount = 0,
  currency = "USD",
  eta,
  ata,
  finalInvoiceTotal,
  variant = "order",
  paidDate,
}: PaymentsSummaryBarProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium">
              {variant === "bl" ? "Total Invoiced" : "Total Required"}
            </span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(totalRequired)}</p>
        </CardContent>
      </Card>

      {variant === "bl" && finalInvoiceTotal !== undefined && (
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Final Invoice</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(finalInvoiceTotal)}</p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium">Total Paid</span>
          </div>
          <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </CardContent>
      </Card>

      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium">Outstanding</span>
          </div>
          <p className="text-lg font-bold text-orange-600">{formatCurrency(outstanding)}</p>
        </CardContent>
      </Card>

      {overdueAmount > 0 && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Overdue</span>
            </div>
            <p className="text-lg font-bold text-destructive">{formatCurrency(overdueAmount)}</p>
          </CardContent>
        </Card>
      )}

      {variant === "bl" && (eta || ata) && (
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium">ETA / ATA</span>
            </div>
            <p className="text-sm font-medium">
              {formatDate(eta)} / {formatDate(ata)}
            </p>
          </CardContent>
        </Card>
      )}

      {paidDate && (
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CalendarCheck className="h-4 w-4" />
              <span className="text-xs font-medium">Paid Date</span>
            </div>
            <p className="text-lg font-bold text-green-600">{formatDate(paidDate)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
