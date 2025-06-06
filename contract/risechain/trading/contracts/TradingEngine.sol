
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ITokenFactory {
    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 maxSupply,
        address bondingCurve
    );
}

interface IBondingCurveIntegrator {
    function getBondingCurve(address token) external view returns (
        uint256 virtualTokenReserves,
        uint256 virtualSolReserves,
        uint256 realTokenReserves,
        uint256 realSolReserves,
        bool isGraduated
    );
    
    function calculateBuyAmount(address token, uint256 ethAmount) external view returns (uint256, uint256);
    function calculateSellAmount(address token, uint256 tokenAmount) external view returns (uint256, uint256);
    function executeBuy(address token, address buyer, uint256 ethAmount) external returns (uint256);
    function executeSell(address token, address seller, uint256 tokenAmount) external returns (uint256);
}

interface IFeeTreasury {
    function collectTradingFee(address token, uint256 amount, bool isBuy) external payable;
}

interface IPointsModule {
    function addPoints(address user, uint256 points) external;
}

contract TradingEngine is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // Core interfaces
    IBondingCurveIntegrator public bondingCurveIntegrator;
    IFeeTreasury public feeTreasury;
    IPointsModule public pointsModule;
    address public tokenFactory;

    // Trading configuration
    uint256 public constant TRADING_FEE = 100; // 1%
    uint256 public constant MAX_SLIPPAGE = 1500; // 15%
    uint256 public constant POINTS_PER_TRADE = 10;

    // Token information
    struct TokenInfo {
        address creator;
        address bondingCurve;
        bool isActive;
        uint256 listingTime;
        uint256 totalVolume;
        uint256 socialScore;
        string category;
    }

    struct TradeOrder {
        address token;
        address trader;
        uint256 amount;
        uint256 maxSlippage;
        uint256 deadline;
        bool isBuy;
    }

    struct TokenMetrics {
        uint256 volume24h;
        uint256 volumeAllTime;
        uint256 trades24h;
        uint256 tradesAllTime;
        uint256 uniqueTraders;
        uint256 marketCap;
        uint256 lastPrice;
        uint256 priceChange24h;
        uint256 lastUpdateTime;
    }

    // Storage
    mapping(address => TokenInfo) public tokenInfo;
    mapping(address => TokenMetrics) public tokenMetrics;
    mapping(address => uint256) public tokenLocks; // pEVM conflict detection
    mapping(address => mapping(address => uint256)) public userTokenVolume;
    mapping(address => uint256) public userTotalVolume;
    mapping(address => uint256) public userTradeCount;

    // Events
    event TokenRegistered(address indexed token, address indexed creator, uint256 timestamp);
    event TradeExecuted(
        address indexed token,
        address indexed trader,
        uint256 amount,
        uint256 price,
        bool isBuy,
        uint256 timestamp,
        string socialNote
    );
    event BatchTradeExecuted(uint256 ordersProcessed, uint256 totalVolume);
    event TokenMetricsUpdated(address indexed token, uint256 volume24h, uint256 marketCap);

    // Modifiers
    modifier onlyTokenFactory() {
        require(msg.sender == tokenFactory, "Only token factory");
        _;
    }

    modifier noConflict(address token) {
        require(tokenLocks[token] == 0, "Token locked");
        tokenLocks[token] = 1;
        _;
        tokenLocks[token] = 0;
    }

    modifier validDeadline(uint256 deadline) {
        require(deadline >= block.timestamp, "Deadline passed");
        _;
    }

    modifier tokenExists(address token) {
        require(tokenInfo[token].isActive, "Token not active");
        _;
    }

    constructor(
        address _bondingCurveIntegrator,
        address _feeTreasury,
        address _pointsModule,
        address _tokenFactory
    ) {
        bondingCurveIntegrator = IBondingCurveIntegrator(_bondingCurveIntegrator);
        feeTreasury = IFeeTreasury(_feeTreasury);
        pointsModule = IPointsModule(_pointsModule);
        tokenFactory = _tokenFactory;
    }

    // SECTION 1.1: Automatic Token Listing System
    function registerNewToken(
        address token,
        address creator,
        address bondingCurve
    ) external onlyTokenFactory {
        require(token != address(0), "Invalid token");
        require(!tokenInfo[token].isActive, "Already registered");

        tokenInfo[token] = TokenInfo({
            creator: creator,
            bondingCurve: bondingCurve,
            isActive: true,
            listingTime: block.timestamp,
            totalVolume: 0,
            socialScore: 0,
            category: "NEW"
        });

        tokenMetrics[token] = TokenMetrics({
            volume24h: 0,
            volumeAllTime: 0,
            trades24h: 0,
            tradesAllTime: 0,
            uniqueTraders: 0,
            marketCap: 0,
            lastPrice: 0,
            priceChange24h: 0,
            lastUpdateTime: block.timestamp
        });

        emit TokenRegistered(token, creator, block.timestamp);
    }

    // SECTION 1.2: Core Trading Functions
    function buyTokens(
        address token,
        uint256 maxSlippage,
        uint256 deadline,
        string calldata socialNote
    ) external payable nonReentrant whenNotPaused validDeadline(deadline) tokenExists(token) noConflict(token) {
        require(msg.value > 0, "Invalid amount");
        require(maxSlippage <= MAX_SLIPPAGE, "Slippage too high");

        // Calculate tokens to receive
        (uint256 tokenAmount, uint256 newPrice) = bondingCurveIntegrator.calculateBuyAmount(token, msg.value);
        
        // Calculate and collect fee
        uint256 feeAmount = _collectTradingFee(token, msg.value, true);
        uint256 tradingAmount = msg.value - feeAmount;

        // Execute trade through bonding curve
        uint256 actualTokens = bondingCurveIntegrator.executeBuy{value: tradingAmount}(token, msg.sender, tradingAmount);
        
        // Validate slippage
        uint256 slippage = tokenAmount > actualTokens ? 
            ((tokenAmount - actualTokens) * 10000) / tokenAmount : 0;
        require(slippage <= maxSlippage, "Slippage exceeded");

        // Update metrics
        _updateTokenMetrics(token, msg.value, newPrice, true);
        _updateUserStats(msg.sender, token, msg.value);

        // Award points
        pointsModule.addPoints(msg.sender, POINTS_PER_TRADE);

        emit TradeExecuted(token, msg.sender, actualTokens, newPrice, true, block.timestamp, socialNote);
    }

    function sellTokens(
        address token,
        uint256 amount,
        uint256 maxSlippage,
        uint256 deadline,
        string calldata socialNote
    ) external nonReentrant whenNotPaused validDeadline(deadline) tokenExists(token) noConflict(token) {
        require(amount > 0, "Invalid amount");
        require(maxSlippage <= MAX_SLIPPAGE, "Slippage too high");
        require(IERC20(token).balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Calculate ETH to receive
        (uint256 ethAmount, uint256 newPrice) = bondingCurveIntegrator.calculateSellAmount(token, amount);
        
        // Transfer tokens from user
        IERC20(token).safeTransferFrom(msg.sender, address(bondingCurveIntegrator), amount);

        // Execute trade through bonding curve
        uint256 actualEth = bondingCurveIntegrator.executeSell(token, msg.sender, amount);
        
        // Validate slippage
        uint256 slippage = ethAmount > actualEth ? 
            ((ethAmount - actualEth) * 10000) / ethAmount : 0;
        require(slippage <= maxSlippage, "Slippage exceeded");

        // Calculate and collect fee
        uint256 feeAmount = _collectTradingFee(token, actualEth, false);
        uint256 userAmount = actualEth - feeAmount;

        // Transfer ETH to user
        payable(msg.sender).transfer(userAmount);

        // Update metrics
        _updateTokenMetrics(token, actualEth, newPrice, false);
        _updateUserStats(msg.sender, token, actualEth);

        // Award points
        pointsModule.addPoints(msg.sender, POINTS_PER_TRADE);

        emit TradeExecuted(token, msg.sender, amount, newPrice, false, block.timestamp, socialNote);
    }

    // SECTION 1.3: pEVM Trading Optimizations
    function batchTrade(
        TradeOrder[] calldata orders
    ) external payable nonReentrant whenNotPaused {
        require(orders.length > 0 && orders.length <= 10, "Invalid batch size");
        
        uint256 totalVolume = 0;
        uint256 processedOrders = 0;

        for (uint256 i = 0; i < orders.length; i++) {
            TradeOrder memory order = orders[i];
            
            // Skip if conflicts detected
            if (tokenLocks[order.token] != 0) continue;
            
            // Validate order
            if (!tokenInfo[order.token].isActive) continue;
            if (order.deadline < block.timestamp) continue;
            if (order.maxSlippage > MAX_SLIPPAGE) continue;

            // Lock token for processing
            tokenLocks[order.token] = 1;

            try this._executeSingleOrder(order) {
                processedOrders++;
                totalVolume += order.amount;
            } catch {
                // Order failed, continue with next
            }

            // Unlock token
            tokenLocks[order.token] = 0;
        }

        emit BatchTradeExecuted(processedOrders, totalVolume);
    }

    function _executeSingleOrder(TradeOrder memory order) external {
        require(msg.sender == address(this), "Internal only");
        
        if (order.isBuy) {
            // Execute buy order logic
            (uint256 tokenAmount,) = bondingCurveIntegrator.calculateBuyAmount(order.token, order.amount);
            uint256 feeAmount = _collectTradingFee(order.token, order.amount, true);
            bondingCurveIntegrator.executeBuy{value: order.amount - feeAmount}(order.token, order.trader, order.amount - feeAmount);
        } else {
            // Execute sell order logic
            (uint256 ethAmount,) = bondingCurveIntegrator.calculateSellAmount(order.token, order.amount);
            IERC20(order.token).safeTransferFrom(order.trader, address(bondingCurveIntegrator), order.amount);
            bondingCurveIntegrator.executeSell(order.token, order.trader, order.amount);
        }
    }

    // SECTION 1.4: Fee Management Integration
    function _collectTradingFee(
        address token,
        uint256 amount,
        bool isBuy
    ) internal returns (uint256 feeAmount) {
        feeAmount = (amount * TRADING_FEE) / 10000;
        
        if (isBuy) {
            feeTreasury.collectTradingFee{value: feeAmount}(token, feeAmount, isBuy);
        } else {
            feeTreasury.collectTradingFee(token, feeAmount, isBuy);
        }
        
        return feeAmount;
    }

    // SECTION 1.5: Trading Analytics & Tracking
    function _updateTokenMetrics(
        address token,
        uint256 volume,
        uint256 newPrice,
        bool isBuy
    ) internal {
        TokenMetrics storage metrics = tokenMetrics[token];
        
        // Update volume
        metrics.volumeAllTime += volume;
        
        // Update 24h volume (simplified - in production use time-weighted)
        if (block.timestamp - metrics.lastUpdateTime < 86400) {
            metrics.volume24h += volume;
        } else {
            metrics.volume24h = volume;
        }

        // Update trades
        metrics.tradesAllTime++;
        metrics.trades24h++;

        // Update price
        uint256 oldPrice = metrics.lastPrice;
        metrics.lastPrice = newPrice;
        
        if (oldPrice > 0) {
            metrics.priceChange24h = newPrice > oldPrice ? 
                ((newPrice - oldPrice) * 10000) / oldPrice :
                ((oldPrice - newPrice) * 10000) / oldPrice;
        }

        metrics.lastUpdateTime = block.timestamp;

        // Update total volume in token info
        tokenInfo[token].totalVolume += volume;

        emit TokenMetricsUpdated(token, metrics.volume24h, metrics.marketCap);
    }

    function _updateUserStats(address user, address token, uint256 volume) internal {
        // Track user-specific stats
        if (userTokenVolume[user][token] == 0) {
            tokenMetrics[token].uniqueTraders++;
        }
        
        userTokenVolume[user][token] += volume;
        userTotalVolume[user] += volume;
        userTradeCount[user]++;
    }

    // View functions
    function getTokenInfo(address token) external view returns (TokenInfo memory) {
        return tokenInfo[token];
    }

    function getTokenMetrics(address token) external view returns (TokenMetrics memory) {
        return tokenMetrics[token];
    }

    function getUserStats(address user, address token) external view returns (
        uint256 tokenVolume,
        uint256 totalVolume,
        uint256 tradeCount
    ) {
        return (
            userTokenVolume[user][token],
            userTotalVolume[user],
            userTradeCount[user]
        );
    }

    // Admin functions
    function updateBondingCurveIntegrator(address _new) external onlyOwner {
        bondingCurveIntegrator = IBondingCurveIntegrator(_new);
    }

    function updateFeeTreasury(address _new) external onlyOwner {
        feeTreasury = IFeeTreasury(_new);
    }

    function updatePointsModule(address _new) external onlyOwner {
        pointsModule = IPointsModule(_new);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Emergency functions
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}
}
