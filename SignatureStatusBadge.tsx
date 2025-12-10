import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Send, 
  Eye, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Ban
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SignatureStatusBadgeProps {
  status: string;
  className?: string;
  showIcon?: boolean;
  tooltipDetails?: string;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "generated":
      return {
        label: "Generated",
        variant: "secondary" as const,
        icon: FileText,
        className: "bg-muted text-muted-foreground",
        description: "Document generated, ready to upload to PandaDoc",
      };
    case "uploaded":
      return {
        label: "Uploaded",
        variant: "secondary" as const,
        icon: FileText,
        className: "bg-blue-500/20 text-blue-600 border-blue-500/30",
        description: "Document uploaded to PandaDoc, awaiting signature",
      };
    case "draft":
      return {
        label: "Draft",
        variant: "secondary" as const,
        icon: FileText,
        className: "bg-muted text-muted-foreground",
        description: "Document created in PandaDoc, awaiting Metycle signature",
      };
    case "signed_by_metycle":
      return {
        label: "Signed by Metycle",
        variant: "default" as const,
        icon: CheckCircle2,
        className: "bg-primary/20 text-primary border-primary/30",
        description: "Metycle has signed, ready to send to counterparty",
      };
    case "sent_to_counterparty":
      return {
        label: "Sent to Counterparty",
        variant: "default" as const,
        icon: Send,
        className: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
        description: "Sent to counterparty for signature",
      };
    case "sent":
      return {
        label: "Sent",
        variant: "default" as const,
        icon: Send,
        className: "bg-primary/20 text-primary border-primary/30",
        description: "Document sent to recipients",
      };
    case "viewed":
      return {
        label: "Viewed",
        variant: "secondary" as const,
        icon: Eye,
        className: "bg-blue-500/20 text-blue-600 border-blue-500/30",
        description: "Document has been viewed by recipient",
      };
    case "waiting_approval":
      return {
        label: "Awaiting Approval",
        variant: "secondary" as const,
        icon: Clock,
        className: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
        description: "Waiting for approval",
      };
    case "completed":
      return {
        label: "Completed",
        variant: "default" as const,
        icon: CheckCircle2,
        className: "bg-green-500/20 text-green-600 border-green-500/30",
        description: "Document signed by all parties",
      };
    case "declined":
      return {
        label: "Declined",
        variant: "destructive" as const,
        icon: XCircle,
        className: "bg-destructive/20 text-destructive border-destructive/30",
        description: "Document signing was declined",
      };
    case "voided":
      return {
        label: "Voided",
        variant: "secondary" as const,
        icon: Ban,
        className: "bg-muted text-muted-foreground",
        description: "Document signing was cancelled",
      };
    default:
      return {
        label: status,
        variant: "secondary" as const,
        icon: FileText,
        className: "bg-muted text-muted-foreground",
        description: "Unknown status",
      };
  }
};

export const SignatureStatusBadge = ({
  status,
  className = "",
  showIcon = true,
  tooltipDetails,
}: SignatureStatusBadgeProps) => {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  const badge = (
    <Badge
      variant={config.variant}
      className={`${config.className} ${className}`}
    >
      {showIcon && <Icon className="mr-1 h-3 w-3" />}
      {config.label}
    </Badge>
  );

  if (tooltipDetails || config.description) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltipDetails || config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
};
