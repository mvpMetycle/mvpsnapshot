import { DollarSign } from "lucide-react";

const Finance = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <DollarSign className="h-24 w-24 text-muted-foreground" />
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Finance & Trade Facilities</h2>
        <p className="text-lg text-muted-foreground">Coming Soon</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Manage financing, credit facilities, and trade finance operations.
        </p>
      </div>
    </div>
  );
};

export default Finance;
