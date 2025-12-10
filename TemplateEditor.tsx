import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
import { useState, useEffect } from "react";

interface TemplateEditorProps {
  template?: {
    id?: string;
    name: string;
    description: string;
    category: string;
    content: string;
  };
  onSave: (template: any) => void;
  onCancel: () => void;
  onContentChange?: (content: string) => void;
}

const CATEGORIES = ["Shipping", "Commercial", "Certificates", "Other"];

export const TemplateEditor = ({ template, onSave, onCancel, onContentChange }: TemplateEditorProps) => {
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [category, setCategory] = useState(template?.category || "Shipping");
  const [content, setContent] = useState(template?.content || "");

  useEffect(() => {
    if (onContentChange) {
      onContentChange(content);
    }
  }, [content, onContentChange]);

  const handleSave = () => {
    onSave({
      ...(template?.id && { id: template.id }),
      name,
      description,
      category,
      content,
      is_active: true,
    });
  };

  const handleInsertVariable = (variable: string) => {
    setContent((prev) => prev + variable);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="template-name" className="text-sm font-medium">Template Name</Label>
          <Input
            id="template-name"
            placeholder="e.g., Packing List"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-category" className="text-sm font-medium">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="template-category" className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-description" className="text-sm font-medium">Description</Label>
        <Input
          id="template-description"
          placeholder="Brief description of this template"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-content" className="text-sm font-medium">
          Template Content (HTML)
          <span className="text-muted-foreground font-normal ml-2">Use variables from the right panel</span>
        </Label>
        <Textarea
          id="template-content"
          placeholder="Enter HTML template content with {{variables}}..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="font-mono text-sm min-h-[300px] resize-none bg-muted/30"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onCancel} className="min-w-24">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!name || !content} className="min-w-24">
          <Save className="h-4 w-4 mr-2" />
          Save Template
        </Button>
      </div>
    </div>
  );
};
