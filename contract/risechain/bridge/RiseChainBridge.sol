
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IOracle {
    function latest_answer() external view returns (uint256);
}

/**
 * @title ScryptexBridge - Production-Grade Cross-Chain Bridge
 * @dev Complete bridge implementation with validator consensus, point system, and security features
 */
contract ScryptexBridge is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // Core Constants
    uint256 public constant MAX_FEE_PERCENTAGE = 1000; // 10%
    uint256 public constant POINTS_PER_BRIDGE = 20; // 20 STEX points per bridge
    uint256 public constant VALIDATOR_THRESHOLD = 60; // 60% consensus required
    
    // RiseChain Predeploys
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    address public constant L2_BRIDGE = 0x4200000000000000000000000000000000000010;
    address public constant GAS_ORACLE = 0x420000000000000000000000000000000000000F;
    
    // RiseChain Tokens
    address public constant RISE_USDC = 0x40918ba7f132e0acba2ce4de4c4baf9bd2d7d849;
    address public constant RISE_USDT = 0xf32d39ff9f6aa7a7a64d7a4f00a54826ef791a55;
    address public constant RISE_DAI = 0xd6e1afe5ca8d00a2efc01b89997abe2de47fdfaf;
    
    // RiseChain Oracles
    address public constant USDC_ORACLE = 0x50524C5bDa18aE25C600a8b81449B9CeAeB50471;
    address public constant USDT_ORACLE = 0x9190159b1bb78482Dca6EBaDf03ab744de0c0197;
    address public constant DAI_ORACLE = 0xadDAEd879D549E5DBfaf3e35470C20D8C50fDed0;

    enum Status { PENDING, VALIDATED, EXECUTED, FAILED }

    struct BridgeTransaction {
        bytes32 id;
        address user;
        address token;
        uint256 amount;
        address destinationAddress;
        uint256 destinationChainId;
        Status status;
        uint256 votes;
        uint256 requiredVotes;
        uint256 timestamp;
        uint256 feeAmount;
        bool refunded;
    }

    // State Variables
    mapping(bytes32 => BridgeTransaction) public bridgeTransactions;
    mapping(address => bool) public validators;
    mapping(bytes32 => mapping(address => bool)) public hasVoted;
    mapping(address => uint256) public userPoints;
    mapping(address => uint256) public nonces;
    mapping(address => uint256) public dailyBridgeCount;
    mapping(address => uint256) public lastBridgeDay;
    mapping(uint256 => address) public trustedRemoteLookup;
    
    uint256 public feePercentage = 30; // 0.3%
    uint256 public validatorCount;
    uint256 public dailyBridgeLimit = 10;
    bool public emergencyStop = false;
    
    // Events
    event BridgeInitiated(bytes32 indexed transactionId, address indexed user, address token, uint256 amount, address destinationAddress, uint256 destinationChainId);
    event BridgeValidated(bytes32 indexed transactionId, address indexed validator, uint256 currentVotes, uint256 requiredVotes);
    event BridgeExecuted(bytes32 indexed transactionId, address indexed user, uint256 amount, address token);
    event BridgeFailed(bytes32 indexed transactionId, string reason);
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event PointsAwarded(address indexed user, uint256 points);
    event FeesWithdrawn(address indexed token, uint256 amount);
    event EmergencyStopToggled(bool stopped);

    // Modifiers
    modifier onlyValidator() {
        require(validators[msg.sender], "Not a validator");
        _;
    }

    modifier notEmergencyStopped() {
        require(!emergencyStop, "Emergency stop activated");
        _;
    }

    modifier validAddress(address _addr) {
        require(_addr != address(0), "Invalid address");
        _;
    }

    constructor(address[] memory _validators) {
        require(_validators.length >= 3, "Minimum 3 validators required");
        
        for (uint256 i = 0; i < _validators.length; i++) {
            require(_validators[i] != address(0), "Invalid validator address");
            validators[_validators[i]] = true;
            emit ValidatorAdded(_validators[i]);
        }
        
        validatorCount = _validators.length;
    }

    /**
     * @dev Bridge ETH to another chain
     */
    function bridgeETH(
        address _destinationAddress,
        uint256 _destinationChainId
    ) external payable nonReentrant whenNotPaused notEmergencyStopped validAddress(_destinationAddress) {
        require(msg.value > 0, "Amount must be greater than 0");
        require(trustedRemoteLookup[_destinationChainId] != address(0), "Unsupported destination chain");
        
        _checkDailyLimit(msg.sender);
        
        uint256 feeAmount = (msg.value * feePercentage) / 10000;
        uint256 bridgeAmount = msg.value - feeAmount;
        
        bytes32 transactionId = _generateTransactionId(msg.sender, address(0), bridgeAmount, _destinationAddress, _destinationChainId);
        
        uint256 requiredVotes = (validatorCount * VALIDATOR_THRESHOLD) / 100;
        if (requiredVotes == 0) requiredVotes = 1;
        
        bridgeTransactions[transactionId] = BridgeTransaction({
            id: transactionId,
            user: msg.sender,
            token: address(0), // ETH
            amount: bridgeAmount,
            destinationAddress: _destinationAddress,
            destinationChainId: _destinationChainId,
            status: Status.PENDING,
            votes: 0,
            requiredVotes: requiredVotes,
            timestamp: block.timestamp,
            feeAmount: feeAmount,
            refunded: false
        });
        
        _updateDailyBridgeCount(msg.sender);
        
        emit BridgeInitiated(transactionId, msg.sender, address(0), bridgeAmount, _destinationAddress, _destinationChainId);
    }

    /**
     * @dev Bridge ERC20 tokens to another chain
     */
    function bridgeToken(
        address _token,
        uint256 _amount,
        address _destinationAddress,
        uint256 _destinationChainId
    ) external nonReentrant whenNotPaused notEmergencyStopped validAddress(_token) validAddress(_destinationAddress) {
        require(_amount > 0, "Amount must be greater than 0");
        require(trustedRemoteLookup[_destinationChainId] != address(0), "Unsupported destination chain");
        
        _checkDailyLimit(msg.sender);
        
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        uint256 feeAmount = (_amount * feePercentage) / 10000;
        uint256 bridgeAmount = _amount - feeAmount;
        
        bytes32 transactionId = _generateTransactionId(msg.sender, _token, bridgeAmount, _destinationAddress, _destinationChainId);
        
        uint256 requiredVotes = (validatorCount * VALIDATOR_THRESHOLD) / 100;
        if (requiredVotes == 0) requiredVotes = 1;
        
        bridgeTransactions[transactionId] = BridgeTransaction({
            id: transactionId,
            user: msg.sender,
            token: _token,
            amount: bridgeAmount,
            destinationAddress: _destinationAddress,
            destinationChainId: _destinationChainId,
            status: Status.PENDING,
            votes: 0,
            requiredVotes: requiredVotes,
            timestamp: block.timestamp,
            feeAmount: feeAmount,
            refunded: false
        });
        
        _updateDailyBridgeCount(msg.sender);
        
        emit BridgeInitiated(transactionId, msg.sender, _token, bridgeAmount, _destinationAddress, _destinationChainId);
    }

    /**
     * @dev Validator votes on a bridge transaction
     */
    function validateTransaction(bytes32 _transactionId) external onlyValidator nonReentrant {
        BridgeTransaction storage transaction = bridgeTransactions[_transactionId];
        require(transaction.status == Status.PENDING, "Transaction not pending");
        require(!hasVoted[_transactionId][msg.sender], "Already voted");
        require(block.timestamp <= transaction.timestamp + 1 hours, "Validation period expired");
        
        hasVoted[_transactionId][msg.sender] = true;
        transaction.votes++;
        
        emit BridgeValidated(_transactionId, msg.sender, transaction.votes, transaction.requiredVotes);
        
        if (transaction.votes >= transaction.requiredVotes) {
            transaction.status = Status.VALIDATED;
        }
    }

    /**
     * @dev Execute a validated bridge transaction
     */
    function executeBridge(bytes32 _transactionId) external nonReentrant whenNotPaused notEmergencyStopped {
        BridgeTransaction storage transaction = bridgeTransactions[_transactionId];
        require(transaction.status == Status.VALIDATED, "Transaction not validated");
        require(block.timestamp <= transaction.timestamp + 2 hours, "Execution period expired");
        
        transaction.status = Status.EXECUTED;
        
        // Transfer tokens to destination
        if (transaction.token == address(0)) {
            // ETH transfer
            payable(transaction.destinationAddress).transfer(transaction.amount);
        } else {
            // ERC20 transfer
            IERC20(transaction.token).safeTransfer(transaction.destinationAddress, transaction.amount);
        }
        
        // Award STEX points
        userPoints[transaction.user] += POINTS_PER_BRIDGE;
        emit PointsAwarded(transaction.user, POINTS_PER_BRIDGE);
        
        emit BridgeExecuted(_transactionId, transaction.user, transaction.amount, transaction.token);
    }

    /**
     * @dev Refund a failed or expired transaction
     */
    function refundTransaction(bytes32 _transactionId) external nonReentrant {
        BridgeTransaction storage transaction = bridgeTransactions[_transactionId];
        require(transaction.user == msg.sender || owner() == msg.sender, "Not authorized");
        require(!transaction.refunded, "Already refunded");
        require(
            (transaction.status == Status.PENDING && block.timestamp > transaction.timestamp + 1 hours) ||
            transaction.status == Status.FAILED,
            "Refund not available"
        );
        
        transaction.refunded = true;
        transaction.status = Status.FAILED;
        
        // Refund original amount (including fees)
        uint256 refundAmount = transaction.amount + transaction.feeAmount;
        
        if (transaction.token == address(0)) {
            payable(transaction.user).transfer(refundAmount);
        } else {
            IERC20(transaction.token).safeTransfer(transaction.user, refundAmount);
        }
        
        emit BridgeFailed(_transactionId, "Refunded");
    }

    /**
     * @dev Add a new validator
     */
    function addValidator(address _validator) external onlyOwner validAddress(_validator) {
        require(!validators[_validator], "Already a validator");
        
        validators[_validator] = true;
        validatorCount++;
        
        emit ValidatorAdded(_validator);
    }

    /**
     * @dev Remove a validator
     */
    function removeValidator(address _validator) external onlyOwner {
        require(validators[_validator], "Not a validator");
        require(validatorCount > 3, "Minimum 3 validators required");
        
        validators[_validator] = false;
        validatorCount--;
        
        emit ValidatorRemoved(_validator);
    }

    /**
     * @dev Set trusted remote contract for a chain
     */
    function setTrustedRemote(uint256 _chainId, address _remoteContract) external onlyOwner validAddress(_remoteContract) {
        trustedRemoteLookup[_chainId] = _remoteContract;
    }

    /**
     * @dev Update fee percentage
     */
    function updateFee(uint256 _newFeePercentage) external onlyOwner {
        require(_newFeePercentage <= MAX_FEE_PERCENTAGE, "Fee too high");
        feePercentage = _newFeePercentage;
    }

    /**
     * @dev Update daily bridge limit
     */
    function updateDailyBridgeLimit(uint256 _newLimit) external onlyOwner {
        dailyBridgeLimit = _newLimit;
    }

    /**
     * @dev Emergency stop toggle
     */
    function toggleEmergencyStop() external onlyOwner {
        emergencyStop = !emergencyStop;
        emit EmergencyStopToggled(emergencyStop);
    }

    /**
     * @dev Withdraw ETH fees
     */
    function withdrawETHFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        
        payable(owner()).transfer(balance);
        emit FeesWithdrawn(address(0), balance);
    }

    /**
     * @dev Withdraw token fees
     */
    function withdrawTokenFees(address _token) external onlyOwner validAddress(_token) {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        
        IERC20(_token).safeTransfer(owner(), balance);
        emit FeesWithdrawn(_token, balance);
    }

    /**
     * @dev Get user STEX points
     */
    function getUserPoints(address _user) external view returns (uint256) {
        return userPoints[_user];
    }

    /**
     * @dev Get bridge transaction details
     */
    function getBridgeTransaction(bytes32 _transactionId) external view returns (BridgeTransaction memory) {
        return bridgeTransactions[_transactionId];
    }

    /**
     * @dev Get token value in ETH using oracle
     */
    function _getTokenValueInETH(address _token, uint256 _amount) internal view returns (uint256) {
        if (_token == RISE_USDC) {
            return _getOraclePrice(USDC_ORACLE, _amount, 6);
        } else if (_token == RISE_USDT) {
            return _getOraclePrice(USDT_ORACLE, _amount, 6);
        } else if (_token == RISE_DAI) {
            return _getOraclePrice(DAI_ORACLE, _amount, 18);
        }
        return _amount; // Fallback to 1:1 ratio
    }

    /**
     * @dev Get price from oracle with fallback
     */
    function _getOraclePrice(address _oracle, uint256 _amount, uint8 _tokenDecimals) internal view returns (uint256) {
        try IOracle(_oracle).latest_answer() returns (uint256 price) {
            return (_amount * price) / (10 ** _tokenDecimals);
        } catch {
            return _amount; // Fallback to 1:1 ratio
        }
    }

    /**
     * @dev Generate unique transaction ID
     */
    function _generateTransactionId(
        address _user,
        address _token,
        uint256 _amount,
        address _destinationAddress,
        uint256 _destinationChainId
    ) internal returns (bytes32) {
        return keccak256(abi.encodePacked(
            _user,
            _token,
            _amount,
            _destinationAddress,
            _destinationChainId,
            nonces[_user]++,
            block.timestamp,
            block.difficulty
        ));
    }

    /**
     * @dev Check daily bridge limit
     */
    function _checkDailyLimit(address _user) internal view {
        uint256 currentDay = block.timestamp / 1 days;
        if (lastBridgeDay[_user] == currentDay) {
            require(dailyBridgeCount[_user] < dailyBridgeLimit, "Daily bridge limit exceeded");
        }
    }

    /**
     * @dev Update daily bridge count
     */
    function _updateDailyBridgeCount(address _user) internal {
        uint256 currentDay = block.timestamp / 1 days;
        if (lastBridgeDay[_user] != currentDay) {
            dailyBridgeCount[_user] = 1;
            lastBridgeDay[_user] = currentDay;
        } else {
            dailyBridgeCount[_user]++;
        }
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
     * @dev Receive function for ETH deposits
     */
    receive() external payable {}
}
