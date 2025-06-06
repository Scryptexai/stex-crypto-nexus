
import React from 'react';

interface ChainHealthCardProps {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  blockTime: string;
  gasPrice: string;
  volume24h: string;
  chainId: string;
}

const ChainHealthCard: React.FC<ChainHealthCardProps> = ({
  name,
  status,
  blockTime,
  gasPrice,
  volume24h,
  chainId
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return 'bg-success';
      case 'warning': return 'bg-warning';
      case 'error': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'healthy': return 'Healthy';
      case 'warning': return 'Slow';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  return (
    <div className="chain-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">{name}</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span className="text-xs text-muted-foreground">{getStatusText()}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Block Time</p>
          <p className="font-medium">{blockTime}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Gas Price</p>
          <p className="font-medium">{gasPrice}</p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground">24h Volume</p>
          <p className="font-medium text-primary">{volume24h}</p>
        </div>
      </div>
    </div>
  );
};

export default ChainHealthCard;
