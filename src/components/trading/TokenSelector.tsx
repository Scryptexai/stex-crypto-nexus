
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog';
import { Input } from '../ui/input';
import { ChevronDown, Search } from 'lucide-react';

interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance?: string;
  price?: string;
}

interface TokenSelectorProps {
  label: string;
  selectedToken?: Token;
  onSelect: (token: Token) => void;
  balance?: string;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({
  label,
  selectedToken,
  onSelect,
  balance
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // RiseChain tokens
  const tokens: Token[] = [
    { symbol: 'WETH', name: 'Wrapped ETH', address: '0x4200000000000000000000000000000000000006', decimals: 18, balance: '2.45', price: '$2,340' },
    { symbol: 'USDC', name: 'USD Coin', address: '0x8a93d247134d91e0de6f96547cb0204e5be8e5d8', decimals: 6, balance: '1,250.00', price: '$1.00' },
    { symbol: 'USDT', name: 'Tether USD', address: '0x40918ba7f132e0acba2ce4de4c4baf9bd2d7d849', decimals: 8, balance: '850.50', price: '$1.00' },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0xf32d39ff9f6aa7a7a64d7a4f00a54826ef791a55', decimals: 18, balance: '0.125', price: '$43,250' },
    { symbol: 'RISE', name: 'RISE', address: '0xd6e1afe5ca8d00a2efc01b89997abe2de47fdfaf', decimals: 18, balance: '10,000', price: '$0.0045' },
    { symbol: 'MOG', name: 'Mog Coin', address: '0x99dbe4aea58e518c50a1c04ae9b48c9f6354612f', decimals: 18, balance: '50,000', price: '$0.0012' },
    { symbol: 'PEPE', name: 'Pepe', address: '0x6f6f570f45833e249e27022648a26f4076f48f78', decimals: 18, balance: '1,000,000', price: '$0.000008' }
  ];

  const filteredTokens = tokens.filter(token =>
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTokenSelect = (token: Token) => {
    onSelect(token);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        {balance && (
          <span className="text-sm text-muted-foreground">
            Balance: {balance}
          </span>
        )}
      </div>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between h-12 bg-card/50 border-border/50 hover:bg-card/80"
          >
            {selectedToken ? (
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">
                    {selectedToken.symbol.charAt(0)}
                  </span>
                </div>
                <div className="text-left">
                  <p className="font-medium">{selectedToken.symbol}</p>
                  <p className="text-xs text-muted-foreground">{selectedToken.name}</p>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Select token</span>
            )}
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        
        <DialogContent className="bg-card/95 backdrop-blur-lg border-border/50">
          <DialogHeader>
            <DialogTitle>Select Token</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card/50 border-border/50"
              />
            </div>
            
            <div className="max-h-80 overflow-y-auto space-y-2 custom-scrollbar">
              {filteredTokens.map((token) => (
                <div
                  key={token.address}
                  onClick={() => handleTokenSelect(token)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-primary/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-foreground">
                        {token.symbol.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{token.symbol}</p>
                      <p className="text-sm text-muted-foreground">{token.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{token.balance}</p>
                    <p className="text-sm text-muted-foreground">{token.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TokenSelector;
