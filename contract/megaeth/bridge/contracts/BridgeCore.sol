// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IBridgeMessageRouter {
    function sendMessage(uint256 dstChainId, bytes calldata payload) external payable;
}

interface IFeeTreasury {
    function collectFee(address token, uint256 amount) external;
}

/**
 * @title BridgeCore - MegaETH Real-time Bridge Initiator
 * @dev Optimized for MegaETH's 10ms block time and real-time confirmations
 */
contract BridgeCore is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    struct BridgeTx {
        bytes32 id;
        address user;
        address token;
        uint256 amount;
        uint256 dstChainId;
        address to;
        uint256 feeAmount;
        uint256 timestamp;
        uint256 miniBlockNumber; // MegaETH specific
        bool completed;
        bool realtimeConfirmed;
    }

    mapping(bytes32 => BridgeTx) public bridgeTransactions;
    mapping(address => uint256) public nonces;
    mapping(uint256 => bool) public supportedChains;
    
    IBridgeMessageRouter public messageRouter;
    IFeeTreasury public feeTreasury;
    
    uint256 public bridgeFee = 25; // 0.25% (lower fee for MegaETH)
    uint256 public constant MAX_FEE = 500; // 5% (lower max for real-time)
    uint256 public realtimeConfirmationWindow = 100; // 1 second at 10ms blocks
    
    event BridgeInitiated(
        bytes32 indexed txId,
        address indexed user,
        address token,
        uint256 amount,
        uint256 dstChainId,
        address to,
        uint256 fee,
        uint256 miniBlock
    );
    
    event RealtimeConfirmation(bytes32 indexed txId, uint256 miniBlock);

    modifier validAddress(address _addr) {
        require(_addr != address(0), "Invalid address");
        _;
    }

    modifier supportedChain(uint256 _chainId) {
        require(supportedChains[_chainId], "Chain not supported");
        _;
    }

    constructor(address _messageRouter, address _feeTreasury) {
        messageRouter = IBridgeMessageRouter(_messageRouter);
        feeTreasury = IFeeTreasury(_feeTreasury);
    }

    /**
     * @dev Bridge ERC20 tokens with real-time confirmation
     */
    function bridgeToken(
        address token,
        uint256 amount,
        uint256 dstChainId,
        address to
    ) external nonReentrant whenNotPaused validAddress(token) validAddress(to) supportedChain(dstChainId) {
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Calculate fee (lower for MegaETH)
        uint256 feeAmount = (amount * bridgeFee) / 10000;
        uint256 bridgeAmount = amount - feeAmount;
        
        // Generate unique transaction ID with mini-block specificity
        bytes32 txId = _generateTxId(msg.sender, token, bridgeAmount, dstChainId, to);
        
        // Store transaction with MegaETH-specific fields
        bridgeTransactions[txId] = BridgeTx({
            id: txId,
            user: msg.sender,
            token: token,
            amount: bridgeAmount,
            dstChainId: dstChainId,
            to: to,
            feeAmount: feeAmount,
            timestamp: block.timestamp,
            miniBlockNumber: block.number,
            completed: false,
            realtimeConfirmed: true // Immediate confirmation on MegaETH
        });
        
        // Transfer fee to treasury
        if (feeAmount > 0) {
            IERC20(token).safeTransfer(address(feeTreasury), feeAmount);
            feeTreasury.collectFee(token, feeAmount);
        }
        
        // Prepare payload with real-time metadata
        bytes memory payload = abi.encode(txId, msg.sender, token, bridgeAmount, to, block.number);
        
        // Send message to destination chain
        messageRouter.sendMessage(dstChainId, payload);
        
        emit BridgeInitiated(txId, msg.sender, token, bridgeAmount, dstChainId, to, feeAmount, block.number);
        emit RealtimeConfirmation(txId, block.number);
    }

    /**
     * @dev Bridge ETH with real-time confirmation
     */
    function bridgeETH(
        uint256 dstChainId,
        address to
    ) external payable nonReentrant whenNotPaused validAddress(to) supportedChain(dstChainId) {
        require(msg.value > 0, "Amount must be greater than 0");
        
        // Calculate fee
        uint256 feeAmount = (msg.value * bridgeFee) / 10000;
        uint256 bridgeAmount = msg.value - feeAmount;
        
        // Generate unique transaction ID
        bytes32 txId = _generateTxId(msg.sender, address(0), bridgeAmount, dstChainId, to);
        
        // Store transaction
        bridgeTransactions[txId] = BridgeTx({
            id: txId,
            user: msg.sender,
            token: address(0), // ETH
            amount: bridgeAmount,
            dstChainId: dstChainId,
            to: to,
            feeAmount: feeAmount,
            timestamp: block.timestamp,
            miniBlockNumber: block.number,
            completed: false,
            realtimeConfirmed: true
        });
        
        // Transfer fee to treasury
        if (feeAmount > 0) {
            payable(address(feeTreasury)).transfer(feeAmount);
            feeTreasury.collectFee(address(0), feeAmount);
        }
        
        // Prepare payload
        bytes memory payload = abi.encode(txId, msg.sender, address(0), bridgeAmount, to, block.number);
        
        // Send message to destination chain
        messageRouter.sendMessage{value: bridgeAmount}(dstChainId, payload);
        
        emit BridgeInitiated(txId, msg.sender, address(0), bridgeAmount, dstChainId, to, feeAmount, block.number);
        emit RealtimeConfirmation(txId, block.number);
    }

    /**
     * @dev Get real-time transaction status
     */
    function getRealtimeStatus(bytes32 txId) external view returns (
        bool confirmed,
        uint256 confirmationBlock,
        uint256 confirmationsElapsed
    ) {
        BridgeTx memory tx = bridgeTransactions[txId];
        confirmed = tx.realtimeConfirmed;
        confirmationBlock = tx.miniBlockNumber;
        confirmationsElapsed = block.number - tx.miniBlockNumber;
    }

    /**
     * @dev Check if transaction has sufficient real-time confirmations
     */
    function hasRealtimeConfirmations(bytes32 txId) external view returns (bool) {
        BridgeTx memory tx = bridgeTransactions[txId];
        return tx.realtimeConfirmed && (block.number - tx.miniBlockNumber) >= realtimeConfirmationWindow;
    }

    /**
     * @dev Generate unique transaction ID with MegaETH specifics
     */
    function _generateTxId(
        address user,
        address token,
        uint256 amount,
        uint256 dstChainId,
        address to
    ) internal returns (bytes32) {
        return keccak256(abi.encodePacked(
            user,
            token,
            amount,
            dstChainId,
            to,
            nonces[user]++,
            block.timestamp,
            block.number, // Mini-block number for uniqueness
            block.chainid
        ));
    }

    /**
     * @dev Update real-time confirmation window
     */
    function updateRealtimeWindow(uint256 newWindow) external onlyOwner {
        require(newWindow > 0 && newWindow <= 1000, "Invalid window"); // Max 10 seconds
        realtimeConfirmationWindow = newWindow;
    }

    /**
     * @dev Add supported chain
     */
    function addSupportedChain(uint256 chainId) external onlyOwner {
        supportedChains[chainId] = true;
    }

    /**
     * @dev Remove supported chain
     */
    function removeSupportedChain(uint256 chainId) external onlyOwner {
        supportedChains[chainId] = false;
    }

    /**
     * @dev Update bridge fee
     */
    function updateBridgeFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE, "Fee too high");
        bridgeFee = newFee;
    }

    /**
     * @dev Update message router
     */
    function updateMessageRouter(address newRouter) external onlyOwner validAddress(newRouter) {
        messageRouter = IBridgeMessageRouter(newRouter);
    }

    /**
     * @dev Update fee treasury
     */
    function updateFeeTreasury(address newTreasury) external onlyOwner validAddress(newTreasury) {
        feeTreasury = IFeeTreasury(newTreasury);
    }

    /**
     * @dev Get transaction details
     */
    function getBridgeTransaction(bytes32 txId) external view returns (BridgeTx memory) {
        return bridgeTransactions[txId];
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal
     */
    function emergencyWithdraw(address token) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(address(this).balance);
        } else {
            IERC20(token).safeTransfer(owner(), IERC20(token).balanceOf(address(this)));
        }
    }

    receive() external payable {}
}
