
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IPointsModule {
    function addPoints(address user, uint256 points) external;
}

/**
 * @title BridgeReceiver - Destination Chain Bridge Executor
 * @dev Handles incoming bridge transactions
 */
contract BridgeReceiver is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    struct BridgeTx {
        bytes32 id;
        address user;
        address token;
        uint256 amount;
        address to;
        bool executed;
        uint256 timestamp;
    }

    mapping(bytes32 => BridgeTx) public bridgeTransactions;
    mapping(bytes32 => bool) public executedTransactions;
    mapping(uint256 => mapping(address => bool)) public trustedSenders;
    
    IPointsModule public pointsModule;
    
    uint256 public constant BRIDGE_POINTS = 20;
    
    event BridgeExecuted(
        bytes32 indexed txId,
        address indexed user,
        address token,
        uint256 amount,
        address to
    );

    modifier onlyTrustedSender(uint256 srcChainId, address sender) {
        require(trustedSenders[srcChainId][sender], "Untrusted sender");
        _;
    }

    constructor(address _pointsModule) {
        pointsModule = IPointsModule(_pointsModule);
    }

    /**
     * @dev Receive message from source chain
     */
    function receiveMessage(
        uint256 srcChainId,
        address sender,
        bytes calldata payload
    ) external nonReentrant whenNotPaused onlyTrustedSender(srcChainId, sender) {
        // Decode payload
        (bytes32 txId, address user, address token, uint256 amount, address to) = 
            abi.decode(payload, (bytes32, address, address, uint256, address));
        
        // Validate transaction hasn't been executed
        require(!executedTransactions[txId], "Transaction already executed");
        
        // Store transaction
        bridgeTransactions[txId] = BridgeTx({
            id: txId,
            user: user,
            token: token,
            amount: amount,
            to: to,
            executed: true,
            timestamp: block.timestamp
        });
        
        // Mark as executed
        executedTransactions[txId] = true;
        
        // Transfer tokens/ETH to user
        if (token == address(0)) {
            // ETH transfer
            require(address(this).balance >= amount, "Insufficient ETH balance");
            payable(to).transfer(amount);
        } else {
            // ERC20 transfer
            require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient token balance");
            IERC20(token).safeTransfer(to, amount);
        }
        
        // Award STEX points
        pointsModule.addPoints(user, BRIDGE_POINTS);
        
        emit BridgeExecuted(txId, user, token, amount, to);
    }

    /**
     * @dev Add trusted sender
     */
    function addTrustedSender(uint256 chainId, address sender) external onlyOwner {
        require(sender != address(0), "Invalid sender");
        trustedSenders[chainId][sender] = true;
    }

    /**
     * @dev Remove trusted sender
     */
    function removeTrustedSender(uint256 chainId, address sender) external onlyOwner {
        trustedSenders[chainId][sender] = false;
    }

    /**
     * @dev Update points module
     */
    function updatePointsModule(address newPointsModule) external onlyOwner {
        require(newPointsModule != address(0), "Invalid address");
        pointsModule = IPointsModule(newPointsModule);
    }

    /**
     * @dev Get transaction details
     */
    function getBridgeTransaction(bytes32 txId) external view returns (BridgeTx memory) {
        return bridgeTransactions[txId];
    }

    /**
     * @dev Check if transaction is executed
     */
    function isExecuted(bytes32 txId) external view returns (bool) {
        return executedTransactions[txId];
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

    /**
     * @dev Fund contract with tokens/ETH for bridging
     */
    function fundContract(address token, uint256 amount) external payable onlyOwner {
        if (token == address(0)) {
            require(msg.value > 0, "No ETH sent");
        } else {
            require(amount > 0, "Amount must be greater than 0");
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }
    }

    receive() external payable {}
}
