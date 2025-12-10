import { useEffect, useState, useMemo, useCallback } from "react";
import ShipmentMap from "@/components/ShipmentMap";
import ShipmentsList from "@/components/ShipmentsList";
import ShippingLinesInfo from "@/components/ShippingLinesInfo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { transformBLOrderToShipment } from "@/utils/blOrderToShipment";
import { SAMPLE_SHIPMENTS } from "@/data/sampleShipments";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { trackByNumber } from "@/services/searatesService";
import { SeaRatesTrackingResponse } from "@/types/searates";
import { toast } from "sonner";
import { format } from "date-fns";
import type { EnhancedShipment } from "@/types/searates";

const Shipments = () => {
  const [shipments, setShipments] = useState<EnhancedShipment[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Tracking search state
  const [trackingNumber, setTrackingNumber] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState<SeaRatesTrackingResponse | null>(null);

  useEffect(() => {
    const loadShipments = () => {
      try {
        const transformedShipments = SAMPLE_SHIPMENTS
          .map((sample) => transformBLOrderToShipment({
            id: sample.id,
            bl_number: sample.bl_number,
            bl_order_name: sample.bl_order_name,
            port_of_loading: sample.port_of_loading,
            port_of_discharge: sample.port_of_discharge,
            loaded_quantity_mt: sample.loaded_quantity_mt,
            atd: sample.atd,
            eta: sample.eta,
            status: sample.status,
            ata: null,
            etd: null,
          }))
          .filter((s): s is EnhancedShipment => s !== null);

        setShipments(transformedShipments);
      } catch (error) {
        console.error("Error loading shipments:", error);
      } finally {
        setLoading(false);
      }
    };

    loadShipments();
  }, []);

  const handleSelectShipment = useCallback((shipmentId: string | null) => {
    setSelectedShipmentId(shipmentId);
  }, []);

  const handleTrackingSearch = async () => {
    if (!trackingNumber.trim()) {
      toast.error("Please enter a tracking number");
      return;
    }

    setSearchLoading(true);
    try {
      const data = await trackByNumber(trackingNumber.trim());
      if (data) {
        setTrackingResult(data);
        toast.success("Tracking information found");
      } else {
        toast.error("No tracking information found for this number");
        setTrackingResult(null);
      }
    } catch (error) {
      console.error("Error tracking shipment:", error);
      toast.error("Failed to retrieve tracking information");
      setTrackingResult(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTrackingSearch();
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 relative z-0">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Live Shipment Tracking</h2>
        <p className="text-sm text-muted-foreground">Track all your shipments in real-time on an interactive world map</p>
      </div>

      <Tabs defaultValue="map" className="flex-1 flex flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="carriers">Shipping Lines</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="flex-1 flex flex-col space-y-4 mt-4">
          {useMemo(() => (
            <div className="flex-1 min-h-[600px] border rounded-lg overflow-hidden bg-muted/20 relative z-0">
              <ShipmentMap 
                shipments={shipments}
                selectedShipmentId={selectedShipmentId}
                onSelectShipment={handleSelectShipment}
              />
            </div>
          ), [shipments, selectedShipmentId, handleSelectShipment])}

          {/* Tracking Search Bar */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter Container #, BL #, or Booking # to track"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleTrackingSearch} disabled={searchLoading}>
              <Search className="h-4 w-4 mr-2" />
              {searchLoading ? "Searching..." : "Track"}
            </Button>
          </div>

          {/* Tracking Result Card */}
          {trackingResult && (
            <Card className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => setTrackingResult(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between pr-8">
                  <div>
                    <CardTitle className="text-lg">{trackingResult.data.metadata.number}</CardTitle>
                    <CardDescription className="mt-1">
                      <Badge variant="outline" className="mr-2">
                        {trackingResult.data.metadata.type === 'CT' ? 'Container' : 
                         trackingResult.data.metadata.type === 'BL' ? 'Bill of Lading' : 'Booking'}
                      </Badge>
                      {trackingResult.data.metadata.sealine_name}
                    </CardDescription>
                  </div>
                  <Badge 
                    className={
                      trackingResult.data.metadata.status === 'IN_TRANSIT' 
                        ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                        : 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20'
                    }
                  >
                    {trackingResult.data.metadata.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Vessel Information */}
                {trackingResult.data.vessels.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Vessel</h4>
                    {trackingResult.data.vessels.map((vessel) => (
                      <div key={vessel.id} className="text-sm space-y-1 bg-muted/50 p-3 rounded-md">
                        <div className="font-medium">{vessel.name}</div>
                        <div className="text-xs text-muted-foreground">
                          IMO: {vessel.imo} • Flag: {vessel.flag}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Route Information */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Route</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <div className="flex-1">
                        <div className="font-medium text-xs">{trackingResult.data.route.pol.location.name}</div>
                        <div className="text-muted-foreground text-xs">
                          {trackingResult.data.route.pol.date && format(new Date(trackingResult.data.route.pol.date), "MMM dd, yyyy")}
                        </div>
                      </div>
                    </div>
                    <div className="ml-1 border-l border-dashed border-border h-4" />
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <div className="flex-1">
                        <div className="font-medium text-xs">{trackingResult.data.route.pod.location.name}</div>
                        <div className="text-muted-foreground text-xs">
                          ETA: {trackingResult.data.route.pod.date && format(new Date(trackingResult.data.route.pod.date), "MMM dd, yyyy")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Container Events */}
                {trackingResult.data.containers.length > 0 && trackingResult.data.containers[0].events.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Recent Events</h4>
                    <div className="space-y-1">
                      {trackingResult.data.containers[0].events.slice(0, 2).map((event, idx) => (
                        <div key={idx} className="text-xs bg-muted/30 p-2 rounded-md">
                          <div className="font-medium">{event.state}</div>
                          <div className="text-muted-foreground">{event.location.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <ShipmentsList 
            shipments={shipments}
            loading={loading}
            selectedShipmentId={selectedShipmentId}
            onSelectShipment={handleSelectShipment}
          />
        </TabsContent>

        <TabsContent value="carriers" className="mt-4">
          <ShippingLinesInfo />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Shipments;
