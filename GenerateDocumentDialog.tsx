import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DocumentGenerationService } from "@/services/documentGenerationService";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";

interface GenerateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedBLOrderId?: number;
}

export const GenerateDocumentDialog = ({ open, onOpenChange, preselectedBLOrderId }: GenerateDocumentDialogProps) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedBLOrderId, setSelectedBLOrderId] = useState<number | undefined>(preselectedBLOrderId);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: templates } = useQuery({
    queryKey: ["document_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: blOrders } = useQuery({
    queryKey: ["bl_orders_for_docs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bl_order")
        .select("id, bl_order_name, bl_number")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    enabled: !preselectedBLOrderId,
  });

  const handleGenerate = async () => {
    if (!selectedTemplateId || !selectedBLOrderId) {
      toast.error("Please select both template and BL Order");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await DocumentGenerationService.generateDocument({
        templateId: selectedTemplateId,
        blOrderId: selectedBLOrderId,
      });

      toast.success("Document generated successfully!");
      
      // Open the document in a new tab
      window.open(result.url, "_blank");
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error("Failed to generate document");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {template.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!preselectedBLOrderId && (
            <div className="space-y-2">
              <Label>Select BL Order</Label>
              <Select
                value={selectedBLOrderId?.toString()}
                onValueChange={(val) => setSelectedBLOrderId(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a BL Order..." />
                </SelectTrigger>
                <SelectContent>
                  {blOrders?.map((blOrder) => (
                    <SelectItem key={blOrder.id} value={blOrder.id.toString()}>
                      {blOrder.bl_order_name || blOrder.bl_number || `BL Order #${blOrder.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !selectedTemplateId || !selectedBLOrderId}>
            {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate Document
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
