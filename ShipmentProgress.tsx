import { Ship } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

interface ShipmentProgressProps {
  departureDate: string;
  etaDate: string;
}

const ShipmentProgress = ({ departureDate, etaDate }: ShipmentProgressProps) => {
  const today = new Date();
  const departure = parseISO(departureDate);
  const eta = parseISO(etaDate);

  const totalDays = differenceInDays(eta, departure);
  const daysSinceDeparture = differenceInDays(today, departure);
  const daysRemaining = differenceInDays(eta, today);
  
  // Calculate progress percentage for ship positioning (clamp between 0-100)
  const progressPercent = Math.min(Math.max((daysSinceDeparture / totalDays) * 100, 0), 100);

  // Determine status
  const getStatus = () => {
    if (daysRemaining < 0) return { label: "Delayed", color: "text-red-600 bg-red-500/10" };
    if (daysRemaining <= 3) return { label: "Arriving Soon", color: "text-yellow-600 bg-yellow-500/10" };
    return { label: "On Time", color: "text-green-600 bg-green-500/10" };
  };

  const status = getStatus();

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <div 
          className="absolute h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
        
        {/* Ship Icon */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500"
          style={{ left: `${progressPercent}%` }}
        >
          <div className="relative">
            <Ship className="h-6 w-6 text-primary fill-primary/20" />
          </div>
        </div>

        {/* Port Markers */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full border-2 border-background" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full border-2 border-background" />
      </div>

      {/* Status Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {daysSinceDeparture} {daysSinceDeparture === 1 ? 'day' : 'days'} since departure
        </span>
        <span className={`px-2 py-0.5 rounded-full font-medium ${status.color}`}>
          {status.label}
        </span>
        <span>
          {daysRemaining > 0 
            ? `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left`
            : daysRemaining === 0
            ? 'Arriving today'
            : `${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? 'day' : 'days'} overdue`
          }
        </span>
      </div>
    </div>
  );
};

export default ShipmentProgress;
