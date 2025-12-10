import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type EntityChecks = {
  ticket: () => Promise<{ canDelete: boolean; reason?: string }>;
  order: () => Promise<{ canDelete: boolean; reason?: string }>;
  bl_order: () => Promise<{ canDelete: boolean; reason?: string }>;
  invoice: () => Promise<{ canDelete: boolean; reason?: string }>;
  payment: () => Promise<{ canDelete: boolean; reason?: string }>;
};

// Check if a ticket can be deleted (not linked to orders, inventory_match, etc.)
export async function checkTicketDeletable(ticketId: number): Promise<{ canDelete: boolean; reason?: string }> {
  // Check if ticket is referenced in any order (buyer or seller fields contain the ID)
  const { data: orders, error: ordersError } = await supabase
    .from("order")
    .select("id, buyer, seller")
    .is("deleted_at", null)
    .or(`buyer.ilike.%${ticketId}%,seller.ilike.%${ticketId}%`);
  
  if (ordersError) {
    console.error("Error checking orders:", ordersError);
    return { canDelete: false, reason: "Failed to check related records" };
  }
  
  // More precise check - buyer and seller are comma-separated ticket IDs
  const linkedOrders = orders?.filter(order => {
    const buyerIds = order.buyer?.split(",").map(id => parseInt(id.trim())).filter(Boolean) || [];
    const sellerIds = order.seller?.split(",").map(id => parseInt(id.trim())).filter(Boolean) || [];
    return buyerIds.includes(ticketId) || sellerIds.includes(ticketId);
  });

  if (linkedOrders && linkedOrders.length > 0) {
    return { 
      canDelete: false, 
      reason: `This ticket is linked to ${linkedOrders.length} order(s). Remove the order references first.` 
    };
  }

  // Check inventory_match
  const { data: matches, error: matchError } = await supabase
    .from("inventory_match")
    .select("id")
    .or(`buy_ticket_id.eq.${ticketId},sell_ticket_id.eq.${ticketId}`)
    .limit(1);

  if (matchError) {
    console.error("Error checking inventory matches:", matchError);
    return { canDelete: false, reason: "Failed to check related records" };
  }

  if (matches && matches.length > 0) {
    return { 
      canDelete: false, 
      reason: "This ticket is linked to inventory matches. Remove those first." 
    };
  }

  // Check approval_requests
  const { data: approvals, error: approvalError } = await supabase
    .from("approval_requests")
    .select("id")
    .eq("ticket_id", ticketId)
    .limit(1);

  if (!approvalError && approvals && approvals.length > 0) {
    return { 
      canDelete: false, 
      reason: "This ticket has approval requests. Delete those first." 
    };
  }

  return { canDelete: true };
}

// Check if an order can be deleted (no BLs, invoices, or payments)
export async function checkOrderDeletable(orderId: string): Promise<{ canDelete: boolean; reason?: string }> {
  // Check for BL orders
  const { data: blOrders, error: blError } = await supabase
    .from("bl_order")
    .select("id")
    .eq("order_id", orderId)
    .is("deleted_at", null)
    .limit(1);

  if (blError) {
    console.error("Error checking BL orders:", blError);
    return { canDelete: false, reason: "Failed to check related records" };
  }

  if (blOrders && blOrders.length > 0) {
    return { 
      canDelete: false, 
      reason: "This order has BL orders. Delete those first." 
    };
  }

  // Check for invoices
  const { data: invoices, error: invoiceError } = await supabase
    .from("invoice")
    .select("id")
    .eq("order_id", orderId)
    .is("deleted_at", null)
    .limit(1);

  if (invoiceError) {
    console.error("Error checking invoices:", invoiceError);
    return { canDelete: false, reason: "Failed to check related records" };
  }

  if (invoices && invoices.length > 0) {
    return { 
      canDelete: false, 
      reason: "This order has invoices. Delete those first." 
    };
  }

  // Check for inventory matches
  const { data: matches, error: matchError } = await supabase
    .from("inventory_match")
    .select("id")
    .eq("order_id", orderId)
    .limit(1);

  if (matchError) {
    console.error("Error checking inventory matches:", matchError);
    return { canDelete: false, reason: "Failed to check related records" };
  }

  if (matches && matches.length > 0) {
    return { 
      canDelete: false, 
      reason: "This order has inventory matches. Delete those first." 
    };
  }

  return { canDelete: true };
}

// Check if a BL order can be deleted (no invoices or payments)
export async function checkBLOrderDeletable(blOrderId: number, blOrderName: string | null): Promise<{ canDelete: boolean; reason?: string }> {
  // Check for invoices by bl_order_name
  if (blOrderName) {
    const { data: invoices, error: invoiceError } = await supabase
      .from("invoice")
      .select("id")
      .eq("bl_order_name", blOrderName)
      .is("deleted_at", null)
      .limit(1);

    if (invoiceError) {
      console.error("Error checking invoices:", invoiceError);
      return { canDelete: false, reason: "Failed to check related records" };
    }

    if (invoices && invoices.length > 0) {
      return { 
        canDelete: false, 
        reason: "This BL order has invoices. Delete those first." 
      };
    }
  }

  // Check for claims
  const { data: claims, error: claimsError } = await supabase
    .from("claims")
    .select("id")
    .eq("bl_order_id", blOrderId)
    .is("deleted_at", null)
    .limit(1);

  if (!claimsError && claims && claims.length > 0) {
    return { 
      canDelete: false, 
      reason: "This BL order has claims. Delete those first." 
    };
  }

  return { canDelete: true };
}

