import { BarChart } from "lucide-react";

const Reporting = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <BarChart className="h-24 w-24 text-muted-foreground" />
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Reporting & Analytics</h2>
        <p className="text-lg text-muted-foreground">Coming Soon</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Access comprehensive reports and analytics on your trading operations.
        </p>
      </div>
    </div>
  );
};

export default Reporting;
