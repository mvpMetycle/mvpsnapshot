import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { TemplateEditor } from "@/components/TemplateEditor";
import { TemplateList } from "@/components/TemplateList";
import { TemplatePreview } from "@/components/TemplatePreview";
import { VariablePicker } from "@/components/VariablePicker";
import { GeneratedDocumentsList } from "@/components/GeneratedDocumentsList";
import { GenerateDocumentDialog } from "@/components/GenerateDocumentDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UpdateTemplatesButton } from "@/components/UpdateTemplatesButton";

const Documentation = () => {
  const [activeTab, setActiveTab] = useState("templates");
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ["document_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch generated documents
  const { data: generatedDocuments = [] } = useQuery({
    queryKey: ["generated_documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_documents")
        .select("*, document_templates(name, category)")
        .order("generated_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      if (template.id) {
        const { error } = await supabase
          .from("document_templates")
          .update(template)
          .eq("id", template.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("document_templates")
          .insert(template);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_templates"] });
      toast.success("Template saved successfully");
      setEditingTemplate(null);
      setIsCreatingNew(false);
    },
    onError: (error) => {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("document_templates")
        .delete()
        .eq("id", templateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_templates"] });
      toast.success("Template deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    },
  });

  // Delete generated document mutation
  const deleteGeneratedDocMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from("generated_documents")
        .delete()
        .eq("id", documentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generated_documents"] });
      toast.success("Document deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    },
  });

  const handleNewTemplate = () => {
    setIsCreatingNew(true);
    setEditingTemplate({
      name: "",
      description: "",
      category: "Shipping",
      content: "",
    });
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setIsCreatingNew(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Documentation</h2>
          <p className="text-sm text-muted-foreground mt-1">Create and manage document templates with dynamic variables</p>
        </div>
        <div className="flex items-center gap-2">
          <UpdateTemplatesButton />
          <Button onClick={() => setShowGenerateDialog(true)} size="lg">
            Generate Document
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="templates">Template Builder</TabsTrigger>
          <TabsTrigger value="generated">Generated Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="flex-1 flex gap-6 mt-6">
          {/* Left Panel - Template List */}
          <div className="w-72 flex flex-col bg-card border border-border rounded-lg shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <h3 className="font-semibold text-foreground">Templates</h3>
              <Button size="sm" onClick={handleNewTemplate} variant="default">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>
            <TemplateList
              templates={templates}
              onSelect={(template) => {
                setEditingTemplate(template);
                setIsCreatingNew(false);
                setPreviewContent(template.content);
              }}
              onEdit={(template) => {
                setEditingTemplate(template);
                setIsCreatingNew(false);
                setPreviewContent(template.content);
              }}
              onDelete={(id) => deleteTemplateMutation.mutate(id)}
              selectedTemplateId={editingTemplate?.id}
            />
          </div>

          {/* Center Panel - Editor & Preview */}
          <div className="flex-1 flex flex-col gap-6">
            {editingTemplate ? (
              <>
                {/* Editor */}
                <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                  <h4 className="text-lg font-semibold text-foreground mb-4">Template Editor</h4>
                  <TemplateEditor
                    template={editingTemplate}
                    onSave={(template) => saveTemplateMutation.mutate(template)}
                    onCancel={handleCancel}
                    onContentChange={setPreviewContent}
                  />
                </div>
                
                {/* Preview */}
                <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                  <TemplatePreview content={previewContent} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-card border border-border rounded-lg shadow-sm">
                <div className="text-center text-muted-foreground max-w-md">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Template Selected</h3>
                  <p className="text-sm">Select a template from the list to edit, or create a new one to get started.</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Variable Picker */}
          <VariablePicker
            onInsertVariable={(variable) => {
              if (editingTemplate) {
                setEditingTemplate({
                  ...editingTemplate,
                  content: editingTemplate.content + variable,
                });
                setPreviewContent(editingTemplate.content + variable);
              }
            }}
          />
        </TabsContent>

        <TabsContent value="generated" className="flex-1 mt-6">
          <div className="bg-card border border-border rounded-lg shadow-sm">
            <GeneratedDocumentsList
              documents={generatedDocuments}
              onDelete={(id) => deleteGeneratedDocMutation.mutate(id)}
            />
          </div>
        </TabsContent>
      </Tabs>

      <GenerateDocumentDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
      />
    </div>
  );
};

export default Documentation;
