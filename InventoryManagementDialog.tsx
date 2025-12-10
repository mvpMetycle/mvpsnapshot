import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ManualMatching } from "./ManualMatching";
import { OptimizeMatching } from "./OptimizeMatching";

interface InventoryManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MatchingMode = "selection" | "manual" | "optimize";

export const InventoryManagementDialog = ({ open, onOpenChange }: InventoryManagementDialogProps) => {
  const [mode, setMode] = useState<MatchingMode>("selection");

  const handleClose = () => {
    setMode("selection");
    onOpenChange(false);
  };

  const handleBack = () => {
    setMode("selection");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "selection" && "Match Buy and Sell Tickets"}
            {mode === "manual" && "Manual Matching of Buy & Sell Tickets"}
            {mode === "optimize" && "Optimize Matching"}
          </DialogTitle>
        </DialogHeader>

        {mode === "selection" && (
          <div className="space-y-4 py-6">
            <p className="text-muted-foreground mb-6">Choose how you would like to match tickets:</p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-32 flex flex-col items-center justify-center space-y-2"
                onClick={() => setMode("manual")}
              >
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <span className="text-lg font-semibold">Manual Matching</span>
                <span className="text-sm text-muted-foreground text-center">
                  Select and match buy & sell tickets manually
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-32 flex flex-col items-center justify-center space-y-2"
                onClick={() => setMode("optimize")}
              >
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-lg font-semibold">Optimize Matching</span>
                <span className="text-sm text-muted-foreground text-center">
                  Let the system optimize matches automatically
                </span>
              </Button>
            </div>
          </div>
        )}

        {mode === "manual" && <ManualMatching onBack={handleBack} onClose={handleClose} />}

        {mode === "optimize" && <OptimizeMatching onBack={handleBack} onClose={handleClose} />}
      </DialogContent>
    </Dialog>
  );
};
