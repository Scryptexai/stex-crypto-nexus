
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SocialTradingHub is Ownable, ReentrancyGuard {
    
    struct Comment {
        address author;
        string content;
        uint256 timestamp;
        uint256 likes;
        uint256 dislikes;
        bool isVerified;
        bytes32 parentComment;
        bool isActive;
    }

    struct TradeBroadcast {
        address trader;
        address token;
        uint256 amount;
        bool isBuy;
        uint256 price;
        uint256 timestamp;
        string note;
        uint256 likes;
        uint256 comments;
    }

    struct UserStats {
        uint256 totalVolume;
        uint256 totalTrades;
        uint256 totalProfit;
        int256 pnl;
        uint256 followers;
        uint256 following;
        uint256 likes;
        uint256 dislikes;
        uint256 firstTradeTime;
        uint256 lastActiveTime;
        bool isVerified;
        string username;
        string bio;
    }

    struct TraderBehavior {
        uint256 avgTimeBetweenTrades;
        uint256 slippageTolerance;
        uint256 tradesPerHour;
        uint256 socialInteractions;
        uint256 lastTradeTime;
        uint256 tradeCount;
    }

    // Storage
    mapping(address => mapping(bytes32 => Comment)) public comments;
    mapping(address => bytes32[]) public tokenComments;
    mapping(bytes32 => TradeBroadcast) public tradeBroadcasts;
    mapping(address => UserStats) public userStats;
    mapping(address => TraderBehavior) public traderBehaviors;
    mapping(address => mapping(address => bool)) public isFollowing;
    mapping(address => mapping(bytes32 => bool)) public hasLikedComment;
    mapping(address => mapping(bytes32 => bool)) public hasLikedTrade;
    
    bytes32[] public allTradeBroadcasts;
    uint256 public commentCounter;
    uint256 public broadcastCounter;

    address public tradingEngine;

    // Events
    event CommentPosted(address indexed token, address indexed author, bytes32 commentId, string content);
    event CommentLiked(bytes32 indexed commentId, address indexed liker, bool isLike);
    event TradeBroadcasted(address indexed trader, address indexed token, bytes32 broadcastId);
    event UserFollowed(address indexed follower, address indexed followed);
    event UserUnfollowed(address indexed follower, address indexed unfollowed);
    event ReputationUpdated(address indexed user, uint256 newReputation);

    modifier onlyTradingEngine() {
        require(msg.sender == tradingEngine, "Only trading engine");
        _;
    }

    modifier validToken(address token) {
        require(token != address(0), "Invalid token");
        _;
    }

    constructor(address _tradingEngine) {
        tradingEngine = _tradingEngine;
    }

    // SECTION 4.1: Real-Time Social Features
    function postComment(
        address token,
        string calldata content,
        bytes32 parentComment
    ) external validToken(token) {
        require(bytes(content).length > 0 && bytes(content).length <= 500, "Invalid content length");
        
        bytes32 commentId = keccak256(abi.encodePacked(
            token,
            msg.sender,
            content,
            block.timestamp,
            commentCounter++
        ));

        comments[token][commentId] = Comment({
            author: msg.sender,
            content: content,
            timestamp: block.timestamp,
            likes: 0,
            dislikes: 0,
            isVerified: userStats[msg.sender].isVerified,
            parentComment: parentComment,
            isActive: true
        });

        tokenComments[token].push(commentId);
        
        // Update user behavior
        traderBehaviors[msg.sender].socialInteractions++;
        userStats[msg.sender].lastActiveTime = block.timestamp;

        emit CommentPosted(token, msg.sender, commentId, content);
    }

    function likeComment(address token, bytes32 commentId, bool isLike) external {
        require(comments[token][commentId].isActive, "Comment not found");
        require(!hasLikedComment[msg.sender][commentId], "Already voted");

        hasLikedComment[msg.sender][commentId] = true;

        if (isLike) {
            comments[token][commentId].likes++;
            userStats[comments[token][commentId].author].likes++;
        } else {
            comments[token][commentId].dislikes++;
            userStats[comments[token][commentId].author].dislikes++;
        }

        // Update social interactions
        traderBehaviors[msg.sender].socialInteractions++;

        emit CommentLiked(commentId, msg.sender, isLike);
    }

    function getTokenComments(address token, uint256 limit) external view returns (bytes32[] memory) {
        bytes32[] memory allComments = tokenComments[token];
        if (allComments.length <= limit) {
            return allComments;
        }

        bytes32[] memory limitedComments = new bytes32[](limit);
        uint256 startIndex = allComments.length - limit;
        for (uint i = 0; i < limit; i++) {
            limitedComments[i] = allComments[startIndex + i];
        }
        return limitedComments;
    }

    // SECTION 4.2: Live Trading Feed
    function broadcastTrade(
        address token,
        uint256 amount,
        bool isBuy,
        uint256 price,
        string calldata note
    ) external onlyTradingEngine {
        bytes32 broadcastId = keccak256(abi.encodePacked(
            msg.sender,
            token,
            amount,
            block.timestamp,
            broadcastCounter++
        ));

        tradeBroadcasts[broadcastId] = TradeBroadcast({
            trader: tx.origin, // Get original trader address
            token: token,
            amount: amount,
            isBuy: isBuy,
            price: price,
            timestamp: block.timestamp,
            note: note,
            likes: 0,
            comments: 0
        });

        allTradeBroadcasts.push(broadcastId);

        // Update trader behavior
        address trader = tx.origin;
        TraderBehavior storage behavior = traderBehaviors[trader];
        
        if (behavior.lastTradeTime > 0) {
            uint256 timeDiff = block.timestamp - behavior.lastTradeTime;
            behavior.avgTimeBetweenTrades = (behavior.avgTimeBetweenTrades + timeDiff) / 2;
        }
        
        behavior.lastTradeTime = block.timestamp;
        behavior.tradeCount++;
        
        // Calculate trades per hour
        if (block.timestamp - behavior.lastTradeTime <= 3600) {
            behavior.tradesPerHour++;
        } else {
            behavior.tradesPerHour = 1;
        }

        emit TradeBroadcasted(trader, token, broadcastId);
    }

    function likeTradeBroadcast(bytes32 broadcastId) external {
        require(tradeBroadcasts[broadcastId].trader != address(0), "Broadcast not found");
        require(!hasLikedTrade[msg.sender][broadcastId], "Already liked");

        hasLikedTrade[msg.sender][broadcastId] = true;
        tradeBroadcasts[broadcastId].likes++;

        // Update trader stats
        userStats[tradeBroadcasts[broadcastId].trader].likes++;

        // Update social interactions
        traderBehaviors[msg.sender].socialInteractions++;
    }

    function getLatestTrades(uint256 limit) external view returns (bytes32[] memory) {
        if (allTradeBroadcasts.length <= limit) {
            return allTradeBroadcasts;
        }

        bytes32[] memory latestTrades = new bytes32[](limit);
        uint256 startIndex = allTradeBroadcasts.length - limit;
        for (uint i = 0; i < limit; i++) {
            latestTrades[i] = allTradeBroadcasts[startIndex + i];
        }
        return latestTrades;
    }

    // SECTION 4.3: User Reputation System
    function calculateReputation(address user) public view returns (uint256) {
        UserStats memory stats = userStats[user];
        
        uint256 volumeRep = stats.totalVolume / 1 ether;
        uint256 profitRep = stats.totalProfit > 0 ? stats.totalProfit / (1 ether / 10) : 0; // 0.1 ETH units
        uint256 socialRep = stats.likes > stats.dislikes ? (stats.likes - stats.dislikes) : 0;
        uint256 timeRep = stats.firstTradeTime > 0 ? (block.timestamp - stats.firstTradeTime) / 86400 : 0; // Days
        
        return (volumeRep + profitRep + socialRep + timeRep) / 4;
    }

    function updateUserStats(
        address user,
        uint256 volume,
        int256 pnl
    ) external onlyTradingEngine {
        UserStats storage stats = userStats[user];
        
        if (stats.firstTradeTime == 0) {
            stats.firstTradeTime = block.timestamp;
        }
        
        stats.totalVolume += volume;
        stats.totalTrades++;
        stats.pnl += pnl;
        
        if (pnl > 0) {
            stats.totalProfit += uint256(pnl);
        }
        
        stats.lastActiveTime = block.timestamp;

        emit ReputationUpdated(user, calculateReputation(user));
    }

    // SECTION 4.4: Social Trading Features
    function followUser(address userToFollow) external {
        require(userToFollow != msg.sender, "Cannot follow yourself");
        require(!isFollowing[msg.sender][userToFollow], "Already following");

        isFollowing[msg.sender][userToFollow] = true;
        userStats[userToFollow].followers++;
        userStats[msg.sender].following++;

        emit UserFollowed(msg.sender, userToFollow);
    }

    function unfollowUser(address userToUnfollow) external {
        require(isFollowing[msg.sender][userToUnfollow], "Not following");

        isFollowing[msg.sender][userToUnfollow] = false;
        userStats[userToUnfollow].followers--;
        userStats[msg.sender].following--;

        emit UserUnfollowed(msg.sender, userToUnfollow);
    }

    function updateProfile(string calldata username, string calldata bio) external {
        require(bytes(username).length <= 32, "Username too long");
        require(bytes(bio).length <= 200, "Bio too long");

        userStats[msg.sender].username = username;
        userStats[msg.sender].bio = bio;
        userStats[msg.sender].lastActiveTime = block.timestamp;
    }

    // Bot Detection System
    function detectBot(address trader) public view returns (bool) {
        TraderBehavior memory behavior = traderBehaviors[trader];
        
        bool tooFastTrades = behavior.avgTimeBetweenTrades < 5 && behavior.tradeCount > 10;
        bool perfectTiming = behavior.slippageTolerance == 0 && behavior.tradeCount > 5;
        bool highFreq = behavior.tradesPerHour > 100;
        bool noSocial = behavior.socialInteractions == 0 && behavior.tradeCount > 20;
        
        return tooFastTrades && perfectTiming && (highFreq || noSocial);
    }

    function getTopTraders(uint256 limit) external view returns (address[] memory topTraders, uint256[] memory reputations) {
        // This is a simplified implementation - in production, maintain a sorted list
        address[] memory allTraders = new address[](100); // Placeholder
        uint256[] memory allReputations = new uint256[](100);
        
        // Sort by reputation (bubble sort for demo)
        for (uint i = 0; i < allTraders.length - 1; i++) {
            for (uint j = 0; j < allTraders.length - i - 1; j++) {
                if (allReputations[j] < allReputations[j + 1]) {
                    // Swap
                    address tempAddr = allTraders[j];
                    uint256 tempRep = allReputations[j];
                    allTraders[j] = allTraders[j + 1];
                    allReputations[j] = allReputations[j + 1];
                    allTraders[j + 1] = tempAddr;
                    allReputations[j + 1] = tempRep;
                }
            }
        }

        uint256 resultLength = limit > allTraders.length ? allTraders.length : limit;
        topTraders = new address[](resultLength);
        reputations = new uint256[](resultLength);
        
        for (uint i = 0; i < resultLength; i++) {
            topTraders[i] = allTraders[i];
            reputations[i] = allReputations[i];
        }
    }

    // View functions
    function getComment(address token, bytes32 commentId) external view returns (Comment memory) {
        return comments[token][commentId];
    }

    function getTradeBroadcast(bytes32 broadcastId) external view returns (TradeBroadcast memory) {
        return tradeBroadcasts[broadcastId];
    }

    function getUserStats(address user) external view returns (UserStats memory) {
        return userStats[user];
    }

    function getTraderBehavior(address trader) external view returns (TraderBehavior memory) {
        return traderBehaviors[trader];
    }

    function isUserFollowing(address follower, address followed) external view returns (bool) {
        return isFollowing[follower][followed];
    }

    // Admin functions
    function setTradingEngine(address _tradingEngine) external onlyOwner {
        tradingEngine = _tradingEngine;
    }

    function verifyUser(address user, bool verified) external onlyOwner {
        userStats[user].isVerified = verified;
    }

    function moderateComment(address token, bytes32 commentId, bool active) external onlyOwner {
        comments[token][commentId].isActive = active;
    }
}
