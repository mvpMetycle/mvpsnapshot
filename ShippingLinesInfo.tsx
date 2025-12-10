import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExternalLink, Ship } from "lucide-react";
import { getShippingLines } from "@/services/searatesService";
import { ShippingLine } from "@/types/searates";

const ShippingLinesInfo = () => {
  const [shippingLines, setShippingLines] = useState<ShippingLine[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadShippingLines = async () => {
      const lines = await getShippingLines();
      setShippingLines(lines);
    };
    loadShippingLines();
  }, []);

  const filteredLines = shippingLines.filter(line =>
    line.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    line.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ship className="h-5 w-5" />
          Supported Shipping Lines
        </CardTitle>
        <CardDescription>
          Track shipments from {shippingLines.length}+ major carriers worldwide
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          placeholder="Search shipping lines..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredLines.map((line) => (
            <div
              key={line.code}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="font-medium text-foreground">{line.name}</div>
                <div className="text-sm text-muted-foreground">Code: {line.code}</div>
              </div>
              {line.tracking_url && (
                <a
                  href={line.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 text-sm"
                >
                  Track <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ShippingLinesInfo;
