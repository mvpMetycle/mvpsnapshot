import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AlertCircle } from "lucide-react";

interface RemainderSolution {
  type: "NEW_TICKET" | "INVENTORY" | "ADJUST";
  ticketData?: any;
  warehouse?: string;
}

interface ResolveRemainderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainderMT: number;
  surplusSide: "buy" | "sell";
  referenceTicket: any;
  onResolve: (solution: RemainderSolution) => void;
}

export const ResolveRemainderDialog = ({
  open,
  onOpenChange,
  remainderMT,
  surplusSide,
  referenceTicket,
  onResolve,
}: ResolveRemainderDialogProps) => {
  const [selectedOption, setSelectedOption] = useState<"NEW_TICKET" | "INVENTORY" | "ADJUST">("NEW_TICKET");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");

  const warehouseOptions = [
    { value: "warehouse_1", label: "Warehouse 1 - Rotterdam" },
    { value: "warehouse_2", label: "Warehouse 2 - Hamburg" },
    { value: "warehouse_3", label: "Warehouse 3 - Antwerp" },
  ];

  const handleConfirm = () => {
    if (selectedOption === "ADJUST") {
      onResolve({ type: "ADJUST" });
      return;
    }

    if (selectedOption === "INVENTORY") {
      if (!selectedWarehouse) {
        return;
      }
      const { id, created_at, ...ticketFields } = referenceTicket;
      const ticketData = {
        ...ticketFields,
        quantity: remainderMT,
        status: "Approved",
        transaction_type: "Inventory",
      };
      onResolve({ type: "INVENTORY", ticketData, warehouse: selectedWarehouse });
      return;
    }

    if (selectedOption === "NEW_TICKET") {
      const { id, created_at, ...ticketFields } = referenceTicket;
      const ticketData = {
        ...ticketFields,
        quantity: remainderMT,
        status: "Approved",
      };
      console.log("Creating new ticket with data:", ticketData);
      onResolve({ type: "NEW_TICKET", ticketData });
    }
  };

  const getButtonText = () => {
    if (selectedOption === "NEW_TICKET") return "Create ticket & continue";
    if (selectedOption === "INVENTORY") return "Use inventory & continue";
    return "Go back to matching";
  };

  const getInventoryDescription = () => {
    if (surplusSide === "buy") {
      return `Move ${remainderMT} MT into inventory at a selected warehouse.`;
    }
    return `Reserve ${remainderMT} MT from inventory at a selected warehouse.`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resolve remaining quantity</DialogTitle>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Orders require exact quantity matching. You must resolve the remainder before proceeding.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <RadioGroup value={selectedOption} onValueChange={(value: any) => setSelectedOption(value)}>
            {/* Option 1: Create new ticket */}
            <Card className={selectedOption === "NEW_TICKET" ? "ring-2 ring-primary" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="NEW_TICKET" id="new-ticket" className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="new-ticket" className="text-base font-semibold cursor-pointer">
                      Create new ticket for remainder
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Create a new ticket for {remainderMT} MT with the same details for future matching.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Option 2: Use inventory */}
            <Card className={selectedOption === "INVENTORY" ? "ring-2 ring-primary" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="INVENTORY" id="inventory" className="mt-1" />
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="inventory" className="text-base font-semibold cursor-pointer">
                        Use inventory
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {getInventoryDescription()}
                      </p>
                    </div>
                    {selectedOption === "INVENTORY" && (
                      <div className="space-y-2">
                        <Label>Select warehouse *</Label>
                        <SearchableSelect
                          value={selectedWarehouse}
                          onValueChange={setSelectedWarehouse}
                          options={warehouseOptions}
                          placeholder="Select warehouse..."
                          searchPlaceholder="Search warehouses..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Option 3: Go back */}
            <Card className={selectedOption === "ADJUST" ? "ring-2 ring-primary" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="ADJUST" id="adjust" className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="adjust" className="text-base font-semibold cursor-pointer">
                      Go back & adjust quantities
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Return to the matching screen to manually adjust or renegotiate quantities.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedOption === "INVENTORY" && !selectedWarehouse}>
            {getButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
