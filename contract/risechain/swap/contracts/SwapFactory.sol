
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SwapPair.sol";

/**
 * @title SwapFactory - Pool & Pair Management
 * @dev Creates and manages trading pairs
 */
contract SwapFactory is Ownable {
    
    mapping(address => mapping(address => address)) public getPair;
    mapping(address => bool) public isPair;
    address[] public allPairs;
    
    uint256 public defaultFee = 25; // 0.25%
    address public feeTo;
    address public pointsModule;
    
    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256 pairCount
    );

    constructor(address _feeTo, address _pointsModule) {
        feeTo = _feeTo;
        pointsModule = _pointsModule;
    }

    /**
     * @dev Create a new trading pair
     */
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "Identical addresses");
        
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        require(token0 != address(0), "Zero address");
        require(getPair[token0][token1] == address(0), "Pair exists");
        
        bytes memory bytecode = type(SwapPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        
        SwapPair(pair).initialize(token0, token1, defaultFee, feeTo, pointsModule);
        
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        isPair[pair] = true;
        allPairs.push(pair);
        
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    /**
     * @dev Sort tokens in ascending order
     */
    function sortTokens(address tokenA, address tokenB) public pure returns (address token0, address token1) {
        require(tokenA != tokenB, "Identical addresses");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "Zero address");
    }

    /**
     * @dev Get pair count
     */
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    /**
     * @dev Update default fee
     */
    function updateDefaultFee(uint256 newFee) external onlyOwner {
        require(newFee <= 500, "Fee too high"); // Max 5%
        defaultFee = newFee;
    }

    /**
     * @dev Update fee recipient
     */
    function updateFeeTo(address newFeeTo) external onlyOwner {
        feeTo = newFeeTo;
    }

    /**
     * @dev Update points module
     */
    function updatePointsModule(address newPointsModule) external onlyOwner {
        pointsModule = newPointsModule;
    }

    /**
     * @dev Check if address is a pair
     */
    function checkIsPair(address pair) external view returns (bool) {
        return isPair[pair];
    }
}
