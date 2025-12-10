import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { TEMPLATE_VARIABLES } from "@/lib/templateVariables";

interface VariablePickerProps {
  onInsertVariable: (variable: string) => void;
}

export const VariablePicker = ({ onInsertVariable }: VariablePickerProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(TEMPLATE_VARIABLES))
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="w-80 flex flex-col bg-card border border-border rounded-lg shadow-sm">
      <div className="p-4 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-foreground">Available Variables</h3>
        <p className="text-xs text-muted-foreground mt-1">Click to insert into template</p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {Object.entries(TEMPLATE_VARIABLES).map(([categoryKey, category]) => {
            const isExpanded = expandedCategories.has(categoryKey);
            
            return (
              <div key={categoryKey} className="space-y-1">
                <button
                  onClick={() => toggleCategory(categoryKey)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 rounded-md transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{category.label}</span>
                </button>
                
                {isExpanded && (
                  <div className="ml-6 space-y-0.5 mt-1">
                    {categoryKey === "containers" ? (
                      <div className="p-3 bg-muted/50 rounded-md text-xs mb-2">
                        <p className="font-medium text-foreground mb-2">Repeating Section:</p>
                        <code className="block bg-background/50 p-2 rounded text-muted-foreground">
                          {`{{#containers}}`}<br/>
                          {`  ...variables...`}<br/>
                          {`{{/containers}}`}
                        </code>
                      </div>
                    ) : null}
                    
                    {category.variables.map((variable) => (
                      <Button
                        key={variable.key}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs font-mono h-auto py-2 px-3 hover:bg-primary/5 hover:text-primary"
                        onClick={() => onInsertVariable(`{{${variable.key}}}`)}
                      >
                        <span className="truncate">{`{{${variable.key}}}`}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
