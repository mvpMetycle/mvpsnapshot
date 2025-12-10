import { HedgeMatchingTab } from "@/components/hedging/HedgeMatchingTab";

export default function ExposureManagement() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Exposure Management</h2>
        <p className="text-sm text-muted-foreground">
          Manage QP exposure and hedge matches between physical and financial positions
        </p>
      </div>

      <HedgeMatchingTab />
    </div>
  );
}
