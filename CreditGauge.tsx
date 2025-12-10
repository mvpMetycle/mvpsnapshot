interface CreditGaugeProps {
  current: number;
  max: number;
  label: string;
}

export const CreditGauge = ({ current, max, label }: CreditGaugeProps) => {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  
  // Determine color based on usage
  const getColor = () => {
    if (percentage >= 90) return "hsl(var(--destructive))";
    if (percentage >= 70) return "hsl(var(--warning))";
    return "hsl(var(--success))";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  // SVG gauge parameters
  const size = 140;
  const strokeWidth = 12;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 p-4 border border-border rounded-lg bg-card">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={getColor()}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-in-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color: getColor() }}>
            {percentage.toFixed(0)}%
          </span>
          <span className="text-xs text-muted-foreground mt-1">used</span>
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(current)} / {formatCurrency(max)}
        </p>
      </div>
    </div>
  );
};
