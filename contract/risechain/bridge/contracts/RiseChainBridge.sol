
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// RiseChain OP Stack Predeploys
interface IL2CrossDomainMessenger {
    function sendMessage(address _target, bytes calldata _message, uint32 _gasLimit) external;
}

interface IL2ToL1MessagePasser {
    function initiateWithdrawal(address _target, uint256 _gasLimit, bytes calldata _data) external payable;
}

interface IL1Block {
    function number() external view returns (uint64);
    function timestamp() external view returns (uint64);
    function basefee() external view returns (uint256);
    function hash() external view returns (bytes32);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address owner) external view returns (uint256);
}

contract RiseChainBridge is ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;

    // RiseChain OP Stack Predeploy Addresses
    address public constant WETH_PREDEPLOY = 0x4200000000000000000000000000000000000006;
    address public constant L2_CROSS_DOMAIN_MESSENGER = 0x4200000000000000000000000000000000000007;
    address public constant L2_TO_L1_MESSAGE_PASSER = 0x4200000000000000000000000000000000000016;
    address public constant L1_BLOCK_PREDEPLOY = 0x4200000000000000000000000000000000000015;

    // Roles
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    // Bridge Configuration
    uint256 public constant CHALLENGE_PERIOD = 7 days;
    uint256 public constant VALIDATOR_THRESHOLD = 5; // 5/7 validators required
    uint256 public constant WITHDRAWAL_DELAY = 1 hours;
    uint256 public constant MAX_BRIDGE_AMOUNT = 1000 ether;
    uint256 public constant MIN_BRIDGE_AMOUNT = 0.01 ether;

    struct BridgeTransaction {
        address sender;
        address recipient;
        address token;
        uint256 amount;
        uint256 targetChainId;
        uint256 timestamp;
        uint256 nonce;
        BridgeStatus status;
        uint256 validatorApprovals;
        mapping(address => bool) hasValidated;
        bytes32 merkleRoot;
        bytes32[] merkleProof;
    }

    enum BridgeStatus {
        PENDING,
        VALIDATED,
        EXECUTED,
        CHALLENGED,
        CANCELLED
    }

    // Storage
    mapping(bytes32 => BridgeTransaction) public bridgeTransactions;
    mapping(address => uint256) public validatorStakes;
    mapping(address => bool) public validatorActive;
    mapping(uint256 => address) public trustedRemotes;
    mapping(address => uint256) public dailyBridgeVolume;
    mapping(address => uint256) public lastBridgeTime;
    
    address[] public validators;
    uint256 public totalValidatorStake;
    uint256 public bridgeNonce;
    uint256 public emergencyPauseTime;

    // Point System Integration
    address public pointsModule;
    uint256 public constant BRIDGE_POINTS = 20;

    // Events
    event BridgeInitiated(
        bytes32 indexed txId,
        address indexed sender,
        address indexed recipient,
        address token,
        uint256 amount,
        uint256 targetChainId,
        uint256 nonce
    );
    event BridgeValidated(bytes32 indexed txId, address indexed validator);
    event BridgeExecuted(bytes32 indexed txId, address indexed recipient, uint256 amount);
    event ValidatorAdded(address indexed validator, uint256 stake);
    event ValidatorRemoved(address indexed validator);
    event EmergencyPause(uint256 timestamp);

    modifier onlyActiveValidator() {
        require(hasRole(VALIDATOR_ROLE, msg.sender) && validatorActive[msg.sender], "Not active validator");
        _;
    }

    modifier validBridgeAmount(uint256 amount) {
        require(amount >= MIN_BRIDGE_AMOUNT && amount <= MAX_BRIDGE_AMOUNT, "Invalid bridge amount");
        _;
    }

    modifier rateLimited() {
        require(block.timestamp >= lastBridgeTime[msg.sender] + 60, "Rate limited");
        lastBridgeTime[msg.sender] = block.timestamp;
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
    }

    // Core Bridge Functions
    function bridgeETH(
        uint256 targetChainId,
        address recipient
    ) external payable nonReentrant whenNotPaused validBridgeAmount(msg.value) rateLimited {
        require(recipient != address(0), "Invalid recipient");
        require(trustedRemotes[targetChainId] != address(0), "Unsupported chain");

        bytes32 txId = _generateTxId(msg.sender, recipient, address(0), msg.value, targetChainId);
        
        BridgeTransaction storage bridgeTx = bridgeTransactions[txId];
        bridgeTx.sender = msg.sender;
        bridgeTx.recipient = recipient;
        bridgeTx.token = address(0); // ETH
        bridgeTx.amount = msg.value;
        bridgeTx.targetChainId = targetChainId;
        bridgeTx.timestamp = block.timestamp;
        bridgeTx.nonce = bridgeNonce++;
        bridgeTx.status = BridgeStatus.PENDING;

        // Convert ETH to WETH for standardized handling
        IWETH(WETH_PREDEPLOY).deposit{value: msg.value}();

        emit BridgeInitiated(txId, msg.sender, recipient, address(0), msg.value, targetChainId, bridgeTx.nonce);

        // Send cross-domain message
        _sendCrossDomainMessage(targetChainId, txId, bridgeTx);
    }

    function bridgeToken(
        address token,
        uint256 amount,
        uint256 targetChainId,
        address recipient
    ) external nonReentrant whenNotPaused validBridgeAmount(amount) rateLimited {
        require(token != address(0) && recipient != address(0), "Invalid parameters");
        require(trustedRemotes[targetChainId] != address(0), "Unsupported chain");
        require(IERC20(token).balanceOf(msg.sender) >= amount, "Insufficient balance");

        bytes32 txId = _generateTxId(msg.sender, recipient, token, amount, targetChainId);
        
        BridgeTransaction storage bridgeTx = bridgeTransactions[txId];
        bridgeTx.sender = msg.sender;
        bridgeTx.recipient = recipient;
        bridgeTx.token = token;
        bridgeTx.amount = amount;
        bridgeTx.targetChainId = targetChainId;
        bridgeTx.timestamp = block.timestamp;
        bridgeTx.nonce = bridgeNonce++;
        bridgeTx.status = BridgeStatus.PENDING;

        // Transfer tokens to bridge
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit BridgeInitiated(txId, msg.sender, recipient, token, amount, targetChainId, bridgeTx.nonce);

        // Send cross-domain message
        _sendCrossDomainMessage(targetChainId, txId, bridgeTx);
    }

    function validateBridgeTransaction(bytes32 txId) external onlyActiveValidator {
        BridgeTransaction storage bridgeTx = bridgeTransactions[txId];
        require(bridgeTx.status == BridgeStatus.PENDING, "Invalid status");
        require(!bridgeTx.hasValidated[msg.sender], "Already validated");

        bridgeTx.hasValidated[msg.sender] = true;
        bridgeTx.validatorApprovals++;

        emit BridgeValidated(txId, msg.sender);

        // Check if threshold reached
        if (bridgeTx.validatorApprovals >= VALIDATOR_THRESHOLD) {
            bridgeTx.status = BridgeStatus.VALIDATED;
            _executeBridgeTransaction(txId);
        }
    }

    function _executeBridgeTransaction(bytes32 txId) internal {
        BridgeTransaction storage bridgeTx = bridgeTransactions[txId];
        require(bridgeTx.status == BridgeStatus.VALIDATED, "Not validated");

        bridgeTx.status = BridgeStatus.EXECUTED;

        if (bridgeTx.token == address(0)) {
            // ETH transfer
            IWETH(WETH_PREDEPLOY).withdraw(bridgeTx.amount);
            payable(bridgeTx.recipient).transfer(bridgeTx.amount);
        } else {
            // Token transfer
            IERC20(bridgeTx.token).safeTransfer(bridgeTx.recipient, bridgeTx.amount);
        }

        // Award points
        if (pointsModule != address(0)) {
            _awardPoints(bridgeTx.recipient, BRIDGE_POINTS);
        }

        emit BridgeExecuted(txId, bridgeTx.recipient, bridgeTx.amount);
    }

    function _sendCrossDomainMessage(
        uint256 targetChainId,
        bytes32 txId,
        BridgeTransaction storage bridgeTx
    ) internal {
        bytes memory message = abi.encodeWithSignature(
            "receiveBridgeMessage(bytes32,address,address,address,uint256)",
            txId,
            bridgeTx.sender,
            bridgeTx.recipient,
            bridgeTx.token,
            bridgeTx.amount
        );

        IL2CrossDomainMessenger(L2_CROSS_DOMAIN_MESSENGER).sendMessage(
            trustedRemotes[targetChainId],
            message,
            1000000 // Gas limit
        );
    }

    function _generateTxId(
        address sender,
        address recipient,
        address token,
        uint256 amount,
        uint256 targetChainId
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            sender,
            recipient,
            token,
            amount,
            targetChainId,
            bridgeNonce,
            block.timestamp
        ));
    }

    function _awardPoints(address user, uint256 points) internal {
        (bool success,) = pointsModule.call(
            abi.encodeWithSignature("addPoints(address,uint256)", user, points)
        );
        require(success, "Points award failed");
    }

    // Validator Management
    function addValidator(address validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!hasRole(VALIDATOR_ROLE, validator), "Already validator");
        require(validatorStakes[validator] >= 100 ether, "Insufficient stake");

        _grantRole(VALIDATOR_ROLE, validator);
        validators.push(validator);
        validatorActive[validator] = true;
        totalValidatorStake += validatorStakes[validator];

        emit ValidatorAdded(validator, validatorStakes[validator]);
    }

    function removeValidator(address validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(hasRole(VALIDATOR_ROLE, validator), "Not validator");

        _revokeRole(VALIDATOR_ROLE, validator);
        validatorActive[validator] = false;
        totalValidatorStake -= validatorStakes[validator];

        emit ValidatorRemoved(validator);
    }

    function stakeAsValidator() external payable {
        require(msg.value >= 100 ether, "Minimum 100 ETH stake required");
        validatorStakes[msg.sender] += msg.value;
    }

    // Emergency Functions
    function emergencyPause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
        emergencyPauseTime = block.timestamp;
        emit EmergencyPause(block.timestamp);
    }

    function emergencyUnpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(block.timestamp >= emergencyPauseTime + 24 hours, "24h delay required");
        _unpause();
    }

    // Configuration
    function setTrustedRemote(uint256 chainId, address remoteAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        trustedRemotes[chainId] = remoteAddress;
    }

    function setPointsModule(address _pointsModule) external onlyRole(DEFAULT_ADMIN_ROLE) {
        pointsModule = _pointsModule;
    }

    // View Functions
    function getBridgeTransaction(bytes32 txId) external view returns (
        address sender,
        address recipient,
        address token,
        uint256 amount,
        uint256 targetChainId,
        BridgeStatus status,
        uint256 validatorApprovals
    ) {
        BridgeTransaction storage bridgeTx = bridgeTransactions[txId];
        return (
            bridgeTx.sender,
            bridgeTx.recipient,
            bridgeTx.token,
            bridgeTx.amount,
            bridgeTx.targetChainId,
            bridgeTx.status,
            bridgeTx.validatorApprovals
        );
    }

    function getValidatorCount() external view returns (uint256) {
        return validators.length;
    }

    function getL1BlockInfo() external view returns (uint64 number, uint64 timestamp, uint256 basefee) {
        IL1Block l1Block = IL1Block(L1_BLOCK_PREDEPLOY);
        return (l1Block.number(), l1Block.timestamp(), l1Block.basefee());
    }

    receive() external payable {}
}
