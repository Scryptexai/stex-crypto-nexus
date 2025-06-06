
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatsCard from '../components/dashboard/StatsCard';
import ChainHealthCard from '../components/dashboard/ChainHealthCard';
import { TrendingUp, Users, Zap, Star, Activity, DollarSign } from 'lucide-react';

const Dashboard: React.FC = () => {
  // Mock data for charts
  const volumeData = [
    { name: 'Sepolia', volume: 2400 },
    { name: 'RiseChain', volume: 1398 },
    { name: 'MegaETH', volume: 9800 },
    { name: 'Pharos', volume: 3908 }
  ];

  const chainDistribution = [
    { name: 'Sepolia', value: 35, color: '#22c55e' },
    { name: 'RiseChain', value: 25, color: '#06b6d4' },
    { name: 'MegaETH', value: 30, color: '#f59e0b' },
    { name: 'Pharos', value: 10, color: '#8b5cf6' }
  ];

  const recentActivities = [
    { type: 'swap', user: '0x1234...5678', amount: '1,250 USDC → 0.89 ETH', time: '2 min ago', chain: 'Sepolia' },
    { type: 'create', user: '0x9876...5432', amount: 'Created MEME token', time: '5 min ago', chain: 'RiseChain' },
    { type: 'bridge', user: '0x4567...8901', amount: '500 USDT: Sepolia → MegaETH', time: '8 min ago', chain: 'Multi' },
    { type: 'gm', user: '0x2345...6789', amount: 'GM posted (+10 STEX)', time: '12 min ago', chain: 'All' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Welcome to SCRYPTEX
        </h1>
        <p className="text-muted-foreground mt-2">
          Your multi-chain DeFi trading platform dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="24h Volume"
          value="$2.4M"
          change="+12.5%"
          trend="up"
          icon={TrendingUp}
        />
        <StatsCard
          title="Total Users"
          value="45.2K"
          change="+8.3%"
          trend="up"
          icon={Users}
        />
        <StatsCard
          title="Active Chains"
          value="4/4"
          change="All Healthy"
          trend="up"
          icon={Zap}
        />
        <StatsCard
          title="Your STEX"
          value="1,250"
          action="Earn More"
          icon={Star}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Chart */}
        <div className="trading-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart className="w-5 h-5 mr-2 text-primary" />
            Chain Volume (24h)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chain Distribution */}
        <div className="trading-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-primary" />
            Usage Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chainDistribution}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {chainDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chain Health Grid */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-primary" />
          Chain Health Monitor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ChainHealthCard
            name="Sepolia"
            status="healthy"
            blockTime="12.5s"
            gasPrice="2.1 gwei"
            volume24h="$840K"
            chainId="sepolia"
          />
          <ChainHealthCard
            name="RiseChain"
            status="healthy"
            blockTime="8.2s"
            gasPrice="1.8 gwei"
            volume24h="$520K"
            chainId="risechain"
          />
          <ChainHealthCard
            name="MegaETH"
            status="warning"
            blockTime="15.8s"
            gasPrice="3.2 gwei"
            volume24h="$980K"
            chainId="megaeth"
          />
          <ChainHealthCard
            name="Pharos"
            status="healthy"
            blockTime="10.1s"
            gasPrice="1.5 gwei"
            volume24h="$320K"
            chainId="pharos"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="trading-card p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-primary" />
          Recent Platform Activity
        </h3>
        <div className="space-y-3">
          {recentActivities.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-card/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  activity.type === 'swap' ? 'bg-primary/20 text-primary' :
                  activity.type === 'create' ? 'bg-accent/20 text-accent' :
                  activity.type === 'bridge' ? 'bg-warning/20 text-warning' :
                  'bg-success/20 text-success'
                }`}>
                  {activity.type.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{activity.user}</p>
                  <p className="text-sm text-muted-foreground">{activity.amount}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{activity.time}</p>
                <p className="text-xs text-accent">{activity.chain}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
