import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ship } from "lucide-react";
import { format } from "date-fns";
import ShipmentProgress from "./ShipmentProgress";
import type { EnhancedShipment } from "@/types/searates";
import { cn } from "@/lib/utils";

interface ShipmentsListProps {
  shipments: EnhancedShipment[];
  loading: boolean;
  selectedShipmentId: string | null;
  onSelectShipment: (shipmentId: string | null) => void;
}

const ShipmentsList = ({ shipments, loading, selectedShipmentId, onSelectShipment }: ShipmentsListProps) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            Loading shipments...
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleShipmentClick = (shipmentId: string) => {
    // Toggle selection: if already selected, deselect; otherwise select
    onSelectShipment(selectedShipmentId === shipmentId ? null : shipmentId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ship className="h-5 w-5" />
          Shipments In Transit
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {shipments.map((shipment) => {
            const isSelected = selectedShipmentId === shipment.metadata.number;
            
            return (
              <div
                key={shipment.metadata.number}
                onClick={() => handleShipmentClick(shipment.metadata.number)}
                className={cn(
                  "p-4 border rounded-lg hover:bg-muted/50 transition-all cursor-pointer",
                  isSelected && "ring-2 ring-primary bg-primary/5 border-primary"
                )}
              >
                <div className="grid grid-cols-[1fr,auto] gap-6 items-center">
                  {/* Left Column - Shipment Info */}
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {shipment.metadata.number}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {shipment.metadata.sealine}
                      </Badge>
                    </div>

                    {/* Route & Quantity */}
                    <div className="text-sm text-muted-foreground">
                      {shipment.route.pol.location.name} → {shipment.route.pod.location.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {shipment.quantity} MT
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Departed: {shipment.route.pol.date 
                          ? format(new Date(shipment.route.pol.date), "MMM dd, yyyy")
                          : "N/A"
                        }
                      </span>
                      <span>
                        ETA: {shipment.eta ? format(new Date(shipment.eta), "MMM dd, yyyy") : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Right Column - Progress Timeline */}
                  <div className="min-w-[300px]">
                    {shipment.route.pol.date && shipment.eta && (
                      <ShipmentProgress 
                        departureDate={shipment.route.pol.date}
                        etaDate={shipment.eta}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {shipments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No shipments in transit
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ShipmentsList;
