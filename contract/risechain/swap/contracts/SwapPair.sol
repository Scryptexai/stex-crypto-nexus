
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IPointsModule {
    function addPoints(address user, uint256 points) external;
}

/**
 * @title SwapPair - AMM Logic per Pool
 * @dev Implements constant product AMM formula
 */
contract SwapPair is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public factory;
    address public token0;
    address public token1;
    address public feeTo;
    IPointsModule public pointsModule;
    
    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;
    
    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;
    uint256 public kLast;
    uint256 public swapFee = 25; // 0.25%
    
    uint256 private unlocked = 1;
    
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    modifier lock() {
        require(unlocked == 1, "Locked");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    constructor() ERC20("Scryptex LP", "STEX-LP") {
        factory = msg.sender;
    }

    /**
     * @dev Initialize pair (called by factory)
     */
    function initialize(
        address _token0,
        address _token1,
        uint256 _swapFee,
        address _feeTo,
        address _pointsModule
    ) external {
        require(msg.sender == factory, "Forbidden");
        token0 = _token0;
        token1 = _token1;
        swapFee = _swapFee;
        feeTo = _feeTo;
        pointsModule = IPointsModule(_pointsModule);
    }

    /**
     * @dev Get reserves
     */
    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    /**
     * @dev Mint liquidity tokens
     */
    function mint(address to) external lock returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint256 _totalSupply = totalSupply();
        
        if (_totalSupply == 0) {
            liquidity = _sqrt(amount0 * amount1) - 1000; // MINIMUM_LIQUIDITY
            _mint(address(0x000000000000000000000000000000000000dEaD), 1000);
        } else {
            liquidity = _min(amount0 * _totalSupply / _reserve0, amount1 * _totalSupply / _reserve1);
        }
        
        require(liquidity > 0, "Insufficient liquidity minted");
        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint256(reserve0) * reserve1;
        
        emit Mint(msg.sender, amount0, amount1);
    }

    /**
     * @dev Burn liquidity tokens
     */
    function burn(address to) external lock returns (uint256 amount0, uint256 amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        address _token0 = token0;
        address _token1 = token1;
        uint256 balance0 = IERC20(_token0).balanceOf(address(this));
        uint256 balance1 = IERC20(_token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint256 _totalSupply = totalSupply();
        
        amount0 = liquidity * balance0 / _totalSupply;
        amount1 = liquidity * balance1 / _totalSupply;
        
        require(amount0 > 0 && amount1 > 0, "Insufficient liquidity burned");
        
        _burn(address(this), liquidity);
        IERC20(_token0).safeTransfer(to, amount0);
        IERC20(_token1).safeTransfer(to, amount1);
        
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint256(reserve0) * reserve1;
        
        emit Burn(msg.sender, amount0, amount1, to);
    }

    /**
     * @dev Swap tokens
     */
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external lock {
        require(amount0Out > 0 || amount1Out > 0, "Insufficient output amount");
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "Insufficient liquidity");

        uint256 balance0;
        uint256 balance1;
        
        {
            address _token0 = token0;
            address _token1 = token1;
            require(to != _token0 && to != _token1, "Invalid to");
            
            if (amount0Out > 0) IERC20(_token0).safeTransfer(to, amount0Out);
            if (amount1Out > 0) IERC20(_token1).safeTransfer(to, amount1Out);
            
            balance0 = IERC20(_token0).balanceOf(address(this));
            balance1 = IERC20(_token1).balanceOf(address(this));
        }
        
        uint256 amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        
        require(amount0In > 0 || amount1In > 0, "Insufficient input amount");
        
        {
            uint256 balance0Adjusted = balance0 * 10000 - amount0In * swapFee;
            uint256 balance1Adjusted = balance1 * 10000 - amount1In * swapFee;
            require(balance0Adjusted * balance1Adjusted >= uint256(_reserve0) * _reserve1 * 10000**2, "K");
        }

        _update(balance0, balance1, _reserve0, _reserve1);
        
        // Award points for swap
        if (address(pointsModule) != address(0)) {
            pointsModule.addPoints(to, 15); // 15 STEX points per swap
        }
        
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    /**
     * @dev Force balances to match reserves
     */
    function skim(address to) external lock {
        address _token0 = token0;
        address _token1 = token1;
        IERC20(_token0).safeTransfer(to, IERC20(_token0).balanceOf(address(this)) - reserve0);
        IERC20(_token1).safeTransfer(to, IERC20(_token1).balanceOf(address(this)) - reserve1);
    }

    /**
     * @dev Force reserves to match balances
     */
    function sync() external lock {
        _update(IERC20(token0).balanceOf(address(this)), IERC20(token1).balanceOf(address(this)), reserve0, reserve1);
    }

    /**
     * @dev Update reserves and price accumulators
     */
    function _update(uint256 balance0, uint256 balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "Overflow");
        
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;
        
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            price0CumulativeLast += uint256(_reserve1) * timeElapsed / _reserve0;
            price1CumulativeLast += uint256(_reserve0) * timeElapsed / _reserve1;
        }
        
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        
        emit Sync(reserve0, reserve1);
    }

    /**
     * @dev Mint protocol fee if applicable
     */
    function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
        address _feeTo = feeTo;
        feeOn = _feeTo != address(0);
        uint256 _kLast = kLast;
        
        if (feeOn) {
            if (_kLast != 0) {
                uint256 rootK = _sqrt(uint256(_reserve0) * _reserve1);
                uint256 rootKLast = _sqrt(_kLast);
                
                if (rootK > rootKLast) {
                    uint256 numerator = totalSupply() * (rootK - rootKLast);
                    uint256 denominator = rootK * 5 + rootKLast;
                    uint256 liquidity = numerator / denominator;
                    
                    if (liquidity > 0) _mint(_feeTo, liquidity);
                }
            }
        } else if (_kLast != 0) {
            kLast = 0;
        }
    }

    /**
     * @dev Square root function
     */
    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    /**
     * @dev Minimum function
     */
    function _min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }
}
