
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IBondingCurve {
    function initializeBondingCurve(
        address token,
        uint256 initialSupply,
        uint256 maxSupply,
        address creator
    ) external returns (address curveAddress);
}

interface ITradingEngine {
    function registerNewToken(
        address token,
        address creator,
        address bondingCurve
    ) external;
}

interface ITokenListingManager {
    function autoListToken(
        address token,
        address creator,
        TokenMetadata calldata metadata
    ) external;
}

contract ScryptexToken is ERC20 {
    address public creator;
    string public description;
    string public imageUrl;
    string public websiteUrl;
    string public telegramUrl;
    string public twitterUrl;
    uint256 public maxSupply;
    uint256 public createdAt;

    constructor(
        string memory name,
        string memory symbol,
        string memory _description,
        string memory _imageUrl,
        address _creator
    ) ERC20(name, symbol) {
        creator = _creator;
        description = _description;
        imageUrl = _imageUrl;
        maxSupply = 1_000_000_000 * 10**18; // 1 Billion tokens (Pump.fun standard)
        createdAt = block.timestamp;
        
        // Mint initial supply to bonding curve (will be set by factory)
        _mint(msg.sender, maxSupply);
    }

    function updateMetadata(
        string memory _description,
        string memory _imageUrl,
        string memory _websiteUrl,
        string memory _telegramUrl,
        string memory _twitterUrl
    ) external {
        require(msg.sender == creator, "Only creator can update");
        description = _description;
        imageUrl = _imageUrl;
        websiteUrl = _websiteUrl;
        telegramUrl = _telegramUrl;
        twitterUrl = _twitterUrl;
    }
}

