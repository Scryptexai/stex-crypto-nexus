
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TokenListingManager is Ownable, ReentrancyGuard {
    
    struct TokenMetadata {
        string name;
        string symbol;
        string description;
        string imageUrl;
        string websiteUrl;
        string telegramUrl;
        string twitterUrl;
        string[] tags;
    }

    struct TokenListing {
        address creator;
        TokenMetadata metadata;
        uint256 listedAt;
        bool isActive;
        string category;
        uint256 trendingScore;
        uint256 volume24h;
        uint256 trades24h;
        uint256 uniqueTraders;
        uint256 socialScore;
    }

    enum ListingCategory {
        TRENDING,
        NEW,
        TOP_VOLUME,
        ABOUT_TO_GRADUATE,
        RECENTLY_GRADUATED,
        MEME_COINS,
        UTILITY_TOKENS
    }

    // Storage
    mapping(address => TokenListing) public tokenListings;
    mapping(string => address[]) public categoryTokens;
    mapping(bytes32 => address[]) public searchIndex; // keccak256 of search terms
    address[] public allListedTokens;
    
    address public tokenFactory;
    address public tradingEngine;

    // Events
    event TokenAutoListed(address indexed token, address indexed creator, uint256 timestamp);
    event TokenCategoryChanged(address indexed token, string oldCategory, string newCategory);
    event TrendingScoreUpdated(address indexed token, uint256 newScore);

    modifier onlyTokenFactory() {
        require(msg.sender == tokenFactory, "Only token factory");
        _;
    }

    modifier onlyTradingEngine() {
        require(msg.sender == tradingEngine, "Only trading engine");
        _;
    }

    constructor(address _tokenFactory, address _tradingEngine) {
        tokenFactory = _tokenFactory;
        tradingEngine = _tradingEngine;
    }

    // SECTION 3.1: Automatic Listing System
    function autoListToken(
        address token,
        address creator,
        TokenMetadata calldata metadata
    ) external onlyTokenFactory {
        require(token != address(0), "Invalid token");
        require(!tokenListings[token].isActive, "Already listed");

        // Validate metadata
        require(bytes(metadata.name).length > 0, "Name required");
        require(bytes(metadata.symbol).length > 0, "Symbol required");
        require(bytes(metadata.description).length <= 500, "Description too long");

        // Create listing
        tokenListings[token] = TokenListing({
            creator: creator,
            metadata: metadata,
            listedAt: block.timestamp,
            isActive: true,
            category: "NEW",
            trendingScore: 0,
            volume24h: 0,
            trades24h: 0,
            uniqueTraders: 0,
            socialScore: 0
        });

        // Add to arrays
        allListedTokens.push(token);
        categoryTokens["NEW"].push(token);

        // Build search index
        _buildSearchIndex(token, metadata);

        emit TokenAutoListed(token, creator, block.timestamp);
    }

    function _buildSearchIndex(address token, TokenMetadata memory metadata) internal {
        // Index by name
        bytes32 nameHash = keccak256(abi.encodePacked(_toLowerCase(metadata.name)));
        searchIndex[nameHash].push(token);

        // Index by symbol
        bytes32 symbolHash = keccak256(abi.encodePacked(_toLowerCase(metadata.symbol)));
        searchIndex[symbolHash].push(token);

        // Index by tags
        for (uint i = 0; i < metadata.tags.length; i++) {
            bytes32 tagHash = keccak256(abi.encodePacked(_toLowerCase(metadata.tags[i])));
            searchIndex[tagHash].push(token);
        }

        // Index by description keywords (first 5 words)
        string[] memory words = _splitString(metadata.description, " ");
        for (uint i = 0; i < words.length && i < 5; i++) {
            if (bytes(words[i]).length > 3) { // Only index words longer than 3 chars
                bytes32 wordHash = keccak256(abi.encodePacked(_toLowerCase(words[i])));
                searchIndex[wordHash].push(token);
            }
        }
    }

    // SECTION 3.2: Discovery & Search System
    function searchTokens(string calldata query) external view returns (address[] memory results) {
        bytes32 queryHash = keccak256(abi.encodePacked(_toLowerCase(query)));
        return searchIndex[queryHash];
    }

    function getTokensByCategory(string calldata category) external view returns (address[] memory) {
        return categoryTokens[category];
    }

    function getTrendingTokens(uint256 limit) external view returns (address[] memory trending) {
        address[] memory allTokens = allListedTokens;
        
        // Simple bubble sort by trending score (for demo - use more efficient sorting in production)
        for (uint i = 0; i < allTokens.length - 1; i++) {
            for (uint j = 0; j < allTokens.length - i - 1; j++) {
                if (tokenListings[allTokens[j]].trendingScore < tokenListings[allTokens[j + 1]].trendingScore) {
                    address temp = allTokens[j];
                    allTokens[j] = allTokens[j + 1];
                    allTokens[j + 1] = temp;
                }
            }
        }

        // Return top tokens limited by limit parameter
        uint256 resultLength = limit > allTokens.length ? allTokens.length : limit;
        trending = new address[](resultLength);
        for (uint i = 0; i < resultLength; i++) {
            trending[i] = allTokens[i];
        }
    }

    function getNewTokens(uint256 limit) external view returns (address[] memory newest) {
        address[] memory newTokens = categoryTokens["NEW"];
        uint256 resultLength = limit > newTokens.length ? newTokens.length : limit;
        newest = new address[](resultLength);
        
        // Return most recent tokens (assuming array is chronological)
        uint256 startIndex = newTokens.length > limit ? newTokens.length - limit : 0;
        for (uint i = 0; i < resultLength; i++) {
            newest[i] = newTokens[startIndex + i];
        }
    }

    // SECTION 3.3: Trending Algorithm
    function calculateTrendingScore(address token) public view returns (uint256) {
        TokenListing memory listing = tokenListings[token];
        
        uint256 volumeScore = listing.volume24h * 40 / 100;
        uint256 tradersScore = listing.uniqueTraders * 30 / 100;
        uint256 socialScore = listing.socialScore * 20 / 100;
        uint256 timeScore = _calculateTimeDecay(token) * 10 / 100;
        
        return volumeScore + tradersScore + socialScore + timeScore;
    }

    function _calculateTimeDecay(address token) internal view returns (uint256) {
        TokenListing memory listing = tokenListings[token];
        uint256 timeSinceListing = block.timestamp - listing.listedAt;
        
        // Decay over 7 days
        if (timeSinceListing >= 7 days) return 0;
        
        return ((7 days - timeSinceListing) * 100) / 7 days;
    }

    function updateTrendingScore(address token) external {
        require(tokenListings[token].isActive, "Token not listed");
        
        uint256 newScore = calculateTrendingScore(token);
        tokenListings[token].trendingScore = newScore;
        
        emit TrendingScoreUpdated(token, newScore);
    }

    // SECTION 3.4: Community Features Integration
    function updateTokenMetrics(
        address token,
        uint256 volume24h,
        uint256 trades24h,
        uint256 uniqueTraders
    ) external onlyTradingEngine {
        require(tokenListings[token].isActive, "Token not listed");
        
        TokenListing storage listing = tokenListings[token];
        listing.volume24h = volume24h;
        listing.trades24h = trades24h;
        listing.uniqueTraders = uniqueTraders;
        
        // Auto-update category based on metrics
        _updateCategory(token);
        
        // Update trending score
        listing.trendingScore = calculateTrendingScore(token);
    }

    function updateSocialScore(address token, uint256 socialScore) external {
        require(tokenListings[token].isActive, "Token not listed");
        tokenListings[token].socialScore = socialScore;
    }

    function _updateCategory(address token) internal {
        TokenListing storage listing = tokenListings[token];
        string memory oldCategory = listing.category;
        string memory newCategory = oldCategory;

        // Determine new category based on metrics
        if (listing.volume24h > 100 ether) {
            newCategory = "TOP_VOLUME";
        } else if (block.timestamp - listing.listedAt < 24 hours) {
            newCategory = "NEW";
        } else if (listing.trendingScore > 1000) {
            newCategory = "TRENDING";
        }

        if (keccak256(abi.encodePacked(newCategory)) != keccak256(abi.encodePacked(oldCategory))) {
            listing.category = newCategory;
            
            // Update category arrays
            _removeFromCategory(token, oldCategory);
            categoryTokens[newCategory].push(token);
            
            emit TokenCategoryChanged(token, oldCategory, newCategory);
        }
    }

    function _removeFromCategory(address token, string memory category) internal {
        address[] storage tokens = categoryTokens[category];
        for (uint i = 0; i < tokens.length; i++) {
            if (tokens[i] == token) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
    }

    // Utility functions
    function _toLowerCase(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        for (uint i = 0; i < bStr.length; i++) {
            if (uint8(bStr[i]) >= 65 && uint8(bStr[i]) <= 90) {
                bStr[i] = bytes1(uint8(bStr[i]) + 32);
            }
        }
        return string(bStr);
    }

    function _splitString(string memory str, string memory delimiter) internal pure returns (string[] memory) {
        // Simplified string splitting - in production use a proper library
        string[] memory result = new string[](10); // Max 10 words
        // Implementation would go here
        return result;
    }

    // View functions
    function getTokenListing(address token) external view returns (TokenListing memory) {
        return tokenListings[token];
    }

    function getAllListedTokens() external view returns (address[] memory) {
        return allListedTokens;
    }

    function getListedTokenCount() external view returns (uint256) {
        return allListedTokens.length;
    }

    // Admin functions
    function setTokenFactory(address _tokenFactory) external onlyOwner {
        tokenFactory = _tokenFactory;
    }

    function setTradingEngine(address _tradingEngine) external onlyOwner {
        tradingEngine = _tradingEngine;
    }

    function delistToken(address token) external onlyOwner {
        require(tokenListings[token].isActive, "Token not listed");
        tokenListings[token].isActive = false;
        
        // Remove from category
        _removeFromCategory(token, tokenListings[token].category);
    }
}
