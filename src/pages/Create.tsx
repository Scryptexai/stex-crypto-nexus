
import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Upload, Zap, TrendingUp, Info } from 'lucide-react';

const Create: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    website: '',
    twitter: '',
    telegram: '',
    initialSupply: '',
    startPrice: '0.001',
    priceIncrement: '0.0001'
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const calculateEstimatedCost = () => {
    // Mock calculation
    return '$12.50';
  };

  const handleDeploy = () => {
    console.log('Deploying token:', formData);
    // Implement token deployment logic
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Create Token
        </h1>
        <p className="text-muted-foreground mt-2">
          Launch your token with bonding curve mechanics
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Creation Form */}
        <div className="lg:col-span-2">
          <div className="trading-card p-6">
            <h2 className="text-xl font-semibold mb-6">Token Information</h2>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Token Name</label>
                  <Input
                    placeholder="e.g., My Awesome Token"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="bg-card/30 border-border/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Symbol</label>
                  <Input
                    placeholder="e.g., MAT"
                    value={formData.symbol}
                    onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
                    className="bg-card/30 border-border/50"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  placeholder="Describe your token and its purpose..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="bg-card/30 border-border/50 h-24"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Logo</label>
                <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  {previewUrl ? (
                    <div className="flex flex-col items-center space-y-3">
                      <img 
                        src={previewUrl} 
                        alt="Token logo preview" 
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <p className="text-sm text-muted-foreground">Click to change</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-3">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Drag & drop or click to upload logo
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Website</label>
                  <Input
                    placeholder="https://mytoken.com"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="bg-card/30 border-border/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Twitter</label>
                  <Input
                    placeholder="@mytoken"
                    value={formData.twitter}
                    onChange={(e) => handleInputChange('twitter', e.target.value)}
                    className="bg-card/30 border-border/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Telegram</label>
                  <Input
                    placeholder="@mytoken_chat"
                    value={formData.telegram}
                    onChange={(e) => handleInputChange('telegram', e.target.value)}
                    className="bg-card/30 border-border/50"
                  />
                </div>
              </div>

              {/* Bonding Curve Settings */}
              <div className="bg-card/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                  Bonding Curve Configuration
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Initial Supply</label>
                    <Input
                      placeholder="1000000"
                      value={formData.initialSupply}
                      onChange={(e) => handleInputChange('initialSupply', e.target.value)}
                      className="bg-background/50 border-border/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Price (ETH)</label>
                    <Input
                      placeholder="0.001"
                      value={formData.startPrice}
                      onChange={(e) => handleInputChange('startPrice', e.target.value)}
                      className="bg-background/50 border-border/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Price Increment</label>
                    <Input
                      placeholder="0.0001"
                      value={formData.priceIncrement}
                      onChange={(e) => handleInputChange('priceIncrement', e.target.value)}
                      className="bg-background/50 border-border/50"
                    />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-info/10 border border-info/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-info mt-0.5" />
                    <div className="text-sm text-info">
                      <p className="font-medium mb-1">Bonding Curve Pricing</p>
                      <p>Token price increases automatically as more tokens are bought. 80% of funds go to liquidity, 20% to creator.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview & Deploy */}
        <div className="space-y-6">
          {/* Token Preview */}
          <div className="trading-card p-6">
            <h3 className="text-lg font-semibold mb-4">Preview</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                {previewUrl ? (
                  <img src={previewUrl} alt="Token logo" className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-bold">
                      {formData.symbol.charAt(0) || '?'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold">{formData.name || 'Token Name'}</p>
                  <p className="text-sm text-muted-foreground">{formData.symbol || 'SYMBOL'}</p>
                </div>
              </div>
              
              {formData.description && (
                <p className="text-sm text-muted-foreground">
                  {formData.description}
                </p>
              )}
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Initial Supply:</span>
                  <span>{formData.initialSupply || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Price:</span>
                  <span>{formData.startPrice || '0'} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Cap:</span>
                  <span className="text-primary">
                    {formData.initialSupply && formData.startPrice ? 
                      `${(Number(formData.initialSupply) * Number(formData.startPrice)).toFixed(2)} ETH` : 
                      '0 ETH'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Deployment Cost */}
          <div className="trading-card p-6">
            <h3 className="text-lg font-semibold mb-4">Deployment Cost</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Contract Deployment:</span>
                <span>$8.50</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Initial Liquidity:</span>
                <span>$3.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee:</span>
                <span>$1.00</span>
              </div>
              <hr className="border-border/50" />
              <div className="flex justify-between font-semibold">
                <span>Total Cost:</span>
                <span className="text-primary">{calculateEstimatedCost()}</span>
              </div>
            </div>
            
            <Button
              onClick={handleDeploy}
              disabled={!formData.name || !formData.symbol}
              className="w-full mt-4 dex-button"
            >
              <Zap className="w-4 h-4 mr-2" />
              Deploy Token
            </Button>
          </div>

          {/* STEX Rewards */}
          <div className="trading-card p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <h3 className="text-lg font-semibold mb-2 text-primary">Earn 100 STEX!</h3>
            <p className="text-sm text-muted-foreground">
              Successfully deploying a token earns you 100 STEX points towards airdrops and rewards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Create;