// Check if an invoice can be deleted (no payments)
export async function checkInvoiceDeletable(invoiceId: number): Promise<{ canDelete: boolean; reason?: string }> {
  const { data: payments, error } = await supabase
    .from("payment")
    .select("id")
    .eq("invoice_id", invoiceId)
    .is("deleted_at", null)
    .limit(1);

  if (error) {
    console.error("Error checking payments:", error);
    return { canDelete: false, reason: "Failed to check related records" };
  }

  if (payments && payments.length > 0) {
    return { 
      canDelete: false, 
      reason: "This invoice has payments. Delete those first." 
    };
  }

  return { canDelete: true };
}

// Soft delete functions that save the reason
export async function softDeleteTicket(ticketId: number, reason: string): Promise<void> {
  // Also soft delete related freight legs and costs
  const { data: legs } = await supabase
    .from("ticket_freight_legs")
    .select("id")
    .eq("ticket_id", ticketId);
  
  if (legs && legs.length > 0) {
    const legIds = legs.map(l => l.id);
    // Hard delete costs (no soft delete column)
    await supabase.from("ticket_freight_costs").delete().in("freight_leg_id", legIds);
    // Hard delete legs (no soft delete column)
    await supabase.from("ticket_freight_legs").delete().eq("ticket_id", ticketId);
  }

  // Hard delete ticket photos (storage files and records)
  const { data: photos } = await supabase
    .from("ticket_photos")
    .select("file_path")
    .eq("ticket_id", ticketId);
  
  if (photos && photos.length > 0) {
    const filePaths = photos.map(p => p.file_path);
    await supabase.storage.from("ticket-photos").remove(filePaths);
    await supabase.from("ticket_photos").delete().eq("ticket_id", ticketId);
  }

  // Soft delete the ticket
  const { error } = await supabase
    .from("ticket")
    .update({ deleted_at: new Date().toISOString(), delete_reason: reason })
    .eq("id", ticketId);

  if (error) throw error;
}

export async function softDeleteOrder(orderId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from("order")
    .update({ deleted_at: new Date().toISOString(), delete_reason: reason })
    .eq("id", orderId);

  if (error) throw error;
}

export async function softDeleteBLOrder(blOrderId: number, reason: string): Promise<void> {
  // Soft delete container photos
  await supabase
    .from("bl_container_photos")
    .update({ deleted_at: new Date().toISOString(), delete_reason: reason })
    .eq("bl_order_id", blOrderId);

  // Soft delete the BL order
  const { error } = await supabase
    .from("bl_order")
    .update({ deleted_at: new Date().toISOString(), delete_reason: reason })
    .eq("id", blOrderId);

  if (error) throw error;
}

export async function softDeleteInvoice(invoiceId: number, reason: string): Promise<void> {
  const { error } = await supabase
    .from("invoice")
    .update({ deleted_at: new Date().toISOString(), delete_reason: reason })
    .eq("id", invoiceId);

  if (error) throw error;
}

export async function softDeletePayment(paymentId: number, reason: string): Promise<void> {
  const { error } = await supabase
    .from("payment")
    .update({ deleted_at: new Date().toISOString(), delete_reason: reason })
    .eq("id", paymentId);

  if (error) throw error;
}

export async function softDeleteCompanyDocument(documentId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from("company_documents")
    .update({ deleted_at: new Date().toISOString(), delete_reason: reason })
    .eq("id", documentId);

  if (error) throw error;
}

export async function softDeleteCompanyNote(noteId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from("company_notes")
    .update({ deleted_at: new Date().toISOString(), delete_reason: reason })
    .eq("id", noteId);

  if (error) throw error;
}

export async function softDeleteClaim(claimId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from("claims")
    .update({ deleted_at: new Date().toISOString(), delete_reason: reason })
    .eq("id", claimId);

  if (error) throw error;
}

export async function softDeleteContainerPhoto(photoId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from("bl_container_photos")
    .update({ deleted_at: new Date().toISOString(), delete_reason: reason })
    .eq("id", photoId);

  if (error) throw error;
}

// Hook for managing delete state
export function useDeleteConfirmation() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const performDelete = async (
    entityLabel: string,
    checkFn: () => Promise<{ canDelete: boolean; reason?: string }>,
    deleteFn: (reason: string) => Promise<void>,
    reason: string,
    onSuccess?: () => void
  ) => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Run referential integrity check
      const { canDelete, reason: blockReason } = await checkFn();
      
      if (!canDelete) {
        toast.error(`Cannot delete ${entityLabel}`, {
          description: blockReason,
        });
        setDeleteError(blockReason || "Cannot delete");
        return false;
      }

      // Perform the delete with reason
      await deleteFn(reason);
      toast.success(`${entityLabel} deleted successfully`);
      onSuccess?.();
      return true;
    } catch (error: any) {
      console.error(`Delete ${entityLabel} error:`, error);
      const message = error.message || `Failed to delete ${entityLabel}`;
      toast.error(message);
      setDeleteError(message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { isDeleting, deleteError, performDelete };
}
