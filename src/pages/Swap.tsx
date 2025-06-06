
import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import TokenSelector from '../components/trading/TokenSelector';
import { ArrowUpDown, Settings, Zap, Clock } from 'lucide-react';

interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance?: string;
  price?: string;
}

const Swap: React.FC = () => {
  const [fromToken, setFromToken] = useState<Token | undefined>();
  const [toToken, setToToken] = useState<Token | undefined>();
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');

  const recentTrades = [
    { from: 'WETH', to: 'USDC', amount: '1.25', value: '$2,925', time: '2m ago', user: '0x1234...5678' },
    { from: 'USDT', to: 'RISE', amount: '500', value: '$500', time: '5m ago', user: '0x9876...5432' },
    { from: 'PEPE', to: 'WETH', amount: '1M', value: '$8', time: '8m ago', user: '0x4567...8901' },
    { from: 'MOG', to: 'USDC', amount: '25K', value: '$30', time: '12m ago', user: '0x2345...6789' }
  ];

  const handleSwapDirection = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleSwap = () => {
    console.log('Executing swap:', { fromToken, toToken, fromAmount, toAmount });
    // Implement swap logic
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Swap Tokens
        </h1>
        <p className="text-muted-foreground mt-2">
          Trade tokens with bonding curve pricing on RiseChain
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Swap Interface */}
        <div className="lg:col-span-2">
          <div className="trading-card p-6 max-w-md mx-auto lg:max-w-none">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Swap</h2>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* From Token */}
              <div className="space-y-3">
                <TokenSelector
                  label="From"
                  selectedToken={fromToken}
                  onSelect={setFromToken}
                  balance={fromToken?.balance}
                />
                <Input
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="h-12 text-lg bg-card/30 border-border/50"
                />
              </div>

              {/* Swap Direction Button */}
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSwapDirection}
                  className="h-8 w-8 rounded-full bg-card border-2 border-border hover:border-primary transition-colors"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
              </div>

              {/* To Token */}
              <div className="space-y-3">
                <TokenSelector
                  label="To"
                  selectedToken={toToken}
                  onSelect={setToToken}
                  balance={toToken?.balance}
                />
                <Input
                  type="number"
                  placeholder="0.0"
                  value={toAmount}
                  onChange={(e) => setToAmount(e.target.value)}
                  className="h-12 text-lg bg-card/30 border-border/50"
                  readOnly
                />
              </div>

              {/* Swap Details */}
              {fromToken && toToken && fromAmount && (
                <div className="bg-card/30 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Exchange Rate</span>
                    <span>1 {fromToken.symbol} = 1,850 {toToken.symbol}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Slippage Tolerance</span>
                    <span>{slippage}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gas Fee</span>
                    <span className="flex items-center">
                      <Zap className="w-3 h-3 mr-1" />
                      ~$2.45
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. Time</span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      ~15s
                    </span>
                  </div>
                </div>
              )}

              {/* Swap Button */}
              <Button
                onClick={handleSwap}
                disabled={!fromToken || !toToken || !fromAmount}
                className="w-full h-12 dex-button"
              >
                {!fromToken || !toToken ? 'Select tokens' : 
                 !fromAmount ? 'Enter amount' : 'Swap'}
              </Button>
            </div>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="trading-card p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Trades</h3>
          <div className="space-y-3">
            {recentTrades.map((trade, index) => (
              <div key={index} className="bg-card/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{trade.from}</span>
                    <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                    <span className="font-medium text-sm">{trade.to}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{trade.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{trade.amount} {trade.from}</span>
                  <span className="text-sm font-medium text-primary">{trade.value}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{trade.user}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Swap;
