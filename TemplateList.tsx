import { FileText, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  is_active: boolean;
}

interface TemplateListProps {
  templates: Template[];
  onSelect: (template: Template) => void;
  onEdit: (template: Template) => void;
  onDelete: (templateId: string) => void;
  selectedTemplateId?: string;
}

export const TemplateList = ({ templates, onSelect, onEdit, onDelete, selectedTemplateId }: TemplateListProps) => {
  return (
    <ScrollArea className="flex-1">
      <div className="space-y-2 p-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`group relative border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
              selectedTemplateId === template.id
                ? "bg-primary/5 border-primary shadow-sm"
                : "border-border hover:border-primary/30 hover:bg-muted/30"
            }`}
            onClick={() => onSelect(template)}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-md transition-colors ${
                selectedTemplateId === template.id 
                  ? "bg-primary/10" 
                  : "bg-muted group-hover:bg-primary/5"
              }`}>
                <FileText className={`h-4 w-4 ${
                  selectedTemplateId === template.id 
                    ? "text-primary" 
                    : "text-muted-foreground"
                }`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-foreground mb-1 truncate">{template.name}</h4>
                {template.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{template.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {template.category}
                  </Badge>
                  {!template.is_active && (
                    <Badge variant="outline" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(template);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
                    onDelete(template.id);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
