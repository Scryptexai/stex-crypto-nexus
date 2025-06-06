
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { ChevronDown, Menu, Wallet } from 'lucide-react';

const TopNavigation: React.FC = () => {
  const [selectedChain, setSelectedChain] = useState('sepolia');
  
  const chains = [
    { id: 'sepolia', name: 'Sepolia', status: 'active' },
    { id: 'risechain', name: 'RiseChain', status: 'active' },
    { id: 'megaeth', name: 'MegaETH', status: 'active' },
    { id: 'pharos', name: 'Pharos', status: 'active' }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-b border-border/50 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              SCRYPTEX
            </span>
          </Link>

          {/* Chain Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-card/50 border-border/50">
                <span className="capitalize">{selectedChain}</span>
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-card/95 backdrop-blur-lg border-border/50">
              {chains.map((chain) => (
                <DropdownMenuItem 
                  key={chain.id}
                  onClick={() => setSelectedChain(chain.id)}
                  className="hover:bg-primary/10"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="capitalize">{chain.name}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      chain.status === 'active' ? 'bg-success' : 'bg-warning'
                    }`} />
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" className="bg-card/50 border-border/50">
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
            
            <Button variant="outline" size="sm" className="bg-accent/10 border-accent/30 text-accent hover:bg-accent/20">
              Faucet
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-lg border-border/50 w-48">
                <DropdownMenuItem className="hover:bg-primary/10">
                  🎁 Airdrop (STEX Points)
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-primary/10">
                  🔗 Referral System
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-primary/10">
                  ⚙️ Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-primary/10">
                  📊 Analytics
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-primary/10">
                  ❓ Help & Support
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-primary/10">
                  📚 Documentation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopNavigation;
