import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Invoice {
  id: number;
  order_id: string | null;
  bl_order_name: string | null;
  invoice_type: string | null;
  invoice_direction: string | null;
  total_amount: number | null;
  currency: string | null;
  issue_date: string | null;
  original_due_date: string | null;
}

interface Payment {
  id: number;
  invoice_id: number | null;
  paid_date: string | null;
  total_amount_paid: number | null;
}

interface OrderInfo {
  id: string;
  commodity_type: string | null;
  seller_company_name: string | null;
}

interface InventoryDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: Invoice[];
  payments: Payment[];
  orders?: OrderInfo[];
}

export function InventoryDetailsDialog({ open, onOpenChange, invoices, payments, orders = [] }: InventoryDetailsDialogProps) {
  const navigate = useNavigate();

  const formatCurrency = (amount: number | null, currency?: string | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const getLatestPaidDate = (invoiceId: number) => {
    const invoicePayments = payments.filter(p => String(p.invoice_id) === String(invoiceId));
    if (invoicePayments.length === 0) return null;
    
    const latestPayment = invoicePayments.reduce((latest, p) => {
      if (!latest.paid_date) return p;
      if (!p.paid_date) return latest;
      return new Date(p.paid_date) > new Date(latest.paid_date) ? p : latest;
    }, invoicePayments[0]);
    
    return latestPayment.paid_date;
  };

  const getOrderInfo = (orderId: string | null) => {
    if (!orderId) return null;
    return orders.find(o => o.id === orderId) || null;
  };

  const handleOrderClick = (orderId: string) => {
    onOpenChange(false);
    navigate(`/inventory/${orderId}`, { state: { from: 'cash-availability' } });
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inventory Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Payables that have been paid but where the Final Receivable has not yet been issued.
          </p>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Client Name (Supplier)</TableHead>
                  <TableHead>Commodity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Paid Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No inventory invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => {
                    const paidDate = getLatestPaidDate(invoice.id);
                    const orderInfo = getOrderInfo(invoice.order_id);
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">{invoice.id}</TableCell>
                        <TableCell>
                          {invoice.order_id ? (
                            <button
                              onClick={() => handleOrderClick(invoice.order_id!)}
                              className="text-primary hover:underline font-medium"
                            >
                              {invoice.order_id}
                            </button>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{orderInfo?.seller_company_name || "-"}</TableCell>
                        <TableCell>{orderInfo?.commodity_type || "-"}</TableCell>
                        <TableCell>{invoice.invoice_type || "-"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoice.total_amount, invoice.currency)}
                        </TableCell>
                        <TableCell>{invoice.currency || "USD"}</TableCell>
                        <TableCell>
                          {paidDate ? format(new Date(paidDate), "MMM d, yyyy") : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <div className="bg-muted/50 px-4 py-2 rounded-lg">
              <span className="text-sm text-muted-foreground mr-2">Total Inventory:</span>
              <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