contract TokenFactory is ReentrancyGuard, Ownable {
    // Pump.fun exact parameters
    uint256 public constant CREATION_FEE = 0.02 ether; // Same as pump.fun (0.02 SOL)
    uint256 public constant TOKEN_SUPPLY = 1_000_000_000 * 10**18; // 1 Billion tokens
    uint256 public constant BONDING_CURVE_SUPPLY = 800_000_000 * 10**18; // 80% for bonding curve
    uint256 public constant LIQUIDITY_SUPPLY = 200_000_000 * 10**18; // 20% for liquidity

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

    struct TokenInfo {
        address tokenAddress;
        address creator;
        address bondingCurve;
        uint256 createdAt;
        bool isActive;
        TokenMetadata metadata;
    }

    // Storage
    mapping(address => TokenInfo) public tokens;
    mapping(string => address) public tokenByName;
    mapping(string => address) public tokenBySymbol;
    mapping(address => address[]) public creatorTokens;
    address[] public allTokens;

    // Dependencies
    address public bondingCurveIntegrator;
    address public tradingEngine;
    address public tokenListingManager;
    address public feeTreasury;

    // Anti-spam
    mapping(address => uint256) public lastCreationTime;
    uint256 public constant CREATION_COOLDOWN = 60; // 1 minute between creations

    // Events
    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 maxSupply,
        address bondingCurve
    );
    event TokenMetadataUpdated(address indexed token, string name, string symbol);

    modifier creationCooldown() {
        require(
            block.timestamp >= lastCreationTime[msg.sender] + CREATION_COOLDOWN,
            "Creation cooldown active"
        );
        lastCreationTime[msg.sender] = block.timestamp;
        _;
    }

    modifier validMetadata(TokenMetadata memory metadata) {
        require(bytes(metadata.name).length > 0 && bytes(metadata.name).length <= 32, "Invalid name");
        require(bytes(metadata.symbol).length > 0 && bytes(metadata.symbol).length <= 10, "Invalid symbol");
        require(bytes(metadata.description).length <= 500, "Description too long");
        require(tokenByName[metadata.name] == address(0), "Name taken");
        require(tokenBySymbol[metadata.symbol] == address(0), "Symbol taken");
        _;
    }

    constructor() {}

    function createToken(
        TokenMetadata calldata metadata
    ) external payable nonReentrant creationCooldown validMetadata(metadata) {
        require(msg.value >= CREATION_FEE, "Insufficient creation fee");

        // Deploy new token contract
        ScryptexToken token = new ScryptexToken(
            metadata.name,
            metadata.symbol,
            metadata.description,
            metadata.imageUrl,
            msg.sender
        );

        address tokenAddress = address(token);

        // Initialize bonding curve
        address bondingCurve = IBondingCurve(bondingCurveIntegrator).initializeBondingCurve(
            tokenAddress,
            BONDING_CURVE_SUPPLY,
            TOKEN_SUPPLY,
            msg.sender
        );

        // Transfer bonding curve tokens
        token.transfer(bondingCurve, BONDING_CURVE_SUPPLY);

        // Store token info
        tokens[tokenAddress] = TokenInfo({
            tokenAddress: tokenAddress,
            creator: msg.sender,
            bondingCurve: bondingCurve,
            createdAt: block.timestamp,
            isActive: true,
            metadata: metadata
        });

        // Update mappings
        tokenByName[metadata.name] = tokenAddress;
        tokenBySymbol[metadata.symbol] = tokenAddress;
        creatorTokens[msg.sender].push(tokenAddress);
        allTokens.push(tokenAddress);

        // Register with trading engine
        if (tradingEngine != address(0)) {
            ITradingEngine(tradingEngine).registerNewToken(
                tokenAddress,
                msg.sender,
                bondingCurve
            );
        }

        // Auto-list token
        if (tokenListingManager != address(0)) {
            ITokenListingManager(tokenListingManager).autoListToken(
                tokenAddress,
                msg.sender,
                metadata
            );
        }

        // Send creation fee to treasury
        if (feeTreasury != address(0)) {
            payable(feeTreasury).transfer(msg.value);
        }

        emit TokenCreated(
            tokenAddress,
            msg.sender,
            metadata.name,
            metadata.symbol,
            TOKEN_SUPPLY,
            bondingCurve
        );
    }

    function batchCreateTokens(
        TokenMetadata[] calldata metadatas
    ) external payable nonReentrant {
        require(metadatas.length <= 5, "Max 5 tokens per batch");
        require(msg.value >= CREATION_FEE * metadatas.length, "Insufficient total fee");

        for (uint256 i = 0; i < metadatas.length; i++) {
            require(bytes(metadatas[i].name).length > 0, "Invalid name");
            require(tokenByName[metadatas[i].name] == address(0), "Name taken");
            require(tokenBySymbol[metadatas[i].symbol] == address(0), "Symbol taken");

            // Create token (simplified version for batch)
            ScryptexToken token = new ScryptexToken(
                metadatas[i].name,
                metadatas[i].symbol,
                metadatas[i].description,
                metadatas[i].imageUrl,
                msg.sender
            );

            address tokenAddress = address(token);
            
            // Initialize bonding curve
            address bondingCurve = IBondingCurve(bondingCurveIntegrator).initializeBondingCurve(
                tokenAddress,
                BONDING_CURVE_SUPPLY,
                TOKEN_SUPPLY,
                msg.sender
            );

            // Store token info
            tokens[tokenAddress] = TokenInfo({
                tokenAddress: tokenAddress,
                creator: msg.sender,
                bondingCurve: bondingCurve,
                createdAt: block.timestamp,
                isActive: true,
                metadata: metadatas[i]
            });

            tokenByName[metadatas[i].name] = tokenAddress;
            tokenBySymbol[metadatas[i].symbol] = tokenAddress;
            allTokens.push(tokenAddress);

            emit TokenCreated(
                tokenAddress,
                msg.sender,
                metadatas[i].name,
                metadatas[i].symbol,
                TOKEN_SUPPLY,
                bondingCurve
            );
        }

        // Send batch creation fees to treasury
        if (feeTreasury != address(0)) {
            payable(feeTreasury).transfer(msg.value);
        }
    }

    // View functions
    function getTokenInfo(address tokenAddress) external view returns (TokenInfo memory) {
        return tokens[tokenAddress];
    }

    function getCreatorTokens(address creator) external view returns (address[] memory) {
        return creatorTokens[creator];
    }

    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }

    function getTokenCount() external view returns (uint256) {
        return allTokens.length;
    }

    function isTokenCreated(address tokenAddress) external view returns (bool) {
        return tokens[tokenAddress].isActive;
    }

    function isNameTaken(string memory name) external view returns (bool) {
        return tokenByName[name] != address(0);
    }

    function isSymbolTaken(string memory symbol) external view returns (bool) {
        return tokenBySymbol[symbol] != address(0);
    }

    // Admin functions
    function setBondingCurveIntegrator(address _bondingCurveIntegrator) external onlyOwner {
        bondingCurveIntegrator = _bondingCurveIntegrator;
    }

    function setTradingEngine(address _tradingEngine) external onlyOwner {
        tradingEngine = _tradingEngine;
    }

    function setTokenListingManager(address _tokenListingManager) external onlyOwner {
        tokenListingManager = _tokenListingManager;
    }

    function setFeeTreasury(address _feeTreasury) external onlyOwner {
        feeTreasury = _feeTreasury;
    }

    function updateCreationFee(uint256 newFee) external onlyOwner {
        require(newFee <= 0.1 ether, "Fee too high");
        // Update would require a new constant or storage variable
    }

    function emergencyDeactivateToken(address tokenAddress) external onlyOwner {
        tokens[tokenAddress].isActive = false;
    }

    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}
}
