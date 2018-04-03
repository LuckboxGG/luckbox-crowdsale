pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/CappedToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/PausableToken.sol";

contract LuckCashToken is PausableToken, CappedToken {
    string public constant name = "LuckCash";
    string public constant symbol = "LCK";
    uint8 public constant decimals = 18;

    function LuckCashToken(uint _cap) public CappedToken(_cap) PausableToken() {}
}
