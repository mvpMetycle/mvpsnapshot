import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trackByNumber } from "@/services/searatesService";
import { SeaRatesTrackingResponse } from "@/types/searates";
import { toast } from "sonner";
import { format } from "date-fns";

const TrackingSearch = () => {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeaRatesTrackingResponse | null>(null);

  const handleSearch = async () => {
    if (!trackingNumber.trim()) {
      toast.error("Please enter a tracking number");
      return;
    }

    setLoading(true);
    try {
      const data = await trackByNumber(trackingNumber.trim());
      if (data) {
        setResult(data);
        toast.success("Tracking information found");
      } else {
        toast.error("No tracking information found for this number");
        setResult(null);
      }
    } catch (error) {
      console.error("Error tracking shipment:", error);
      toast.error("Failed to retrieve tracking information");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter Container #, BL #, or Booking # to track"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={loading}>
          <Search className="h-4 w-4 mr-2" />
          {loading ? "Searching..." : "Track"}
        </Button>
      </div>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{result.data.metadata.number}</CardTitle>
                <CardDescription className="mt-1">
                  <Badge variant="outline" className="mr-2">
                    {result.data.metadata.type === 'CT' ? 'Container' : 
                     result.data.metadata.type === 'BL' ? 'Bill of Lading' : 'Booking'}
                  </Badge>
                  {result.data.metadata.sealine_name}
                </CardDescription>
              </div>
              <Badge 
                className={
                  result.data.metadata.status === 'IN_TRANSIT' 
                    ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                    : 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20'
                }
              >
                {result.data.metadata.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Vessel Information */}
            {result.data.vessels.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Vessel Information</h4>
                {result.data.vessels.map((vessel) => (
                  <div key={vessel.id} className="text-sm space-y-1 bg-muted/50 p-3 rounded-md">
                    <div><span className="font-medium">Name:</span> {vessel.name}</div>
                    <div className="flex gap-4 text-muted-foreground">
                      <span>IMO: {vessel.imo}</span>
                      <span>MMSI: {vessel.mmsi}</span>
                      <span>Flag: {vessel.flag}</span>
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
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <div className="font-medium">{result.data.route.pol.location.name}</div>
                    <div className="text-muted-foreground text-xs">
                      Port of Loading • {result.data.route.pol.date && format(new Date(result.data.route.pol.date), "MMM dd, yyyy")}
                    </div>
                  </div>
                </div>
                <div className="ml-1.5 border-l-2 border-dashed border-border h-8" />
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="flex-1">
                    <div className="font-medium">{result.data.route.pod.location.name}</div>
                    <div className="text-muted-foreground text-xs">
                      Port of Discharge • {result.data.route.pod.date && `ETA: ${format(new Date(result.data.route.pod.date), "MMM dd, yyyy")}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Container Events */}
            {result.data.containers.length > 0 && result.data.containers[0].events.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Recent Events</h4>
                <div className="space-y-2">
                  {result.data.containers[0].events.slice(0, 3).map((event, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm bg-muted/30 p-2 rounded-md">
                      <div className="text-muted-foreground min-w-24 text-xs">
                        {format(new Date(event.date), "MMM dd, HH:mm")}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{event.state}</div>
                        <div className="text-muted-foreground text-xs">{event.location.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrackingSearch;
