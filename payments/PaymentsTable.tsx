import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Plus, FileText } from "lucide-react";
import { InvoiceDetailDrawer } from "./InvoiceDetailDrawer";
import { AddPaymentDialog } from "./AddPaymentDialog";

export type ControlPaymentRow = {
  id: number;
  invoice_id: number | null;
  invoice_direction: string | null;
  order_id: string | null;
  bl_order_name: string | null;
  company_name: string | null;
  currency: string | null;
  total_amount: number | null;
  total_amount_paid: number | null;
  original_due_date: string | null;
  actual_due_date: string | null;
  overdue_days: number | null;
  paid_date: string | null;
  reference_note: string | null;
  invoice_type?: string;
  invoice_number?: string;
  status?: string;
};

type PaymentsTableProps = {
  data: ControlPaymentRow[];
  loadingDate?: string | null;
  eta?: string | null;
  ata?: string | null;
  variant?: "order" | "bl";
  onRefresh?: () => void;
};

export function PaymentsTable({
  data,
  loadingDate,
  eta,
  ata,
  variant = "order",
  onRefresh,
}: PaymentsTableProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<ControlPaymentRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedForPayment, setSelectedForPayment] = useState<ControlPaymentRow | null>(null);

  const formatCurrency = (value: number | null, currency: string | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
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

  const getStatusBadge = (status: string | null, overdueDays: number | null) => {
    if (overdueDays && overdueDays > 0) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    switch (status?.toLowerCase()) {
      case "paid":
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Paid</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">Partial</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status || "—"}</Badge>;
    }
  };

  const handleViewDetails = (row: ControlPaymentRow) => {
    setSelectedInvoice(row);
    setDrawerOpen(true);
  };

  const handleAddPayment = (row: ControlPaymentRow) => {
    setSelectedForPayment(row);
    setPaymentDialogOpen(true);
  };

  const outstanding = (row: ControlPaymentRow) => {
    const total = row.total_amount || 0;
    const paid = row.total_amount_paid || 0;
    return total - paid;
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No invoices found</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Invoice #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Invoiced</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Actual Due</TableHead>
              {variant === "bl" && <TableHead>Paid Date</TableHead>}
              <TableHead>Overdue Days</TableHead>
              {variant === "bl" && (
                <>
                  <TableHead>ETA</TableHead>
                  <TableHead>ATA</TableHead>
                </>
              )}
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{row.invoice_number || `INV-${row.invoice_id}`}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {row.invoice_type || "—"}
                  </Badge>
                </TableCell>
                <TableCell>{row.invoice_direction || "—"}</TableCell>
                <TableCell className="max-w-[150px] truncate">{row.company_name || "—"}</TableCell>
                <TableCell>{row.currency || "—"}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(row.total_amount, row.currency)}
                </TableCell>
                <TableCell className="text-right text-green-600">
                  {formatCurrency(row.total_amount_paid, row.currency)}
                </TableCell>
                <TableCell className="text-right text-orange-600 font-medium">
                  {formatCurrency(outstanding(row), row.currency)}
                </TableCell>
                <TableCell>{formatDate(row.original_due_date)}</TableCell>
                <TableCell>{formatDate(row.actual_due_date)}</TableCell>
                {variant === "bl" && <TableCell>{formatDate(row.paid_date)}</TableCell>}
                <TableCell>
                  {row.overdue_days && row.overdue_days > 0 ? (
                    <span className="text-destructive font-medium">{row.overdue_days} days</span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                {variant === "bl" && (
                  <>
                    <TableCell>{formatDate(eta)}</TableCell>
                    <TableCell>{formatDate(ata)}</TableCell>
                  </>
                )}
                <TableCell>{getStatusBadge(row.status, row.overdue_days)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetails(row)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddPayment(row)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Payment
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Invoice Detail Drawer */}
      <InvoiceDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        invoice={selectedInvoice}
        loadingDate={loadingDate}
        eta={eta}
        ata={ata}
        onPaymentAdded={onRefresh}
      />

      {/* Add Payment Dialog */}
      <AddPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={selectedForPayment}
        onSuccess={() => {
          setPaymentDialogOpen(false);
          onRefresh?.();
        }}
      />
    </>
  );
}
