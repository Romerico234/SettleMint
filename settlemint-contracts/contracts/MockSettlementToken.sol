pragma solidity ^0.8.24;

contract MockSettlementToken {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);

    error InsufficientAllowance();
    error InsufficientBalance();
    error InvalidAddress();
    error Unauthorized();

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint8 tokenDecimals,
        address initialHolder,
        uint256 initialSupply
    ) {
        if (initialHolder == address(0)) {
            revert InvalidAddress();
        }

        owner = msg.sender;
        name = tokenName;
        symbol = tokenSymbol;
        decimals = tokenDecimals;

        emit OwnershipTransferred(address(0), msg.sender);
        _mint(initialHolder, initialSupply);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert Unauthorized();
        }
        _;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance < value) {
            revert InsufficientAllowance();
        }

        allowance[from][msg.sender] = currentAllowance - value;
        emit Approval(from, msg.sender, allowance[from][msg.sender]);
        _transfer(from, to, value);
        return true;
    }

    function mint(address to, uint256 value) external onlyOwner returns (bool) {
        _mint(to, value);
        return true;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert InvalidAddress();
        }

        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function _mint(address to, uint256 value) internal {
        if (to == address(0)) {
            revert InvalidAddress();
        }

        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (to == address(0)) {
            revert InvalidAddress();
        }

        uint256 senderBalance = balanceOf[from];
        if (senderBalance < value) {
            revert InsufficientBalance();
        }

        balanceOf[from] = senderBalance - value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}
