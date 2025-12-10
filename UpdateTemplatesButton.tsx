import { Button } from "@/components/ui/button";
import { Wrench, Palette } from "lucide-react";
import { updateTemplateSignatureTags } from "@/utils/updateTemplateSignatureTags";
import { updateTemplateLogoGradient } from "@/utils/updateTemplateLogoGradient";
import { useState } from "react";

/**
 * One-time utility button to update document templates with correct PandaDoc signature tags
 * This component can be added temporarily to any page to run the update
 */
export const UpdateTemplatesButton = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingLogo, setIsUpdatingLogo] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    await updateTemplateSignatureTags();
    setIsUpdating(false);
  };

  const handleUpdateLogo = async () => {
    setIsUpdatingLogo(true);
    await updateTemplateLogoGradient();
    setIsUpdatingLogo(false);
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleUpdate}
        disabled={isUpdating}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Wrench className="h-4 w-4" />
        {isUpdating ? "Updating..." : "Fix Signature Tags"}
      </Button>
      <Button
        onClick={handleUpdateLogo}
        disabled={isUpdatingLogo}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Palette className="h-4 w-4" />
        {isUpdatingLogo ? "Updating..." : "Fix Logo Gradient"}
      </Button>
    </div>
  );
};