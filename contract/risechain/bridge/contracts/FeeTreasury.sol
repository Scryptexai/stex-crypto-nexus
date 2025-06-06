
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title FeeTreasury - Fee Management
 * @dev Handles fee collection and withdrawal
 */
contract FeeTreasury is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    mapping(address => uint256) public totalFeeCollected;
    mapping(address => bool) public authorizedCollectors;
    
    uint256 public bridgeFee = 30; // 0.3%
    uint256 public constant MAX_FEE = 1000; // 10%
    
    event FeeCollected(address indexed token, uint256 amount, address collector);
    event FeesWithdrawn(address indexed token, uint256 amount, address recipient);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event CollectorAdded(address indexed collector);
    event CollectorRemoved(address indexed collector);

    modifier onlyAuthorizedCollector() {
        require(authorizedCollectors[msg.sender], "Not authorized collector");
        _;
    }

    constructor() {
        authorizedCollectors[msg.sender] = true;
    }

    /**
     * @dev Collect fee (called by bridge contracts)
     */
    function collectFee(address token, uint256 amount) external onlyAuthorizedCollector {
        require(amount > 0, "Amount must be greater than 0");
        
        totalFeeCollected[token] += amount;
        
        emit FeeCollected(token, amount, msg.sender);
    }

    /**
     * @dev Withdraw collected fees
     */
    function withdrawFees(address token, uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(totalFeeCollected[token] >= amount, "Insufficient fee balance");
        
        totalFeeCollected[token] -= amount;
        
        if (token == address(0)) {
            // ETH withdrawal
            require(address(this).balance >= amount, "Insufficient ETH balance");
            payable(owner()).transfer(amount);
        } else {
            // ERC20 withdrawal
            require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient token balance");
            IERC20(token).safeTransfer(owner(), amount);
        }
        
        emit FeesWithdrawn(token, amount, owner());
    }

    /**
     * @dev Withdraw all fees for a token
     */
    function withdrawAllFees(address token) external onlyOwner {
        uint256 amount = totalFeeCollected[token];
        require(amount > 0, "No fees to withdraw");
        
        withdrawFees(token, amount);
    }

    /**
     * @dev Update bridge fee percentage
     */
    function updateBridgeFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE, "Fee exceeds maximum");
        
        uint256 oldFee = bridgeFee;
        bridgeFee = newFee;
        
        emit FeeUpdated(oldFee, newFee);
    }

    /**
     * @dev Add authorized fee collector
     */
    function addCollector(address collector) external onlyOwner {
        require(collector != address(0), "Invalid address");
        require(!authorizedCollectors[collector], "Already authorized");
        
        authorizedCollectors[collector] = true;
        emit CollectorAdded(collector);
    }

    /**
     * @dev Remove authorized fee collector
     */
    function removeCollector(address collector) external onlyOwner {
        require(authorizedCollectors[collector], "Not authorized");
        
        authorizedCollectors[collector] = false;
        emit CollectorRemoved(collector);
    }

    /**
     * @dev Get fee balance for token
     */
    function getFeeBalance(address token) external view returns (uint256) {
        return totalFeeCollected[token];
    }

    /**
     * @dev Get contract balance for token
     */
    function getContractBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        } else {
            return IERC20(token).balanceOf(address(this));
        }
    }

    /**
     * @dev Calculate fee amount
     */
    function calculateFee(uint256 amount) external view returns (uint256) {
        return (amount * bridgeFee) / 10000;
    }

    /**
     * @dev Emergency withdrawal (only owner)
     */
    function emergencyWithdraw(address token) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(address(this).balance);
        } else {
            IERC20(token).safeTransfer(owner(), IERC20(token).balanceOf(address(this)));
        }
    }

    receive() external payable {
        // Accept ETH deposits
    }
}
