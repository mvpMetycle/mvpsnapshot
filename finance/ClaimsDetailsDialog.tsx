import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Claim {
  id: string;
  order_id: string | null;
  bl_order_name: string | null;
  claimed_value_amount: number | null;
  status: string;
  claim_reference: string | null;
}

interface ClaimsDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claims: Claim[];
}

export function ClaimsDetailsDialog({ open, onOpenChange, claims }: ClaimsDetailsDialogProps) {
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const totalAmount = claims.reduce((sum, claim) => sum + (claim.claimed_value_amount || 0), 0);

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'closed') {
      return <Badge variant="secondary">Closed</Badge>;
    }
    return <Badge variant="destructive">Open</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Claims Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Active claims that reduce available cash equivalents.
          </p>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim Reference</TableHead>
                  <TableHead>Order / BL</TableHead>
                  <TableHead className="text-right">Claimed Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No active claims found
                    </TableCell>
                  </TableRow>
                ) : (
                  claims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-mono">{claim.claim_reference || claim.id.slice(0, 8)}</TableCell>
                      <TableCell>{claim.order_id || claim.bl_order_name || "-"}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {formatCurrency(claim.claimed_value_amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(claim.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <div className="bg-destructive/10 px-4 py-2 rounded-lg">
              <span className="text-sm text-muted-foreground mr-2">Total Claims:</span>
              <span className="text-lg font-bold text-destructive">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}