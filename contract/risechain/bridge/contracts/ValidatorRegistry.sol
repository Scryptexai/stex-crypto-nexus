
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ValidatorRegistry - Validator Voting Manager
 * @dev Manages validator voting for bridge transactions
 */
contract ValidatorRegistry is Ownable, ReentrancyGuard {
    
    struct ValidationData {
        uint256 votes;
        uint256 requiredVotes;
        bool validated;
        mapping(address => bool) hasVoted;
    }
    
    mapping(address => bool) public validators;
    mapping(bytes32 => ValidationData) public validations;
    
    uint256 public validatorCount;
    uint256 public validationThreshold = 60; // 60%
    
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event ValidatorVoted(bytes32 indexed txId, address indexed validator, uint256 currentVotes, uint256 requiredVotes);
    event TransactionValidated(bytes32 indexed txId, uint256 totalVotes);

    modifier onlyValidator() {
        require(validators[msg.sender], "Not a validator");
        _;
    }

    modifier validTransaction(bytes32 txId) {
        require(!validations[txId].validated, "Already validated");
        _;
    }

    constructor(address[] memory _initialValidators) {
        require(_initialValidators.length >= 3, "Minimum 3 validators required");
        
        for (uint256 i = 0; i < _initialValidators.length; i++) {
            require(_initialValidators[i] != address(0), "Invalid validator");
            validators[_initialValidators[i]] = true;
            emit ValidatorAdded(_initialValidators[i]);
        }
        
        validatorCount = _initialValidators.length;
    }

    /**
     * @dev Add a new validator
     */
    function addValidator(address validator) external onlyOwner {
        require(validator != address(0), "Invalid address");
        require(!validators[validator], "Already a validator");
        
        validators[validator] = true;
        validatorCount++;
        
        emit ValidatorAdded(validator);
    }

    /**
     * @dev Remove a validator
     */
    function removeValidator(address validator) external onlyOwner {
        require(validators[validator], "Not a validator");
        require(validatorCount > 3, "Minimum 3 validators required");
        
        validators[validator] = false;
        validatorCount--;
        
        emit ValidatorRemoved(validator);
    }

    /**
     * @dev Validate a transaction
     */
    function validateTransaction(bytes32 txId) external onlyValidator nonReentrant validTransaction(txId) {
        ValidationData storage validation = validations[txId];
        
        require(!validation.hasVoted[msg.sender], "Already voted");
        
        // Initialize validation if first vote
        if (validation.requiredVotes == 0) {
            validation.requiredVotes = requiredVotes();
        }
        
        validation.hasVoted[msg.sender] = true;
        validation.votes++;
        
        emit ValidatorVoted(txId, msg.sender, validation.votes, validation.requiredVotes);
        
        // Check if validation threshold is met
        if (validation.votes >= validation.requiredVotes) {
            validation.validated = true;
            emit TransactionValidated(txId, validation.votes);
        }
    }

    /**
     * @dev Get required votes for validation
     */
    function requiredVotes() public view returns (uint256) {
        uint256 required = (validatorCount * validationThreshold) / 100;
        return required == 0 ? 1 : required;
    }

    /**
     * @dev Check if transaction is validated
     */
    function isValidated(bytes32 txId) external view returns (bool) {
        return validations[txId].validated;
    }

    /**
     * @dev Get validation status
     */
    function getValidationStatus(bytes32 txId) external view returns (
        uint256 votes,
        uint256 required,
        bool validated
    ) {
        ValidationData storage validation = validations[txId];
        return (
            validation.votes,
            validation.requiredVotes == 0 ? requiredVotes() : validation.requiredVotes,
            validation.validated
        );
    }

    /**
     * @dev Check if validator has voted
     */
    function hasVoted(bytes32 txId, address validator) external view returns (bool) {
        return validations[txId].hasVoted[validator];
    }

    /**
     * @dev Update validation threshold
     */
    function updateValidationThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0 && newThreshold <= 100, "Invalid threshold");
        validationThreshold = newThreshold;
    }

    /**
     * @dev Get all validator status
     */
    function getValidatorInfo() external view returns (
        uint256 totalValidators,
        uint256 threshold,
        uint256 required
    ) {
        return (validatorCount, validationThreshold, requiredVotes());
    }
}
