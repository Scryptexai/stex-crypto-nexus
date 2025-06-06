
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PointsModule - STEX Reward System
 * @dev Manages STEX points for user activities
 */
contract PointsModule is Ownable, ReentrancyGuard {
    
    mapping(address => uint256) public userPoints;
    mapping(address => bool) public authorizedAdders;
    mapping(address => uint256) public totalPointsEarned;
    mapping(address => uint256) public pointsClaimed;
    
    uint256 public totalPointsDistributed;
    bool public claimingEnabled = false;
    
    event PointsAdded(address indexed user, uint256 amount, address indexed adder);
    event PointsClaimed(address indexed user, uint256 amount);
    event AdderAuthorized(address indexed adder);
    event AdderUnauthorized(address indexed adder);
    event ClaimingToggled(bool enabled);

    modifier onlyAuthorizedAdder() {
        require(authorizedAdders[msg.sender], "Not authorized to add points");
        _;
    }

    constructor() {
        authorizedAdders[msg.sender] = true;
    }

    /**
     * @dev Add points to user (called by bridge/swap contracts)
     */
    function addPoints(address user, uint256 points) external onlyAuthorizedAdder {
        require(user != address(0), "Invalid user address");
        require(points > 0, "Points must be greater than 0");
        
        userPoints[user] += points;
        totalPointsEarned[user] += points;
        totalPointsDistributed += points;
        
        emit PointsAdded(user, points, msg.sender);
    }

    /**
     * @dev Get user points
     */
    function getPoints(address user) external view returns (uint256) {
        return userPoints[user];
    }

    /**
     * @dev Get user total earned points
     */
    function getTotalEarned(address user) external view returns (uint256) {
        return totalPointsEarned[user];
    }

    /**
     * @dev Get user claimed points
     */
    function getClaimedPoints(address user) external view returns (uint256) {
        return pointsClaimed[user];
    }

    /**
     * @dev Claim points (if claiming is enabled)
     */
    function claimPoints() external nonReentrant {
        require(claimingEnabled, "Claiming not enabled");
        
        uint256 points = userPoints[msg.sender];
        require(points > 0, "No points to claim");
        
        userPoints[msg.sender] = 0;
        pointsClaimed[msg.sender] += points;
        
        emit PointsClaimed(msg.sender, points);
        
        // TODO: Implement actual reward distribution (tokens, NFTs, etc.)
        // For now, this just tracks the claim
    }

    /**
     * @dev Authorize address to add points
     */
    function authorizeAdder(address adder) external onlyOwner {
        require(adder != address(0), "Invalid address");
        require(!authorizedAdders[adder], "Already authorized");
        
        authorizedAdders[adder] = true;
        emit AdderAuthorized(adder);
    }

    /**
     * @dev Unauthorize address from adding points
     */
    function unauthorizeAdder(address adder) external onlyOwner {
        require(authorizedAdders[adder], "Not authorized");
        
        authorizedAdders[adder] = false;
        emit AdderUnauthorized(adder);
    }

    /**
     * @dev Toggle claiming functionality
     */
    function toggleClaiming() external onlyOwner {
        claimingEnabled = !claimingEnabled;
        emit ClaimingToggled(claimingEnabled);
    }

    /**
     * @dev Batch add points to multiple users
     */
    function batchAddPoints(
        address[] calldata users,
        uint256[] calldata points
    ) external onlyAuthorizedAdder {
        require(users.length == points.length, "Array length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Invalid user address");
            require(points[i] > 0, "Points must be greater than 0");
            
            userPoints[users[i]] += points[i];
            totalPointsEarned[users[i]] += points[i];
            totalPointsDistributed += points[i];
            
            emit PointsAdded(users[i], points[i], msg.sender);
        }
    }

    /**
     * @dev Get leaderboard (top users by points)
     */
    function getTopUsers(address[] calldata users) external view returns (
        address[] memory topUsers,
        uint256[] memory topPoints
    ) {
        uint256[] memory points = new uint256[](users.length);
        
        for (uint256 i = 0; i < users.length; i++) {
            points[i] = totalPointsEarned[users[i]];
        }
        
        // Simple bubble sort for demonstration (not gas efficient for large arrays)
        for (uint256 i = 0; i < users.length; i++) {
            for (uint256 j = i + 1; j < users.length; j++) {
                if (points[i] < points[j]) {
                    // Swap points
                    uint256 tempPoints = points[i];
                    points[i] = points[j];
                    points[j] = tempPoints;
                    
                    // Swap users
                    address tempUser = users[i];
                    users[i] = users[j];
                    users[j] = tempUser;
                }
            }
        }
        
        return (users, points);
    }

    /**
     * @dev Get contract statistics
     */
    function getStats() external view returns (
        uint256 totalDistributed,
        uint256 totalUsers,
        bool claimingActive
    ) {
        return (totalPointsDistributed, 0, claimingEnabled); // totalUsers would need additional tracking
    }
}
