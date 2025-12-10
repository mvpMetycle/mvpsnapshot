import { BarChart3 } from "lucide-react";

export default function Returns() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <BarChart3 className="h-24 w-24 text-muted-foreground" />
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Returns</h2>
        <p className="text-lg text-muted-foreground">Coming Soon</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Analyze investment returns and profitability metrics.
        </p>
      </div>
    </div>
  );
}