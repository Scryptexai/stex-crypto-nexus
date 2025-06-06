
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: LucideIcon;
  action?: string;
  onClick?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  action,
  onClick
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-success';
      case 'down': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="stat-card group cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1 group-hover:text-primary transition-colors">
            {value}
          </p>
          {change && (
            <p className={`text-sm mt-1 ${getTrendColor()}`}>
              {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {change}
            </p>
          )}
          {action && (
            <button className="text-xs text-primary hover:text-primary-dark mt-2 font-medium">
              {action}
            </button>
          )}
        </div>
        {Icon && (
          <Icon className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
      </div>
    </div>
  );
};

export default StatsCard;
