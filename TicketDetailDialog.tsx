import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, AlertCircle, Clock, Image as ImageIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { EvidencePhotoViewer } from "./EvidencePhotoViewer";
import type { EvidencePhoto } from "./TicketEvidenceSection";

interface TicketDetailDialogProps {
  ticketId: number;
}

export const TicketDetailDialog = ({ ticketId }: TicketDetailDialogProps) => {
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [initialPhotoIndex, setInitialPhotoIndex] = useState(0);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket")
        .select(`
          *,
          traders (
            name
          )
        `)
        .eq("id", ticketId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: photos } = useQuery({
    queryKey: ["ticket-photos", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_photos")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Loading ticket details...</div>;
  }

  if (!ticket) {
    return <div className="text-muted-foreground">Ticket not found.</div>;
  }

  const statusIcon = 
    ticket.status === "Approved" ? <CheckCircle className="h-4 w-4" /> :
    ticket.status === "Rejected" ? <XCircle className="h-4 w-4" /> :
    ticket.status === "Pending Approval" ? <AlertCircle className="h-4 w-4" /> :
    <Clock className="h-4 w-4" />;
  
  const statusVariant = 
    ticket.status === "Approved" ? "default" :
    ticket.status === "Rejected" ? "destructive" :
    ticket.status === "Pending Approval" ? "secondary" :
    "outline";

  const DetailRow = ({ label, value }: { label: string; value: any }) => (
    <div className="grid grid-cols-3 gap-4 py-2">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground col-span-2">{value || "-"}</dd>
    </div>
  );

  const handlePhotoClick = (index: number) => {
    setInitialPhotoIndex(index);
    setPhotoViewerOpen(true);
  };

  // Convert photos to EvidencePhoto format for the viewer
  const evidencePhotos: EvidencePhoto[] = useMemo(() => {
    if (!photos) return [];
    return photos.map((photo) => ({
      id: photo.id,
      url: supabase.storage.from("ticket-photos").getPublicUrl(photo.file_path).data.publicUrl,
      fileName: photo.file_name,
      filePath: photo.file_path,
    }));
  }, [photos]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Ticket #{ticket.id}</h3>
          <p className="text-sm text-muted-foreground">
            Created {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : "-"}
          </p>
        </div>
        <Badge variant={statusVariant} className="flex items-center gap-2">
          {statusIcon}
          {ticket.status || "Draft"}
        </Badge>
      </div>

      <Separator />

      {/* Photos Section */}
      {evidencePhotos.length > 0 && (
        <>
          <div>
            <h4 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Photos ({evidencePhotos.length})
            </h4>
            <div className="flex gap-2 flex-wrap">
              {evidencePhotos.map((photo, index) => (
                <button
                  key={photo.id || index}
                  className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={() => handlePhotoClick(index)}
                >
                  <img
                    src={photo.url}
                    alt={photo.fileName || `Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Photo Viewer Dialog */}
      <EvidencePhotoViewer
        open={photoViewerOpen}
        onOpenChange={setPhotoViewerOpen}
        photos={evidencePhotos}
        initialIndex={initialPhotoIndex}
        title={`Ticket #${ticketId} – Photos`}
      />

      {/* Trade Details */}
      <div>
        <h4 className="text-md font-semibold mb-3 text-foreground">Trade Details</h4>
        <dl className="space-y-1">
          <DetailRow label="Type" value={ticket.type} />
          <DetailRow label="Transaction Type" value={ticket.transaction_type} />
          <DetailRow label="Commodity Type" value={ticket.commodity_type} />
          <DetailRow label="Quantity (MT)" value={ticket.quantity} />
          <DetailRow label="Signed Volume" value={ticket.signed_volume} />
          <DetailRow label="Counterparty Name" value={ticket.client_name} />
          <DetailRow label="Counterparty ID" value={ticket.company_id} />
          <DetailRow label="ISRI Grade" value={ticket.isri_grade} />
          <DetailRow label="Metal Form" value={ticket.metal_form} />
          <DetailRow label="Product Details" value={ticket.product_details} />
        </dl>
      </div>

      <Separator />

      {/* Logistics */}
      <div>
        <h4 className="text-md font-semibold mb-3 text-foreground">Logistics</h4>
        <dl className="space-y-1">
          <DetailRow label="Country of Origin" value={ticket.country_of_origin} />
          <DetailRow label="Ship From" value={ticket.ship_from} />
          <DetailRow label="Ship To" value={ticket.ship_to} />
          <DetailRow label="Incoterms" value={ticket.incoterms} />
          <DetailRow label="Shipment Window" value={ticket.shipment_window} />
          <DetailRow label="Planned Shipments" value={ticket.planned_shipments} />
          <DetailRow label="Transport Method" value={ticket.transport_method} />
        </dl>
      </div>

      <Separator />

      {/* Pricing */}
      <div>
        <h4 className="text-md font-semibold mb-3 text-foreground">Pricing</h4>
        <dl className="space-y-1">
          <DetailRow label="Currency" value={ticket.currency} />
          <DetailRow label="Pricing Type" value={ticket.pricing_type} />
          <DetailRow label="Signed Price" value={ticket.signed_price} />
          <DetailRow label="Basis" value={ticket.basis} />
          <DetailRow label="Payable Percent" value={ticket.payable_percent ? `${(ticket.payable_percent * 100).toFixed(2)}%` : "-"} />
          <DetailRow label="Premium/Discount" value={ticket.premium_discount} />
          <DetailRow label="QP Start" value={ticket.qp_start} />
          <DetailRow label="QP End" value={ticket.qp_end} />
          <DetailRow label="Fixation Method" value={ticket.fixation_method} />
          <DetailRow label="LME Price" value={ticket.lme_price} />
          <DetailRow label="Reference Price Source" value={ticket.reference_price_source} />
        </dl>
      </div>

      <Separator />

      {/* Financial Terms */}
      <div>
        <h4 className="text-md font-semibold mb-3 text-foreground">Financial Terms</h4>
        <dl className="space-y-1">
          <DetailRow label="Payment Terms" value={ticket.payment_terms} />
          <DetailRow label="Payment Trigger Event" value={ticket.payment_trigger_event} />
          <DetailRow label="Payment Trigger Timing" value={ticket.payment_trigger_timing} />
          <DetailRow label="Payment Offset Days" value={ticket.payment_offset_days} />
          <DetailRow label="Down Payment %" value={ticket.down_payment_amount_percent != null ? `${(ticket.down_payment_amount_percent * 100).toFixed(1)}%` : null} />
          <DetailRow label="Down Payment Trigger" value={ticket.downpayment_trigger} />
        </dl>
      </div>

      <Separator />

      {/* Internal/Ops */}
      <div>
        <h4 className="text-md font-semibold mb-3 text-foreground">Internal / Ops</h4>
        <dl className="space-y-1">
          <DetailRow label="Trader" value={ticket.traders?.name} />
          <DetailRow label="Notes" value={ticket.notes} />
        </dl>
      </div>
    </div>
  );
};
