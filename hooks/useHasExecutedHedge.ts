import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Check if there's an executed hedge linked to an order via hedge_link + hedge_execution
 * where hedge_execution.status IN ('OPEN', 'EXECUTED')
 */
export function useHasExecutedHedgeForOrder(orderId: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ["has-executed-hedge-order", orderId],
    queryFn: async () => {
      if (!orderId) return false;
      
      // Get hedge_link entries for this order where execution status is OPEN or EXECUTED
      const { data: links, error: linkError } = await supabase
        .from("hedge_link")
        .select("hedge_execution_id")
        .eq("link_id", orderId)
        .eq("link_level", "Order");
      
      if (linkError) throw linkError;
      if (!links || links.length === 0) return false;
      
      // Check if any linked execution exists with status OPEN or EXECUTED
      const executionIds = links.map(l => l.hedge_execution_id);
      const { data: executions, error: execError } = await supabase
        .from("hedge_execution")
        .select("id")
        .in("id", executionIds)
        .in("status", ["OPEN", "EXECUTED"])
        .is("deleted_at", null)
        .limit(1);
      
      if (execError) throw execError;
      return !!executions && executions.length > 0;
    },
    enabled: !!orderId,
  });

  return {
    hasExecutedHedge: data ?? false,
    isLoading,
  };
}

/**
 * Check if there's an executed hedge linked to a BL order or its parent order
 * via hedge_link + hedge_execution where status IN ('OPEN', 'EXECUTED')
 */
export function useHasExecutedHedgeForBL(blOrderId: number | null, parentOrderId?: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ["has-executed-hedge-bl", blOrderId, parentOrderId],
    queryFn: async () => {
      if (!blOrderId) return false;
      
      const blOrderIdStr = blOrderId.toString();
      
      // Get hedge_link entries for this BL or its parent order
      let query = supabase
        .from("hedge_link")
        .select("hedge_execution_id");
      
      if (parentOrderId) {
        // Check both BL and parent order
        query = query.or(
          `and(link_id.eq.${blOrderIdStr},link_level.eq.Bl_order),and(link_id.eq.${parentOrderId},link_level.eq.Order)`
        );
      } else {
        // Only check BL
        query = query.eq("link_id", blOrderIdStr).eq("link_level", "Bl_order");
      }
      
      const { data: links, error: linkError } = await query;
      
      if (linkError) throw linkError;
      if (!links || links.length === 0) return false;
      
      // Check if any linked execution exists with status OPEN or EXECUTED
      const executionIds = links.map(l => l.hedge_execution_id);
      const { data: executions, error: execError } = await supabase
        .from("hedge_execution")
        .select("id")
        .in("id", executionIds)
        .in("status", ["OPEN", "EXECUTED"])
        .is("deleted_at", null)
        .limit(1);
      
      if (execError) throw execError;
      return !!executions && executions.length > 0;
    },
    enabled: !!blOrderId,
  });

  return {
    hasExecutedHedge: data ?? false,
    isLoading,
  };
}
