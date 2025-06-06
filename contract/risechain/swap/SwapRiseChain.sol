
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IOracle {
    function latest_answer() external view returns (uint256);
}

interface IBondingCurve {
    function getSwapPrice(address tokenA, address tokenB, uint256 amountIn) external view returns (uint256);
    function executeSwap(address tokenA, address tokenB, uint256 amountIn, address to) external returns (uint256);
}

/**
 * @title ScryptexSwap - Advanced DEX with Bonding Curve Integration
 * @dev Production-grade swap contract with dynamic pricing and point rewards
 */
contract ScryptexSwap is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant MAX_FEE_PERCENTAGE = 500; // 5%
    uint256 public constant POINTS_PER_SWAP = 15; // 15 STEX points per swap
    uint256 public constant SLIPPAGE_DENOMINATOR = 10000;
    
    // RiseChain Predeploys
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    
    // RiseChain Tokens
    address public constant RISE_USDC = 0x40918ba7f132e0acba2ce4de4c4baf9bd2d7d849;
    address public constant RISE_USDT = 0xf32d39ff9f6aa7a7a64d7a4f00a54826ef791a55;
    address public constant RISE_DAI = 0xd6e1afe5ca8d00a2efc01b89997abe2de47fdfaf;
    
    // RiseChain Oracles
    address public constant USDC_ORACLE = 0x50524C5bDa18aE25C600a8b81449B9CeAeB50471;
    address public constant USDT_ORACLE = 0x9190159b1bb78482Dca6EBaDf03ab744de0c0197;
    address public constant DAI_ORACLE = 0xadDAEd879D549E5DBfaf3e35470C20D8C50fDed0;

    struct SwapTransaction {
        bytes32 id;
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 feeAmount;
        uint256 timestamp;
        uint256 slippage;
        bool completed;
    }

    struct LiquidityPool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalLiquidity;
        uint256 feePercentage;
        bool active;
    }

    // State Variables
    mapping(bytes32 => SwapTransaction) public swapTransactions;
    mapping(address => mapping(address => LiquidityPool)) public liquidityPools;
    mapping(address => uint256) public userPoints;
    mapping(address => uint256) public nonces;
    mapping(address => bool) public supportedTokens;
    mapping(address => uint256) public tokenDecimals;
    mapping(address => address) public tokenOracles;
    
    address[] public allTokens;
    address public bondingCurveContract;
    uint256 public defaultFeePercentage = 25; // 0.25%
    uint256 public totalSwaps;
    uint256 public totalVolume;
    bool public useBondingCurve = false;
    
    // Events
    event SwapExecuted(bytes32 indexed swapId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 fee);
    event LiquidityAdded(address indexed user, address tokenA, address tokenB, uint256 amountA, uint256 amountB, uint256 liquidity);
    event LiquidityRemoved(address indexed user, address tokenA, address tokenB, uint256 amountA, uint256 amountB, uint256 liquidity);
    event PoolCreated(address indexed tokenA, address indexed tokenB, uint256 feePercentage);
    event PointsAwarded(address indexed user, uint256 points);
    event TokenAdded(address indexed token, address oracle, uint256 decimals);
    event BondingCurveUpdated(address indexed newContract, bool enabled);

    // Modifiers
    modifier supportedToken(address _token) {
        require(supportedTokens[_token] || _token == address(0), "Token not supported");
        _;
    }

    modifier validPool(address _tokenA, address _tokenB) {
        require(liquidityPools[_tokenA][_tokenB].active || liquidityPools[_tokenB][_tokenA].active, "Pool not active");
        _;
    }

    constructor() {
        // Initialize supported tokens
        _addToken(address(0), address(0), 18); // ETH
        _addToken(RISE_USDC, USDC_ORACLE, 6);
        _addToken(RISE_USDT, USDT_ORACLE, 6);
        _addToken(RISE_DAI, DAI_ORACLE, 18);
        _addToken(WETH, address(0), 18);
    }

    /**
     * @dev Swap exact tokens for tokens
     */
    function swapExactTokensForTokens(
        uint256 _amountIn,
        uint256 _amountOutMin,
        address _tokenIn,
        address _tokenOut,
        uint256 _slippageTolerance
    ) external nonReentrant whenNotPaused supportedToken(_tokenIn) supportedToken(_tokenOut) validPool(_tokenIn, _tokenOut) {
        require(_amountIn > 0, "Amount must be greater than 0");
        require(_slippageTolerance <= 1000, "Slippage too high"); // Max 10%
        require(_tokenIn != _tokenOut, "Same token swap");

        // Transfer tokens from user
        if (_tokenIn != address(0)) {
            IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        } else {
            require(msg.value == _amountIn, "ETH amount mismatch");
        }

        uint256 amountOut;
        uint256 feeAmount;

        if (useBondingCurve && bondingCurveContract != address(0)) {
            // Use bonding curve for price calculation
            amountOut = IBondingCurve(bondingCurveContract).getSwapPrice(_tokenIn, _tokenOut, _amountIn);
            feeAmount = (amountOut * defaultFeePercentage) / 10000;
            amountOut -= feeAmount;
            
            // Execute swap through bonding curve
            IBondingCurve(bondingCurveContract).executeSwap(_tokenIn, _tokenOut, _amountIn, address(this));
        } else {
            // Use traditional AMM calculation
            (amountOut, feeAmount) = _calculateSwapAmount(_tokenIn, _tokenOut, _amountIn);
            _executeTraditionalSwap(_tokenIn, _tokenOut, _amountIn, amountOut);
        }

        // Slippage check
        require(amountOut >= _amountOutMin, "Slippage exceeded");

        // Transfer output tokens to user
        if (_tokenOut != address(0)) {
            IERC20(_tokenOut).safeTransfer(msg.sender, amountOut);
        } else {
            payable(msg.sender).transfer(amountOut);
        }

        // Create swap transaction record
        bytes32 swapId = _generateSwapId(msg.sender, _tokenIn, _tokenOut, _amountIn);
        
        swapTransactions[swapId] = SwapTransaction({
            id: swapId,
            user: msg.sender,
            tokenIn: _tokenIn,
            tokenOut: _tokenOut,
            amountIn: _amountIn,
            amountOut: amountOut,
            feeAmount: feeAmount,
            timestamp: block.timestamp,
            slippage: _slippageTolerance,
            completed: true
        });

        // Award STEX points
        userPoints[msg.sender] += POINTS_PER_SWAP;
        emit PointsAwarded(msg.sender, POINTS_PER_SWAP);

        // Update statistics
        totalSwaps++;
        totalVolume += _getTokenValueInETH(_tokenIn, _amountIn);

        emit SwapExecuted(swapId, msg.sender, _tokenIn, _tokenOut, _amountIn, amountOut, feeAmount);
    }

    /**
     * @dev Add liquidity to a pool
     */
    function addLiquidity(
        address _tokenA,
        address _tokenB,
        uint256 _amountA,
        uint256 _amountB,
        uint256 _amountAMin,
        uint256 _amountBMin
    ) external payable nonReentrant whenNotPaused supportedToken(_tokenA) supportedToken(_tokenB) {
        require(_tokenA != _tokenB, "Same token");
        require(_amountA > 0 && _amountB > 0, "Amounts must be greater than 0");

        // Ensure proper token ordering
        if (_tokenA > _tokenB) {
            (_tokenA, _tokenB) = (_tokenB, _tokenA);
            (_amountA, _amountB) = (_amountB, _amountA);
            (_amountAMin, _amountBMin) = (_amountBMin, _amountAMin);
        }

        LiquidityPool storage pool = liquidityPools[_tokenA][_tokenB];
        
        // Create pool if it doesn't exist
        if (!pool.active) {
            pool.tokenA = _tokenA;
            pool.tokenB = _tokenB;
            pool.feePercentage = defaultFeePercentage;
            pool.active = true;
            emit PoolCreated(_tokenA, _tokenB, defaultFeePercentage);
        }

        uint256 liquidityMinted;
        uint256 actualAmountA = _amountA;
        uint256 actualAmountB = _amountB;

        if (pool.totalLiquidity == 0) {
            // First liquidity provision
            liquidityMinted = _sqrt(_amountA * _amountB);
        } else {
            // Calculate optimal amounts
            uint256 amountBOptimal = (_amountA * pool.reserveB) / pool.reserveA;
            if (amountBOptimal <= _amountB) {
                require(amountBOptimal >= _amountBMin, "Insufficient B amount");
                actualAmountB = amountBOptimal;
            } else {
                uint256 amountAOptimal = (_amountB * pool.reserveA) / pool.reserveB;
                require(amountAOptimal <= _amountA && amountAOptimal >= _amountAMin, "Insufficient A amount");
                actualAmountA = amountAOptimal;
            }
            
            liquidityMinted = (actualAmountA * pool.totalLiquidity) / pool.reserveA;
        }

        // Transfer tokens
        if (_tokenA != address(0)) {
            IERC20(_tokenA).safeTransferFrom(msg.sender, address(this), actualAmountA);
        } else {
            require(msg.value >= actualAmountA, "Insufficient ETH");
            if (msg.value > actualAmountA) {
                payable(msg.sender).transfer(msg.value - actualAmountA);
            }
        }

        if (_tokenB != address(0)) {
            IERC20(_tokenB).safeTransferFrom(msg.sender, address(this), actualAmountB);
        }

        // Update pool reserves
        pool.reserveA += actualAmountA;
        pool.reserveB += actualAmountB;
        pool.totalLiquidity += liquidityMinted;

        emit LiquidityAdded(msg.sender, _tokenA, _tokenB, actualAmountA, actualAmountB, liquidityMinted);
    }

    /**
     * @dev Remove liquidity from a pool
     */
    function removeLiquidity(
        address _tokenA,
        address _tokenB,
        uint256 _liquidity,
        uint256 _amountAMin,
        uint256 _amountBMin
    ) external nonReentrant whenNotPaused validPool(_tokenA, _tokenB) {
        require(_liquidity > 0, "Liquidity must be greater than 0");

        // Ensure proper token ordering
        if (_tokenA > _tokenB) {
            (_tokenA, _tokenB) = (_tokenB, _tokenA);
            (_amountAMin, _amountBMin) = (_amountBMin, _amountAMin);
        }

        LiquidityPool storage pool = liquidityPools[_tokenA][_tokenB];
        require(_liquidity <= pool.totalLiquidity, "Insufficient liquidity");

        uint256 amountA = (_liquidity * pool.reserveA) / pool.totalLiquidity;
        uint256 amountB = (_liquidity * pool.reserveB) / pool.totalLiquidity;

        require(amountA >= _amountAMin && amountB >= _amountBMin, "Insufficient output amounts");

        // Update pool reserves
        pool.reserveA -= amountA;
        pool.reserveB -= amountB;
        pool.totalLiquidity -= _liquidity;

        // Transfer tokens back to user
        if (_tokenA != address(0)) {
            IERC20(_tokenA).safeTransfer(msg.sender, amountA);
        } else {
            payable(msg.sender).transfer(amountA);
        }

        if (_tokenB != address(0)) {
            IERC20(_tokenB).safeTransfer(msg.sender, amountB);
        }

        emit LiquidityRemoved(msg.sender, _tokenA, _tokenB, amountA, amountB, _liquidity);
    }

    /**
     * @dev Get swap quote
     */
    function getAmountOut(
        uint256 _amountIn,
        address _tokenIn,
        address _tokenOut
    ) external view returns (uint256 amountOut, uint256 feeAmount) {
        if (useBondingCurve && bondingCurveContract != address(0)) {
            amountOut = IBondingCurve(bondingCurveContract).getSwapPrice(_tokenIn, _tokenOut, _amountIn);
            feeAmount = (amountOut * defaultFeePercentage) / 10000;
            amountOut -= feeAmount;
        } else {
            return _calculateSwapAmount(_tokenIn, _tokenOut, _amountIn);
        }
    }

    /**
     * @dev Set bonding curve contract
     */
    function setBondingCurve(address _bondingCurve, bool _enabled) external onlyOwner {
        bondingCurveContract = _bondingCurve;
        useBondingCurve = _enabled;
        emit BondingCurveUpdated(_bondingCurve, _enabled);
    }

    /**
     * @dev Add supported token
     */
    function addToken(address _token, address _oracle, uint256 _decimals) external onlyOwner {
        _addToken(_token, _oracle, _decimals);
    }

    /**
     * @dev Update fee percentage
     */
    function updateFee(uint256 _newFeePercentage) external onlyOwner {
        require(_newFeePercentage <= MAX_FEE_PERCENTAGE, "Fee too high");
        defaultFeePercentage = _newFeePercentage;
    }

    /**
     * @dev Get user STEX points
     */
    function getUserPoints(address _user) external view returns (uint256) {
        return userPoints[_user];
    }

    /**
     * @dev Get pool information
     */
    function getPoolInfo(address _tokenA, address _tokenB) external view returns (LiquidityPool memory) {
        if (_tokenA > _tokenB) {
            (_tokenA, _tokenB) = (_tokenB, _tokenA);
        }
        return liquidityPools[_tokenA][_tokenB];
    }

    /**
     * @dev Internal function to add token
     */
    function _addToken(address _token, address _oracle, uint256 _decimals) internal {
        if (!supportedTokens[_token]) {
            supportedTokens[_token] = true;
            tokenDecimals[_token] = _decimals;
            tokenOracles[_token] = _oracle;
            allTokens.push(_token);
            emit TokenAdded(_token, _oracle, _decimals);
        }
    }

    /**
     * @dev Calculate swap amount using AMM formula
     */
    function _calculateSwapAmount(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) internal view returns (uint256 amountOut, uint256 feeAmount) {
        // Ensure proper token ordering
        address tokenA = _tokenIn < _tokenOut ? _tokenIn : _tokenOut;
        address tokenB = _tokenIn < _tokenOut ? _tokenOut : _tokenIn;
        
        LiquidityPool memory pool = liquidityPools[tokenA][tokenB];
        require(pool.active, "Pool not active");

        uint256 reserveIn = _tokenIn == tokenA ? pool.reserveA : pool.reserveB;
        uint256 reserveOut = _tokenIn == tokenA ? pool.reserveB : pool.reserveA;

        // Calculate fee
        feeAmount = (_amountIn * pool.feePercentage) / 10000;
        uint256 amountInWithFee = _amountIn - feeAmount;

        // AMM formula: amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
        amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
    }

    /**
     * @dev Execute traditional AMM swap
     */
    function _executeTraditionalSwap(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        uint256 _amountOut
    ) internal {
        // Ensure proper token ordering
        address tokenA = _tokenIn < _tokenOut ? _tokenIn : _tokenOut;
        address tokenB = _tokenIn < _tokenOut ? _tokenOut : _tokenIn;
        
        LiquidityPool storage pool = liquidityPools[tokenA][tokenB];

        if (_tokenIn == tokenA) {
            pool.reserveA += _amountIn;
            pool.reserveB -= _amountOut;
        } else {
            pool.reserveB += _amountIn;
            pool.reserveA -= _amountOut;
        }
    }

    /**
     * @dev Get token value in ETH using oracle
     */
    function _getTokenValueInETH(address _token, uint256 _amount) internal view returns (uint256) {
        if (_token == address(0)) return _amount; // ETH
        
        address oracle = tokenOracles[_token];
        if (oracle == address(0)) return _amount; // No oracle, return amount as-is
        
        try IOracle(oracle).latest_answer() returns (uint256 price) {
            uint256 decimals = tokenDecimals[_token];
            return (_amount * price) / (10 ** decimals);
        } catch {
            return _amount; // Fallback
        }
    }

    /**
     * @dev Generate unique swap ID
     */
    function _generateSwapId(
        address _user,
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) internal returns (bytes32) {
        return keccak256(abi.encodePacked(
            _user,
            _tokenIn,
            _tokenOut,
            _amountIn,
            nonces[_user]++,
            block.timestamp
        ));
    }

    /**
     * @dev Square root function
     */
    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    /**
     * @dev Withdraw fees
     */
    function withdrawFees(address _token) external onlyOwner {
        if (_token == address(0)) {
            uint256 balance = address(this).balance;
            require(balance > 0, "No ETH to withdraw");
            payable(owner()).transfer(balance);
        } else {
            uint256 balance = IERC20(_token).balanceOf(address(this));
            require(balance > 0, "No tokens to withdraw");
            IERC20(_token).safeTransfer(owner(), balance);
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
