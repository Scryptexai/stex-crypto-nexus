
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IGraduationManager {
    function executeGraduation(address token) external;
}

contract BondingCurveIntegrator is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Constants for Pump.Fun formula
    uint256 public constant VIRTUAL_TOKEN_RESERVES = 800_000_000 * 1e18; // 800M tokens
    uint256 public constant VIRTUAL_SOL_RESERVES = 30 * 1e18; // 30 ETH equivalent
    uint256 public constant GRADUATION_THRESHOLD = 69000 * 1e18; // $69k in wei
    uint256 public constant GRADUATION_TOKENS = 206_900_000 * 1e18; // 206.9M tokens to LP
    uint256 public constant CREATOR_REWARD = 5 * 1e17; // 0.5 ETH
    uint256 public constant SERVICE_FEE = 23 * 1e17; // 2.3 ETH
    uint256 public constant MAX_SUPPLY_PER_TX = 2; // 2% of supply per transaction

    struct BondingCurve {
        address token;
        uint256 virtualTokenReserves;
        uint256 virtualSolReserves;
        uint256 realTokenReserves;
        uint256 realSolReserves;
        uint256 totalSupply;
        bool isGraduated;
        uint256 createdAt;
        address creator;
    }

    // Storage
    mapping(address => BondingCurve) public bondingCurves;
    mapping(address => mapping(address => uint256)) public userPurchases24h;
    mapping(address => uint256) public lastPurchaseTime;
    
    IGraduationManager public graduationManager;
    address public tradingEngine;

    // Events
    event BondingCurveInitialized(address indexed token, address indexed creator);
    event TokensPurchased(address indexed token, address indexed buyer, uint256 ethAmount, uint256 tokenAmount);
    event TokensSold(address indexed token, address indexed seller, uint256 tokenAmount, uint256 ethAmount);
    event GraduationTriggered(address indexed token, uint256 marketCap);

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

    constructor(address _graduationManager) {
        graduationManager = IGraduationManager(_graduationManager);
    }

    // SECTION 2.1: Curve Initialization
    function initializeBondingCurve(
        address token,
        uint256 initialSupply,
        uint256 maxSupply,
        address creator
    ) external onlyTradingEngine returns (address curveAddress) {
        require(bondingCurves[token].token == address(0), "Already initialized");
        
        bondingCurves[token] = BondingCurve({
            token: token,
            virtualTokenReserves: VIRTUAL_TOKEN_RESERVES,
            virtualSolReserves: VIRTUAL_SOL_RESERVES,
            realTokenReserves: initialSupply,
            realSolReserves: 0,
            totalSupply: initialSupply,
            isGraduated: false,
            createdAt: block.timestamp,
            creator: creator
        });

        emit BondingCurveInitialized(token, creator);
        return address(this);
    }

    // SECTION 2.2: Pump.Fun Exact Formula Implementation
    function calculatePrice(uint256 supply) public pure returns (uint256) {
        // Exact pump.fun formula: y = 1073000191 - 32190005730/(30+x)
        // Where x is supply in tokens and y is price
        uint256 denominator = 30e18 + supply;
        uint256 numerator = 32190005730 * 1e18;
        require(denominator > 0, "Division by zero");
        return 1073000191 - (numerator / denominator);
    }

    function calculateBuyAmount(
        address token,
        uint256 ethAmount
    ) external view returns (uint256 tokenAmount, uint256 newPrice) {
        BondingCurve memory curve = bondingCurves[token];
        require(curve.token != address(0), "Curve not initialized");
        require(!curve.isGraduated, "Token graduated");

        // Use constant product formula with virtual reserves
        uint256 totalTokenReserves = curve.virtualTokenReserves + curve.realTokenReserves;
        uint256 totalSolReserves = curve.virtualSolReserves + curve.realSolReserves;

        // Calculate token amount using: x * y = k
        uint256 newSolReserves = totalSolReserves + ethAmount;
        uint256 newTokenReserves = (totalTokenReserves * totalSolReserves) / newSolReserves;
        tokenAmount = totalTokenReserves - newTokenReserves;

        // Calculate new price
        newPrice = calculatePrice(curve.totalSupply + tokenAmount);

        return (tokenAmount, newPrice);
    }

    function calculateSellAmount(
        address token,
        uint256 tokenAmount
    ) external view returns (uint256 ethAmount, uint256 newPrice) {
        BondingCurve memory curve = bondingCurves[token];
        require(curve.token != address(0), "Curve not initialized");
        require(!curve.isGraduated, "Token graduated");

        // Use constant product formula with virtual reserves
        uint256 totalTokenReserves = curve.virtualTokenReserves + curve.realTokenReserves;
        uint256 totalSolReserves = curve.virtualSolReserves + curve.realSolReserves;

        // Calculate ETH amount using: x * y = k
        uint256 newTokenReserves = totalTokenReserves + tokenAmount;
        uint256 newSolReserves = (totalTokenReserves * totalSolReserves) / newTokenReserves;
        ethAmount = totalSolReserves - newSolReserves;

        // Calculate new price
        newPrice = calculatePrice(curve.totalSupply - tokenAmount);

        return (ethAmount, newPrice);
    }

    // SECTION 2.3: Anti-Manipulation Protection
    function _validatePurchase(
        address token,
        uint256 ethAmount,
        uint256 tokenAmount
    ) internal view {
        BondingCurve memory curve = bondingCurves[token];
        
        // Check max 2% supply per transaction
        require(tokenAmount <= curve.totalSupply * 2 / 100, "Exceeds 2% supply limit");
        
        // Check reasonable eth amount
        require(ethAmount >= 0.001 ether, "Minimum 0.001 ETH");
        require(ethAmount <= 100 ether, "Maximum 100 ETH");
    }

    function executeBuy(
        address token,
        address buyer,
        uint256 ethAmount
    ) external payable onlyTradingEngine nonReentrant antiBot(token, ethAmount) returns (uint256 tokenAmount) {
        require(msg.value == ethAmount, "ETH mismatch");
        
        BondingCurve storage curve = bondingCurves[token];
        require(curve.token != address(0), "Curve not initialized");
        require(!curve.isGraduated, "Token graduated");

        // Calculate tokens to mint
        (uint256 calculatedTokens, uint256 newPrice) = this.calculateBuyAmount(token, ethAmount);
        tokenAmount = calculatedTokens;

        // Validate purchase
        _validatePurchase(token, ethAmount, tokenAmount);

        // Update curve state
        curve.realSolReserves += ethAmount;
        curve.totalSupply += tokenAmount;

        // Mint tokens to buyer
        IERC20(token).safeTransfer(buyer, tokenAmount);

        // Check graduation
        uint256 marketCap = _calculateMarketCap(token);
        if (marketCap >= GRADUATION_THRESHOLD && !curve.isGraduated) {
            _triggerGraduation(token);
        }

        emit TokensPurchased(token, buyer, ethAmount, tokenAmount);
        return tokenAmount;
    }

    function executeSell(
        address token,
        address seller,
        uint256 tokenAmount
    ) external onlyTradingEngine nonReentrant returns (uint256 ethAmount) {
        BondingCurve storage curve = bondingCurves[token];
        require(curve.token != address(0), "Curve not initialized");
        require(!curve.isGraduated, "Token graduated");

        // Calculate ETH to return
        (uint256 calculatedEth, uint256 newPrice) = this.calculateSellAmount(token, tokenAmount);
        ethAmount = calculatedEth;

        require(ethAmount <= curve.realSolReserves, "Insufficient liquidity");

        // Update curve state
        curve.realSolReserves -= ethAmount;
        curve.totalSupply -= tokenAmount;

        // Burn tokens
        // Note: Tokens are already transferred to this contract in TradingEngine

        // Transfer ETH to seller
        payable(seller).transfer(ethAmount);

        emit TokensSold(token, seller, tokenAmount, ethAmount);
        return ethAmount;
    }

    // SECTION 2.4: Graduation Mechanics
    function _calculateMarketCap(address token) internal view returns (uint256) {
        BondingCurve memory curve = bondingCurves[token];
        uint256 currentPrice = calculatePrice(curve.totalSupply);
        return (curve.totalSupply * currentPrice) / 1e18;
    }

    function _triggerGraduation(address token) internal {
        BondingCurve storage curve = bondingCurves[token];
        curve.isGraduated = true;

        // Transfer graduation tokens and ETH to graduation manager
        IERC20(token).safeTransfer(address(graduationManager), GRADUATION_TOKENS);
        
        // Send ETH for liquidity
        uint256 liquidityEth = curve.realSolReserves - CREATOR_REWARD - SERVICE_FEE;
        payable(address(graduationManager)).transfer(liquidityEth);

        // Send creator reward
        payable(curve.creator).transfer(CREATOR_REWARD);

        // Service fee stays in contract
        
        emit GraduationTriggered(token, _calculateMarketCap(token));
    }

    // View functions
    function getBondingCurve(address token) external view returns (
        uint256 virtualTokenReserves,
        uint256 virtualSolReserves,
        uint256 realTokenReserves,
        uint256 realSolReserves,
        bool isGraduated
    ) {
        BondingCurve memory curve = bondingCurves[token];
        return (
            curve.virtualTokenReserves,
            curve.virtualSolReserves,
            curve.realTokenReserves,
            curve.realSolReserves,
            curve.isGraduated
        );
    }

    function getMarketCap(address token) external view returns (uint256) {
        return _calculateMarketCap(token);
    }

    function getGraduationProgress(address token) external view returns (uint256 progress, bool isEligible) {
        uint256 marketCap = _calculateMarketCap(token);
        progress = (marketCap * 100) / GRADUATION_THRESHOLD;
        isEligible = marketCap >= GRADUATION_THRESHOLD;
    }

    // Admin functions
    function setTradingEngine(address _tradingEngine) external onlyOwner {
        tradingEngine = _tradingEngine;
    }

    function setGraduationManager(address _graduationManager) external onlyOwner {
        graduationManager = IGraduationManager(_graduationManager);
    }

    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}
}
