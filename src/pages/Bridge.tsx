
import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import { ArrowRight, Clock, Zap, Info, CheckCircle } from 'lucide-react';

const Bridge: React.FC = () => {
  const [fromChain, setFromChain] = useState('');
  const [toChain, setToChain] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [amount, setAmount] = useState('');

  const chains = [
    { id: 'sepolia', name: 'Sepolia', logo: '🔵' },
    { id: 'risechain', name: 'RiseChain', logo: '🚀' },
    { id: 'megaeth', name: 'MegaETH', logo: '⚡' },
    { id: 'pharos', name: 'Pharos', logo: '🏛️' }
  ];

  const assets = [
    { symbol: 'ETH', name: 'Ethereum', balance: '2.45' },
    { symbol: 'USDC', name: 'USD Coin', balance: '1,250.00' },
    { symbol: 'USDT', name: 'Tether USD', balance: '850.50' },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', balance: '0.125' }
  ];

  const bridgeHistory = [
    { 
      from: 'Sepolia', 
      to: 'RiseChain', 
      asset: 'USDC', 
      amount: '500', 
      status: 'completed', 
      time: '2h ago',
      txHash: '0x1234...5678'
    },
    { 
      from: 'MegaETH', 
      to: 'Sepolia', 
      asset: 'ETH', 
      amount: '1.25', 
      status: 'pending', 
      time: '15m ago',
      txHash: '0x9876...5432'
    },
    { 
      from: 'Pharos', 
      to: 'RiseChain', 
      asset: 'USDT', 
      amount: '200', 
      status: 'completed', 
      time: '1d ago',
      txHash: '0x4567...8901'
    }
  ];

  const calculateFees = () => {
    if (!amount || !fromChain || !toChain) return null;
    
    const baseFee = 0.005; // ETH
    const bridgeFee = parseFloat(amount) * 0.001; // 0.1%
    const total = baseFee + bridgeFee;
    
    return {
      baseFee: baseFee.toFixed(4),
      bridgeFee: bridgeFee.toFixed(4),
      total: total.toFixed(4)
    };
  };

  const getEstimatedTime = () => {
    if (!fromChain || !toChain) return null;
    
    // Mock time estimates
    if (fromChain === 'sepolia' || toChain === 'sepolia') return '5-10 minutes';
    return '2-5 minutes';
  };

  const fees = calculateFees();
  const estimatedTime = getEstimatedTime();

  const handleBridge = () => {
    console.log('Initiating bridge:', { fromChain, toChain, selectedAsset, amount });
    // Implement bridge logic
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Cross-Chain Bridge
        </h1>
        <p className="text-muted-foreground mt-2">
          Move assets seamlessly between supported chains
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bridge Interface */}
        <div className="lg:col-span-2">
          <div className="trading-card p-6 max-w-md mx-auto lg:max-w-none">
            <h2 className="text-xl font-semibold mb-6">Bridge Assets</h2>

            <div className="space-y-6">
              {/* Chain Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div>
                  <label className="block text-sm font-medium mb-2">From Chain</label>
                  <Select value={fromChain} onValueChange={setFromChain}>
                    <SelectTrigger className="bg-card/50 border-border/50">
                      <SelectValue placeholder="Select chain" />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-lg border-border/50">
                      {chains.map((chain) => (
                        <SelectItem key={chain.id} value={chain.id}>
                          <div className="flex items-center space-x-2">
                            <span>{chain.logo}</span>
                            <span>{chain.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-center">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">To Chain</label>
                  <Select value={toChain} onValueChange={setToChain}>
                    <SelectTrigger className="bg-card/50 border-border/50">
                      <SelectValue placeholder="Select chain" />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-lg border-border/50">
                      {chains.filter(chain => chain.id !== fromChain).map((chain) => (
                        <SelectItem key={chain.id} value={chain.id}>
                          <div className="flex items-center space-x-2">
                            <span>{chain.logo}</span>
                            <span>{chain.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Asset Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Asset</label>
                <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                  <SelectTrigger className="bg-card/50 border-border/50">
                    <SelectValue placeholder="Select asset to bridge" />
                  </SelectTrigger>
                  <SelectContent className="bg-card/95 backdrop-blur-lg border-border/50">
                    {assets.map((asset) => (
                      <SelectItem key={asset.symbol} value={asset.symbol}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-primary-foreground">
                                {asset.symbol.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{asset.symbol}</p>
                              <p className="text-xs text-muted-foreground">{asset.name}</p>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {asset.balance}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Amount</label>
                  {selectedAsset && (
                    <span className="text-sm text-muted-foreground">
                      Balance: {assets.find(a => a.symbol === selectedAsset)?.balance || '0'}
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 text-lg bg-card/30 border-border/50"
                />
              </div>

              {/* Bridge Details */}
              {fees && estimatedTime && (
                <div className="bg-card/30 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium flex items-center">
                    <Info className="w-4 h-4 mr-2 text-primary" />
                    Bridge Details
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network Fee:</span>
                      <span>{fees.baseFee} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bridge Fee (0.1%):</span>
                      <span>{fees.bridgeFee} {selectedAsset}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimated Time:</span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {estimatedTime}
                      </span>
                    </div>
                    <hr className="border-border/50" />
                    <div className="flex justify-between font-medium">
                      <span>Total Fee:</span>
                      <span className="text-primary">{fees.total} ETH</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bridge Button */}
              <Button
                onClick={handleBridge}
                disabled={!fromChain || !toChain || !selectedAsset || !amount}
                className="w-full h-12 dex-button"
              >
                <Zap className="w-4 h-4 mr-2" />
                {!fromChain || !toChain ? 'Select chains' :
                 !selectedAsset ? 'Select asset' :
                 !amount ? 'Enter amount' : 'Bridge Assets'}
              </Button>
            </div>
          </div>
        </div>

        {/* Bridge History */}
        <div className="trading-card p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Bridges</h3>
          
          <div className="space-y-3">
            {bridgeHistory.map((bridge, index) => (
              <div key={index} className="bg-card/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{bridge.from}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{bridge.to}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {bridge.status === 'completed' ? (
                      <CheckCircle className="w-3 h-3 text-success" />
                    ) : (
                      <Clock className="w-3 h-3 text-warning" />
                    )}
                    <span className={`text-xs capitalize ${
                      bridge.status === 'completed' ? 'text-success' : 'text-warning'
                    }`}>
                      {bridge.status}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {bridge.amount} {bridge.asset}
                  </span>
                  <span className="text-xs text-muted-foreground">{bridge.time}</span>
                </div>
                
                <div className="text-xs text-muted-foreground mt-1">
                  {bridge.txHash}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-start space-x-2">
              <Zap className="w-4 h-4 text-primary mt-0.5" />
              <div className="text-sm text-primary">
                <p className="font-medium mb-1">Earn 15 STEX per bridge!</p>
                <p>Cross-chain bridges earn you STEX points towards airdrops and rewards.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bridge;
