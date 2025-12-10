import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle, Clock, ArrowRight } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TicketDetailDialog } from "./TicketDetailDialog";

interface Ticket {
  id: number;
  type: string;
  commodity_type: string | null;
  quantity: number | null;
  currency: string | null;
  status: string | null;
  client_name: string | null;
  isri_grade: string | null;
  ship_from: string | null;
  ship_to: string | null;
  pricing_type: string | null;
  signed_price: number | null;
  lme_price: number | null;
  payable_percent: number | null;
  premium_discount: number | null;
  traders?: { name: string } | null;
}

interface TicketsKanbanBoardProps {
  tickets: Ticket[];
  onMatchSelected: (buyTicketId: number, sellTicketId: number) => void;
}

export const TicketsKanbanBoard = ({ tickets, onMatchSelected }: TicketsKanbanBoardProps) => {
  const [selectedBuyTicket, setSelectedBuyTicket] = useState<number | null>(null);
  const [selectedSellTicket, setSelectedSellTicket] = useState<number | null>(null);
  const [detailTicketId, setDetailTicketId] = useState<number | null>(null);
  
  const buyScrollRef = useRef<HTMLDivElement>(null);
  const sellScrollRef = useRef<HTMLDivElement>(null);

  const allBuyTickets = tickets.filter(t => t.type === "Buy");
  const allSellTickets = tickets.filter(t => t.type === "Sell");

  // Get selected ticket objects for filtering
  const selectedBuyTicketObj = selectedBuyTicket ? allBuyTickets.find(t => t.id === selectedBuyTicket) : null;
  const selectedSellTicketObj = selectedSellTicket ? allSellTickets.find(t => t.id === selectedSellTicket) : null;

  // Filter opposite side by commodity type when a ticket is selected
  const buyTickets = selectedSellTicketObj 
    ? allBuyTickets.filter(t => t.commodity_type === selectedSellTicketObj.commodity_type)
    : allBuyTickets;
  
  const sellTickets = selectedBuyTicketObj
    ? allSellTickets.filter(t => t.commodity_type === selectedBuyTicketObj.commodity_type)
    : allSellTickets;

  const calculatePrice = (ticket: Ticket) => {
    if (ticket.pricing_type === "Fixed") {
      return ticket.signed_price || 0;
    } else if (ticket.pricing_type === "Formula") {
      const lmePrice = ticket.lme_price || 0;
      const payablePercent = ticket.payable_percent || 0;
      return lmePrice * payablePercent;
    } else if (ticket.pricing_type === "Index") {
      const lmePrice = ticket.lme_price || 0;
      const premiumDiscount = ticket.premium_discount || 0;
      return lmePrice + premiumDiscount;
    }
    return 0;
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getStatusVariant = (status: string | null) => {
    if (status === "Approved") return "success";
    if (status === "Rejected") return "destructive";
    if (status === "Pending Approval") return "secondary";
    return "outline";
  };

  const getStatusIcon = (status: string | null) => {
    if (status === "Approved") return <CheckCircle className="h-3 w-3" />;
    if (status === "Rejected") return <XCircle className="h-3 w-3" />;
    if (status === "Pending Approval") return <AlertCircle className="h-3 w-3" />;
    return <Clock className="h-3 w-3" />;
  };

  const handleTicketDoubleClick = (ticket: Ticket) => {
    if (ticket.type === "Buy") {
      const isDeselecting = selectedBuyTicket === ticket.id;
      setSelectedBuyTicket(isDeselecting ? null : ticket.id);
      // Scroll sell side to top when selecting a buy ticket
      if (!isDeselecting) {
        sellScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      const isDeselecting = selectedSellTicket === ticket.id;
      setSelectedSellTicket(isDeselecting ? null : ticket.id);
      // Scroll buy side to top when selecting a sell ticket
      if (!isDeselecting) {
        buyScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleMatchClick = () => {
    if (selectedBuyTicket && selectedSellTicket) {
      onMatchSelected(selectedBuyTicket, selectedSellTicket);
    }
  };

  const TicketCard = ({ ticket, isSelected }: { ticket: Ticket; isSelected: boolean }) => {
    const price = calculatePrice(ticket);
    
    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <div 
            className={`cursor-pointer rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow ${
              isSelected ? 'ring-2 ring-green-500 ring-offset-2' : ''
            }`}
            onDoubleClick={() => handleTicketDoubleClick(ticket)}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold">#{ticket.id}</span>
              <Badge variant={getStatusVariant(ticket.status)} className="flex items-center gap-1">
                {getStatusIcon(ticket.status)}
                {ticket.status || "Draft"}
              </Badge>
            </div>

            {/* Commodity & Grade */}
            <div className="flex items-center gap-2 flex-wrap mt-3">
              <Badge variant="outline">{ticket.commodity_type || "-"}</Badge>
              {ticket.isri_grade && ticket.isri_grade !== "Not applicable" && (
                <Badge variant="secondary" className="text-xs">{ticket.isri_grade}</Badge>
              )}
            </div>

            {/* Quantity & Price */}
            <div className="text-sm space-y-1 mt-3">
              <div>
                <span className="text-muted-foreground">Qty: </span>
                <span className="font-medium">{formatNumber(ticket.quantity)} MT</span>
              </div>
              <div>
                <span className="text-muted-foreground">Price: </span>
                <span className="font-medium">{formatNumber(price)} {ticket.currency || 'USD'}</span>
              </div>
            </div>

            {/* Counterparty */}
            <div className="text-sm mt-3">
              <span className="text-muted-foreground">Counterparty: </span>
              <span className="font-medium">{ticket.client_name || "-"}</span>
            </div>

            {/* Divider */}
            <div className="border-t border-border mt-3" />

            {/* Location & Trader */}
            <div className="space-y-1 text-sm mt-3">
              <div>
                <span className="text-muted-foreground">
                  {ticket.type === "Buy" ? "From: " : "To: "}
                </span>
                <span>{ticket.type === "Buy" ? ticket.ship_from || "-" : ticket.ship_to || "-"}</span>
              </div>
              {ticket.traders?.name && (
                <div>
                  <span className="text-muted-foreground">Trader: </span>
                  <span>{ticket.traders.name}</span>
                </div>
              )}
            </div>

            {/* Selection indicator */}
            {isSelected && (
              <div className="text-xs text-green-600 font-medium text-center pt-3 mt-3 border-t border-border">
                ✓ Selected for matching
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setDetailTicketId(ticket.id)}>
            View Details
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleTicketDoubleClick(ticket)}>
            {(ticket.type === "Buy" ? selectedBuyTicket : selectedSellTicket) === ticket.id 
              ? "Deselect for Matching" 
              : "Select for Matching"}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <div className="space-y-4">
      {/* Match Button */}
      {selectedBuyTicket && selectedSellTicket && (
        <div className="flex justify-center">
          <Button onClick={handleMatchClick} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Match Selected Tickets (#{selectedBuyTicket} + #{selectedSellTicket})
          </Button>
        </div>
      )}

      {/* Hint */}
      <p className="text-sm text-muted-foreground text-center">
        Double-click to select tickets for matching • Right-click to view details
      </p>

      {/* Kanban Columns */}
      <div className="grid grid-cols-2 gap-6 h-[calc(100vh-280px)]">
        {/* Buy Column */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                BUY
              </Badge>
              <span className="text-muted-foreground text-sm font-normal">
                {selectedSellTicketObj 
                  ? `(${buyTickets.length} of ${allBuyTickets.length} matching)`
                  : `(${buyTickets.length} tickets)`}
              </span>
            </h3>
            {selectedBuyTicket && (
              <Badge variant="default">Selected: #{selectedBuyTicket}</Badge>
            )}
          </div>
          <div ref={buyScrollRef} className="flex-1 min-h-0 overflow-y-auto pr-2">
            <div className="flex flex-col gap-3">
              {buyTickets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No buy tickets</p>
              ) : (
                buyTickets.map(ticket => (
                  <TicketCard 
                    key={ticket.id} 
                    ticket={ticket} 
                    isSelected={selectedBuyTicket === ticket.id}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sell Column */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                SELL
              </Badge>
              <span className="text-muted-foreground text-sm font-normal">
                {selectedBuyTicketObj 
                  ? `(${sellTickets.length} of ${allSellTickets.length} matching)`
                  : `(${sellTickets.length} tickets)`}
              </span>
            </h3>
            {selectedSellTicket && (
              <Badge variant="default">Selected: #{selectedSellTicket}</Badge>
            )}
          </div>
          <div ref={sellScrollRef} className="flex-1 min-h-0 overflow-y-auto pr-2">
            <div className="flex flex-col gap-3">
              {sellTickets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No sell tickets</p>
              ) : (
                sellTickets.map(ticket => (
                  <TicketCard 
                    key={ticket.id} 
                    ticket={ticket} 
                    isSelected={selectedSellTicket === ticket.id}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={detailTicketId !== null} onOpenChange={() => setDetailTicketId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {detailTicketId && <TicketDetailDialog ticketId={detailTicketId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};
