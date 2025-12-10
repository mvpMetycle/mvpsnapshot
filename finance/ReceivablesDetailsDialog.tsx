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

interface OrderInfo {
  id: string;
  commodity_type: string | null;
  buyer_company_name: string | null;
}

interface BlOrderInfo {
  id: number;
  bl_order_name: string | null;
}

interface ReceivablesDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: Invoice[];
  orders?: OrderInfo[];
  blOrders?: BlOrderInfo[];
}

export function ReceivablesDetailsDialog({ open, onOpenChange, invoices, orders = [], blOrders = [] }: ReceivablesDetailsDialogProps) {
  const navigate = useNavigate();

  const formatCurrency = (amount: number | null, currency?: string | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const getOrderInfo = (orderId: string | null) => {
    if (!orderId) return null;
    return orders.find(o => o.id === orderId) || null;
  };

  const getBlOrderId = (blOrderName: string | null) => {
    if (!blOrderName) return null;
    const blOrder = blOrders.find(b => b.bl_order_name === blOrderName);
    return blOrder?.id || null;
  };

  const handleBlOrderClick = (blOrderName: string) => {
    const blOrderId = getBlOrderId(blOrderName);
    if (blOrderId) {
      onOpenChange(false);
      navigate(`/bl-orders/${blOrderId}`, { state: { from: 'cash-availability' } });
    }
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receivables Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Final Receivable invoices where the payable side has been fully paid.
          </p>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>BL Order Name</TableHead>
                  <TableHead>Client Name (Buyer)</TableHead>
                  <TableHead>Commodity</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No receivable invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => {
                    const orderInfo = getOrderInfo(invoice.order_id);
                    const blOrderId = getBlOrderId(invoice.bl_order_name);
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">{invoice.id}</TableCell>
                        <TableCell>
                          {invoice.bl_order_name && blOrderId ? (
                            <button
                              onClick={() => handleBlOrderClick(invoice.bl_order_name!)}
                              className="text-primary hover:underline font-medium"
                            >
                              {invoice.bl_order_name}
                            </button>
                          ) : (
                            invoice.bl_order_name || "-"
                          )}
                        </TableCell>
                        <TableCell>{orderInfo?.buyer_company_name || "-"}</TableCell>
                        <TableCell>{orderInfo?.commodity_type || "-"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoice.total_amount, invoice.currency)}
                        </TableCell>
                        <TableCell>{invoice.currency || "USD"}</TableCell>
                        <TableCell>
                          {invoice.issue_date ? format(new Date(invoice.issue_date), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          {invoice.original_due_date ? format(new Date(invoice.original_due_date), "MMM d, yyyy") : "-"}
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
              <span className="text-sm text-muted-foreground mr-2">Total Receivables:</span>
              <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
