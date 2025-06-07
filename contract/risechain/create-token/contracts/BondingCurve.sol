
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IGraduationManager {
    function executeGraduation(address token) external;
}

contract BondingCurve is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // EXACT Pump.fun Parameters
    uint256 public constant VIRTUAL_TOKEN_RESERVES = 800_000_000 * 1e18; // 800M tokens
    uint256 public constant VIRTUAL_SOL_RESERVES = 30 * 1e18; // 30 ETH equivalent
    uint256 public constant GRADUATION_THRESHOLD = 69000 * 1e18; // $69k market cap
    uint256 public constant GRADUATION_TOKENS = 200_000_000 * 1e18; // 200M tokens to LP
    uint256 public constant CREATOR_REWARD = 5 * 1e17; // 0.5 ETH
    uint256 public constant SERVICE_FEE = 0; // No service fee initially
    uint256 public constant MAX_SUPPLY_PER_TX = 2; // 2% of supply per transaction
    uint256 public constant TRADING_FEE = 100; // 1% (100 basis points)

    struct CurveInfo {
        address token;
        address creator;
        uint256 virtualTokenReserves;
        uint256 virtualSolReserves;
        uint256 realTokenReserves;
        uint256 realSolReserves;
        uint256 totalSupply;
        bool isGraduated;
        uint256 createdAt;
        uint256 lastPrice;
        uint256 totalVolume;
        uint256 totalTrades;
    }

    // Storage
    mapping(address => CurveInfo) public curves;
    mapping(address => mapping(address => uint256)) public userPurchases24h;
    mapping(address => uint256) public lastPurchaseTime;
    
    IGraduationManager public graduationManager;
    address public tradingEngine;
    address public feeTreasury;

    // Events
    event CurveInitialized(address indexed token, address indexed creator, uint256 timestamp);
    event TokensPurchased(address indexed token, address indexed buyer, uint256 ethAmount, uint256 tokenAmount, uint256 price);
    event TokensSold(address indexed token, address indexed seller, uint256 tokenAmount, uint256 ethAmount, uint256 price);
    event GraduationTriggered(address indexed token, uint256 marketCap, uint256 timestamp);
    event PriceUpdated(address indexed token, uint256 newPrice, uint256 marketCap);

    modifier onlyTradingEngine() {
        require(msg.sender == tradingEngine, "Only trading engine");
        _;
    }

    modifier antiBot(address token, uint256 amount) {
        require(block.timestamp >= lastPurchaseTime[msg.sender] + 1, "Too fast");
        require(amount <= VIRTUAL_TOKEN_RESERVES * MAX_SUPPLY_PER_TX / 100, "Amount too large");
        _;
        lastPurchaseTime[msg.sender] = block.timestamp;
    }

    modifier curveExists(address token) {
        require(curves[token].token != address(0), "Curve not initialized");
        _;
    }

    modifier notGraduated(address token) {
        require(!curves[token].isGraduated, "Token graduated");
        _;
    }

    constructor() {}

    // Initialize bonding curve for new token
    function initializeBondingCurve(
        address token,
        uint256 initialSupply,
        uint256 maxSupply,
        address creator
    ) external onlyTradingEngine returns (address curveAddress) {
        require(curves[token].token == address(0), "Already initialized");
        require(initialSupply == 800_000_000 * 1e18, "Invalid initial supply");
        require(maxSupply == 1_000_000_000 * 1e18, "Invalid max supply");
        
        curves[token] = CurveInfo({
            token: token,
            creator: creator,
            virtualTokenReserves: VIRTUAL_TOKEN_RESERVES,
            virtualSolReserves: VIRTUAL_SOL_RESERVES,
            realTokenReserves: initialSupply,
            realSolReserves: 0,
            totalSupply: initialSupply,
            isGraduated: false,
            createdAt: block.timestamp,
            lastPrice: _calculateInitialPrice(),
            totalVolume: 0,
            totalTrades: 0
        });

        emit CurveInitialized(token, creator, block.timestamp);
        return address(this);
    }

    // EXACT Pump.fun Price Formula: y = 1073000191 - 32190005730/(30+x)
    function calculatePrice(uint256 supply) public pure returns (uint256) {
        uint256 supplyInTokens = supply / 1e18; // Convert to token units
        uint256 denominator = 30 + supplyInTokens;
        require(denominator > 0, "Division by zero");
        
        // Calculate price in wei (scaled by 1e18)
        uint256 numerator = 32190005730 * 1e18;
        uint256 price = 1073000191 - (numerator / denominator);
        
        return price;
    }

    function _calculateInitialPrice() internal pure returns (uint256) {
        return calculatePrice(0);
    }

    // Calculate buy amount using constant product formula
    function calculateBuyAmount(
        address token,
        uint256 ethAmount
    ) external view curveExists(token) notGraduated(token) returns (uint256 tokenAmount, uint256 newPrice) {
        CurveInfo memory curve = curves[token];
        
        // Remove trading fee from eth amount
        uint256 feeAmount = (ethAmount * TRADING_FEE) / 10000;
        uint256 netEthAmount = ethAmount - feeAmount;

        // Use constant product formula with virtual reserves
        uint256 totalTokenReserves = curve.virtualTokenReserves + curve.realTokenReserves;
        uint256 totalSolReserves = curve.virtualSolReserves + curve.realSolReserves;

        // Calculate token amount: k = x * y, new_y = k / (x + delta_x)
        uint256 newSolReserves = totalSolReserves + netEthAmount;
        uint256 newTokenReserves = (totalTokenReserves * totalSolReserves) / newSolReserves;
        tokenAmount = totalTokenReserves - newTokenReserves;

        // Calculate new price after trade
        newPrice = calculatePrice(curve.totalSupply + tokenAmount);

        return (tokenAmount, newPrice);
    }

    // Calculate sell amount using constant product formula
    function calculateSellAmount(
        address token,
        uint256 tokenAmount
    ) external view curveExists(token) notGraduated(token) returns (uint256 ethAmount, uint256 newPrice) {
        CurveInfo memory curve = curves[token];

        // Use constant product formula with virtual reserves
        uint256 totalTokenReserves = curve.virtualTokenReserves + curve.realTokenReserves;
        uint256 totalSolReserves = curve.virtualSolReserves + curve.realSolReserves;

        // Calculate ETH amount: k = x * y, new_x = k / (y + delta_y)
        uint256 newTokenReserves = totalTokenReserves + tokenAmount;
        uint256 newSolReserves = (totalTokenReserves * totalSolReserves) / newTokenReserves;
        uint256 grossEthAmount = totalSolReserves - newSolReserves;

        // Apply trading fee
        uint256 feeAmount = (grossEthAmount * TRADING_FEE) / 10000;
        ethAmount = grossEthAmount - feeAmount;

        // Calculate new price after trade
        newPrice = calculatePrice(curve.totalSupply - tokenAmount);

        return (ethAmount, newPrice);
    }

    // Execute buy order
    function executeBuy(
        address token,
        address buyer,
        uint256 ethAmount
    ) external payable onlyTradingEngine nonReentrant curveExists(token) notGraduated(token) antiBot(token, ethAmount) returns (uint256 tokenAmount) {
        require(msg.value == ethAmount, "ETH mismatch");
        require(ethAmount >= 0.001 ether, "Minimum 0.001 ETH");
        
        CurveInfo storage curve = curves[token];
        
        // Calculate tokens to mint
        (uint256 calculatedTokens, uint256 newPrice) = this.calculateBuyAmount(token, ethAmount);
        tokenAmount = calculatedTokens;

        // Validate purchase limits
        require(tokenAmount <= curve.totalSupply * MAX_SUPPLY_PER_TX / 100, "Exceeds max per tx");

        // Calculate and handle fees
        uint256 feeAmount = (ethAmount * TRADING_FEE) / 10000;
        uint256 netEthAmount = ethAmount - feeAmount;

        // Update curve state
        curve.realSolReserves += netEthAmount;
        curve.totalSupply += tokenAmount;
        curve.lastPrice = newPrice;
        curve.totalVolume += ethAmount;
        curve.totalTrades++;

        // Transfer tokens to buyer
        IERC20(token).safeTransfer(buyer, tokenAmount);

        // Send fee to treasury
        if (feeTreasury != address(0) && feeAmount > 0) {
            payable(feeTreasury).transfer(feeAmount);
        }

        // Check graduation
        uint256 marketCap = _calculateMarketCap(token);
        if (marketCap >= GRADUATION_THRESHOLD) {
            _triggerGraduation(token);
        }

        emit TokensPurchased(token, buyer, ethAmount, tokenAmount, newPrice);
        emit PriceUpdated(token, newPrice, marketCap);

        return tokenAmount;
    }

    // Execute sell order
    function executeSell(
        address token,
        address seller,
        uint256 tokenAmount
    ) external onlyTradingEngine nonReentrant curveExists(token) notGraduated(token) returns (uint256 ethAmount) {
        CurveInfo storage curve = curves[token];
        
        // Calculate ETH to return
        (uint256 calculatedEth, uint256 newPrice) = this.calculateSellAmount(token, tokenAmount);
        ethAmount = calculatedEth;

        require(ethAmount <= curve.realSolReserves, "Insufficient liquidity");

        // Update curve state
        curve.realSolReserves -= (ethAmount + (ethAmount * TRADING_FEE) / (10000 - TRADING_FEE));
        curve.totalSupply -= tokenAmount;
        curve.lastPrice = newPrice;
        curve.totalVolume += ethAmount;
        curve.totalTrades++;

        // Transfer ETH to seller
        payable(seller).transfer(ethAmount);

        // Calculate and send fees
        uint256 feeAmount = (ethAmount * TRADING_FEE) / (10000 - TRADING_FEE);
        if (feeTreasury != address(0) && feeAmount > 0) {
            payable(feeTreasury).transfer(feeAmount);
        }

        uint256 marketCap = _calculateMarketCap(token);
        emit TokensSold(token, seller, tokenAmount, ethAmount, newPrice);
        emit PriceUpdated(token, newPrice, marketCap);

        return ethAmount;
    }

    // Calculate current market cap
    function _calculateMarketCap(address token) internal view returns (uint256) {
        CurveInfo memory curve = curves[token];
        return (curve.totalSupply * curve.lastPrice) / 1e18;
    }

    // Trigger graduation to DEX
    function _triggerGraduation(address token) internal {
        CurveInfo storage curve = curves[token];
        require(!curve.isGraduated, "Already graduated");
        
        curve.isGraduated = true;

        // Transfer graduation tokens to graduation manager
        if (graduationManager != address(0)) {
            IERC20(token).safeTransfer(address(graduationManager), GRADUATION_TOKENS);
            
            // Send ETH for liquidity (minus creator reward)
            uint256 liquidityEth = curve.realSolReserves;
            if (liquidityEth > CREATOR_REWARD) {
                liquidityEth -= CREATOR_REWARD;
                payable(address(graduationManager)).transfer(liquidityEth);
                
                // Send creator reward
                if (CREATOR_REWARD > 0) {
                    payable(curve.creator).transfer(CREATOR_REWARD);
                }
            }
        }

        uint256 marketCap = _calculateMarketCap(token);
        emit GraduationTriggered(token, marketCap, block.timestamp);
    }

    // View functions
    function getCurveInfo(address token) external view returns (CurveInfo memory) {
        return curves[token];
    }

    function getMarketCap(address token) external view returns (uint256) {
        return _calculateMarketCap(token);
    }

    function getGraduationProgress(address token) external view returns (uint256 progress, bool isEligible) {
        uint256 marketCap = _calculateMarketCap(token);
        progress = (marketCap * 100) / GRADUATION_THRESHOLD;
        isEligible = marketCap >= GRADUATION_THRESHOLD && !curves[token].isGraduated;
    }

    function getPriceForSupply(uint256 supply) external pure returns (uint256) {
        return calculatePrice(supply);
    }

    function getCurrentPrice(address token) external view returns (uint256) {
        return curves[token].lastPrice;
    }

    // Admin functions
    function setTradingEngine(address _tradingEngine) external onlyOwner {
        tradingEngine = _tradingEngine;
    }

    function setGraduationManager(address _graduationManager) external onlyOwner {
        graduationManager = IGraduationManager(_graduationManager);
    }

    function setFeeTreasury(address _feeTreasury) external onlyOwner {
        feeTreasury = _feeTreasury;
    }

    function emergencyWithdraw(address token) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(address(this).balance);
        } else {
            IERC20(token).safeTransfer(owner(), IERC20(token).balanceOf(address(this)));
        }
    }

    receive() external payable {}
}
