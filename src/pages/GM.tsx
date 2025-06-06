
import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Sun, Star, TrendingUp, Users, Flame } from 'lucide-react';

const GM: React.FC = () => {
  const [gmMessage, setGmMessage] = useState('');
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(7);

  const gmFeed = [
    { 
      user: '0x1234...5678', 
      message: 'GM to the best DeFi community! LFG 🚀', 
      time: '2m ago', 
      chain: 'Sepolia',
      likes: 12,
      stexEarned: 10
    },
    { 
      user: '0x9876...5432', 
      message: 'GM builders! Another day, another deploy 💪', 
      time: '5m ago', 
      chain: 'RiseChain',
      likes: 8,
      stexEarned: 15
    },
    { 
      user: '0x4567...8901', 
      message: 'GM family! May your trades be green today 🟢', 
      time: '8m ago', 
      chain: 'MegaETH',
      likes: 15,
      stexEarned: 10
    },
    { 
      user: '0x2345...6789', 
      message: 'GM! 50 day streak and counting 🔥', 
      time: '12m ago', 
      chain: 'Pharos',
      likes: 25,
      stexEarned: 25
    }
  ];

  const leaderboard = [
    { user: '0xdefi...guru', streak: 156, totalGMs: 1240, stexEarned: 18600, rank: 1 },
    { user: '0xbull...ish', streak: 134, totalGMs: 1105, stexEarned: 16575, rank: 2 },
    { user: '0xdiam...onds', streak: 89, totalGMs: 892, stexEarned: 13380, rank: 3 },
    { user: '0xhope...ium', streak: 67, totalGMs: 734, stexEarned: 11010, rank: 4 },
    { user: '0x1234...5678', streak: currentStreak, totalGMs: 89, stexEarned: 1335, rank: 147 }
  ];

  const handleGMPost = () => {
    console.log('Posting GM:', gmMessage);
    setHasPostedToday(true);
    setGmMessage('');
    // Implement GM posting logic
  };

  const getStreakMultiplier = (streak: number) => {
    if (streak >= 30) return 2.0;
    if (streak >= 14) return 1.5;
    if (streak >= 7) return 1.2;
    return 1.0;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center justify-center">
          <Sun className="w-8 h-8 mr-3 text-primary" />
          GM Ritual
        </h1>
        <p className="text-muted-foreground mt-2">
          Start your day right, earn STEX points, build your streak
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GM Posting Interface */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post GM */}
          <div className="trading-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                <Sun className="w-5 h-5 mr-2 text-primary" />
                Post Your GM
              </h2>
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{currentStreak} day streak</span>
              </div>
            </div>

            {hasPostedToday ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sun className="w-8 h-8 text-success" />
                </div>
                <h3 className="text-lg font-semibold text-success mb-2">GM Posted! ☀️</h3>
                <p className="text-muted-foreground">
                  You've earned {Math.floor(10 * getStreakMultiplier(currentStreak))} STEX points today
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Come back tomorrow to maintain your streak!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Textarea
                  placeholder="Share your morning vibes with the community... GM! 🌅"
                  value={gmMessage}
                  onChange={(e) => setGmMessage(e.target.value)}
                  className="bg-card/30 border-border/50 h-24"
                  maxLength={280}
                />
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {280 - gmMessage.length} characters remaining
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Reward: </span>
                    <span className="text-primary font-medium">
                      {Math.floor(10 * getStreakMultiplier(currentStreak))} STEX
                    </span>
                    {getStreakMultiplier(currentStreak) > 1 && (
                      <span className="text-accent ml-1">
                        ({getStreakMultiplier(currentStreak)}x streak bonus!)
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleGMPost}
                  disabled={gmMessage.trim().length === 0}
                  className="w-full dex-button"
                >
                  <Sun className="w-4 h-4 mr-2" />
                  Post GM & Earn STEX
                </Button>
              </div>
            )}
          </div>

          {/* Community GM Feed */}
          <div className="trading-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-primary" />
              Community GM Feed
            </h3>
            
            <div className="space-y-4">
              {gmFeed.map((post, index) => (
                <div key={index} className="bg-card/30 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-primary-foreground">
                          {post.user.slice(2, 4).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{post.user}</p>
                        <p className="text-xs text-muted-foreground">{post.time} • {post.chain}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-primary">+{post.stexEarned} STEX</p>
                      <p className="text-xs text-muted-foreground">{post.likes} ❤️</p>
                    </div>
                  </div>
                  
                  <p className="text-sm mb-3">{post.message}</p>
                  
                  <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                      ❤️ Like
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                      💬 Reply
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                      🚀 Boost
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Your Stats */}
          <div className="trading-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Star className="w-5 h-5 mr-2 text-primary" />
              Your GM Stats
            </h3>
            
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-2">
                  <Flame className="w-8 h-8 text-primary-foreground" />
                </div>
                <p className="text-2xl font-bold">{currentStreak}</p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-card/30 rounded-lg p-3">
                  <p className="text-lg font-bold">89</p>
                  <p className="text-xs text-muted-foreground">Total GMs</p>
                </div>
                <div className="bg-card/30 rounded-lg p-3">
                  <p className="text-lg font-bold text-primary">1,335</p>
                  <p className="text-xs text-muted-foreground">STEX Earned</p>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Next milestone</p>
                <div className="bg-card/30 rounded-full h-2 mb-1">
                  <div 
                    className="bg-primary rounded-full h-2 transition-all duration-300"
                    style={{ width: `${(currentStreak % 7) * (100/7)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {7 - (currentStreak % 7)} days to {Math.floor(currentStreak/7) + 1}x multiplier
                </p>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="trading-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary" />
              GM Leaderboard
            </h3>
            
            <div className="space-y-3">
              {leaderboard.slice(0, 3).map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-yellow-900' :
                      index === 1 ? 'bg-gray-400 text-gray-900' :
                      'bg-orange-500 text-orange-900'
                    }`}>
                      {user.rank}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.user}</p>
                      <p className="text-xs text-muted-foreground">{user.streak} day streak</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">{user.stexEarned.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">STEX</p>
                  </div>
                </div>
              ))}
              
              <div className="border-t border-border/50 pt-3">
                <div className="flex items-center justify-between p-2 bg-card/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
                      {leaderboard[4].rank}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-primary">You</p>
                      <p className="text-xs text-muted-foreground">{leaderboard[4].streak} day streak</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">{leaderboard[4].stexEarned.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">STEX</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GM;
