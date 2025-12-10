import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDownCircle, ArrowUpCircle, MessageSquare, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface OverdueInvoice {
  id: number;
  invoice_number: string | null;
  total_amount: number | null;
  company_name: string | null;
  bl_order_name: string | null;
  order_id: string | null;
  invoice_direction: string | null;
  invoice_type: string | null;
  actual_due_date: string | null;
  original_due_date: string | null;
  status: string | null;
  currency: string | null;
}

interface InvoiceComment {
  id: string;
  invoice_id: number;
  comment_text: string;
  created_at: string;
  created_by: string;
}

type DirectionFilter = "all" | "payable" | "receivable";

export function OverduesTab() {
  const queryClient = useQueryClient();
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<OverdueInvoice | null>(null);
  const [newComment, setNewComment] = useState("");
  const today = new Date();

  // Fetch all overdue invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["overdue-invoices"],
    queryFn: async () => {
      const todayStr = format(today, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("invoice")
        .select("*")
        .is("deleted_at", null)
        .neq("status", "Paid")
        .lt("actual_due_date", todayStr);

      if (error) throw error;
      return (data || []) as OverdueInvoice[];
    },
  });

  // Fetch comments for selected invoice
  const { data: comments = [] } = useQuery({
    queryKey: ["invoice-comments", selectedInvoice?.id],
    queryFn: async () => {
      if (!selectedInvoice) return [];
      const { data, error } = await supabase
        .from("invoice_comments")
        .select("*")
        .eq("invoice_id", selectedInvoice.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as InvoiceComment[];
    },
    enabled: !!selectedInvoice,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      if (!selectedInvoice) throw new Error("No invoice selected");
      
      const { error } = await supabase
        .from("invoice_comments")
        .insert({
          invoice_id: selectedInvoice.id,
          comment_text: commentText,
          created_by: "Current User", // In production, use actual user info
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-comments", selectedInvoice?.id] });
      setNewComment("");
      toast.success("Comment added");
    },
    onError: () => {
      toast.error("Failed to add comment");
    },
  });

  // Calculate days overdue for an invoice
  const getDaysOverdue = (invoice: OverdueInvoice): number => {
    const dueDate = invoice.actual_due_date || invoice.original_due_date;
    if (!dueDate) return 0;
    return differenceInDays(today, new Date(dueDate));
  };

  // Separate payables and receivables
  const payableInvoices = useMemo(() => 
    invoices.filter(inv => inv.invoice_direction === "payable"),
    [invoices]
  );

  const receivableInvoices = useMemo(() => 
    invoices.filter(inv => inv.invoice_direction === "receivable"),
    [invoices]
  );

  // Calculate totals and weighted averages
  const payableTotals = useMemo(() => {
    let totalAmount = 0;
    let weightedSum = 0;

    payableInvoices.forEach(inv => {
      const amount = inv.total_amount || 0;
      const daysOverdue = getDaysOverdue(inv);
      totalAmount += amount;
      weightedSum += daysOverdue * amount;
    });

    const weightedAvgDays = totalAmount > 0 ? Math.round(weightedSum / totalAmount) : 0;
    return { totalAmount, weightedAvgDays };
  }, [payableInvoices]);

  const receivableTotals = useMemo(() => {
    let totalAmount = 0;
    let weightedSum = 0;

    receivableInvoices.forEach(inv => {
      const amount = inv.total_amount || 0;
      const daysOverdue = getDaysOverdue(inv);
      totalAmount += amount;
      weightedSum += daysOverdue * amount;
    });

    const weightedAvgDays = totalAmount > 0 ? Math.round(weightedSum / totalAmount) : 0;
    return { totalAmount, weightedAvgDays };
  }, [receivableInvoices]);

  // Filter displayed invoices
  const filteredInvoices = useMemo(() => {
    if (directionFilter === "payable") return payableInvoices;
    if (directionFilter === "receivable") return receivableInvoices;
    return invoices;
  }, [invoices, payableInvoices, receivableInvoices, directionFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading overdues...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Bubbles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payable Overdues */}
        <Card 
          className={cn(
            "cursor-pointer transition-all border-2",
            directionFilter === "payable" 
              ? "border-red-500 bg-red-500/10 ring-2 ring-red-500/30" 
              : "border-red-500/30 bg-red-500/5 hover:border-red-500/50"
          )}
          onClick={() => setDirectionFilter(directionFilter === "payable" ? "all" : "payable")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <ArrowUpCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Payable Overdues</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(payableTotals.totalAmount)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs bg-red-500/10 border-red-500/30">
                    {payableInvoices.length} invoices
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Weighted Avg: <span className="font-medium text-red-600">{payableTotals.weightedAvgDays} days</span>
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receivable Overdues */}
        <Card 
          className={cn(
            "cursor-pointer transition-all border-2",
            directionFilter === "receivable" 
              ? "border-green-500 bg-green-500/10 ring-2 ring-green-500/30" 
              : "border-green-500/30 bg-green-500/5 hover:border-green-500/50"
          )}
          onClick={() => setDirectionFilter(directionFilter === "receivable" ? "all" : "receivable")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <ArrowDownCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Receivable Overdues</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(receivableTotals.totalAmount)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/30">
                    {receivableInvoices.length} invoices
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Weighted Avg: <span className="font-medium text-green-600">{receivableTotals.weightedAvgDays} days</span>
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter indicator */}
      {directionFilter !== "all" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing: <span className="font-medium capitalize">{directionFilter}</span> invoices
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDirectionFilter("all")}
            className="h-6 px-2 text-xs"
          >
            Show All
          </Button>
        </div>
      )}

      {/* Overdue Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Actual Due Date</TableHead>
                  <TableHead className="text-right">Days Overdue</TableHead>
                  <TableHead className="text-center">Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No overdue invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const daysOverdue = getDaysOverdue(invoice);
                    return (
                      <TableRow key={invoice.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">
                          {invoice.company_name || "—"}
                        </TableCell>
                        <TableCell>{invoice.invoice_number || "—"}</TableCell>
                        <TableCell className="text-right font-mono">
                          {invoice.total_amount ? formatCurrency(invoice.total_amount) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "capitalize",
                              invoice.invoice_direction === "payable" 
                                ? "bg-red-500/10 text-red-600 border-red-500/30"
                                : "bg-green-500/10 text-green-600 border-green-500/30"
                            )}
                          >
                            {invoice.invoice_direction || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {invoice.actual_due_date 
                            ? format(new Date(invoice.actual_due_date), "MMM d, yyyy")
                            : "—"
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-medium",
                            daysOverdue > 30 ? "text-red-600" : daysOverdue > 14 ? "text-amber-600" : "text-foreground"
                          )}>
                            {daysOverdue} days
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedInvoice(invoice)}
                            className="h-8 w-8 p-0"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Comments Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Comments - Invoice #{selectedInvoice?.invoice_number || selectedInvoice?.id}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Comments list */}
            <div className="max-h-64 overflow-y-auto space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <p className="text-sm">{comment.comment_text}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">{comment.created_by}</span>
                      <span>•</span>
                      <span>{format(new Date(comment.created_at), "MMM d, yyyy HH:mm")}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add new comment */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
              Close
            </Button>
            <Button 
              onClick={handleSubmitComment} 
              disabled={!newComment.trim() || addCommentMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Add Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}