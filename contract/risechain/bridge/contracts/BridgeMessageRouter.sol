
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface IBridgeReceiver {
    function receiveMessage(uint256 srcChainId, address sender, bytes calldata payload) external;
}

/**
 * @title BridgeMessageRouter - Cross-chain Messaging Abstraction
 * @dev Handles message routing between chains
 */
contract BridgeMessageRouter is Ownable, Pausable {
    
    mapping(uint256 => address) public remoteBridgeContracts;
    mapping(address => bool) public authorizedSenders;
    
    IBridgeReceiver public bridgeReceiver;
    
    event MessageSent(uint256 indexed dstChainId, bytes payload, address sender);
    event MessageReceived(uint256 indexed srcChainId, bytes payload, address sender);
    event RemoteContractUpdated(uint256 indexed chainId, address remoteContract);

    modifier onlyAuthorized() {
        require(authorizedSenders[msg.sender], "Not authorized sender");
        _;
    }

    constructor(address _bridgeReceiver) {
        bridgeReceiver = IBridgeReceiver(_bridgeReceiver);
        authorizedSenders[msg.sender] = true;
    }

    /**
     * @dev Send message to destination chain
     */
    function sendMessage(
        uint256 dstChainId,
        bytes calldata payload
    ) external payable onlyAuthorized whenNotPaused {
        require(remoteBridgeContracts[dstChainId] != address(0), "Remote contract not set");
        
        // In production, this would integrate with LayerZero, Axelar, CCIP, etc.
        // For now, we emit an event that can be picked up by relayers
        emit MessageSent(dstChainId, payload, msg.sender);
        
        // TODO: Integrate with actual cross-chain messaging SDK
        // Examples:
        // LayerZero: _lzSend(dstChainId, payload, refundAddress, zroPaymentAddress, adapterParams, nativeFee)
        // Axelar: gateway.callContract(destinationChain, destinationAddress, payload)
        // CCIP: router.ccipSend(destinationChainSelector, message)
    }

    /**
     * @dev Receive message from source chain (called by messaging SDK)
     */
    function receiveMessage(
        uint256 srcChainId,
        address sender,
        bytes calldata payload
    ) external whenNotPaused {
        require(remoteBridgeContracts[srcChainId] == sender, "Invalid sender");
        
        emit MessageReceived(srcChainId, payload, sender);
        
        // Forward to bridge receiver
        bridgeReceiver.receiveMessage(srcChainId, sender, payload);
    }

    /**
     * @dev Set remote bridge contract for a chain
     */
    function setRemoteBridgeContract(uint256 chainId, address remoteContract) external onlyOwner {
        require(remoteContract != address(0), "Invalid address");
        remoteBridgeContracts[chainId] = remoteContract;
        emit RemoteContractUpdated(chainId, remoteContract);
    }

    /**
     * @dev Add authorized sender
     */
    function addAuthorizedSender(address sender) external onlyOwner {
        require(sender != address(0), "Invalid address");
        authorizedSenders[sender] = true;
    }

    /**
     * @dev Remove authorized sender
     */
    function removeAuthorizedSender(address sender) external onlyOwner {
        authorizedSenders[sender] = false;
    }

    /**
     * @dev Update bridge receiver
     */
    function updateBridgeReceiver(address newReceiver) external onlyOwner {
        require(newReceiver != address(0), "Invalid address");
        bridgeReceiver = IBridgeReceiver(newReceiver);
    }

    /**
     * @dev Get remote contract for chain
     */
    function getRemoteContract(uint256 chainId) external view returns (address) {
        return remoteBridgeContracts[chainId];
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
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}
}
