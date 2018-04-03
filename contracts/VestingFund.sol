pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol";
import "zeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title VestingFund
 * @dev A token holder contract that can release its token balance incrementally.
 * A sum equal to amount/quarters will be released every quarter. Optionally revocable by the owner.
 */
contract VestingFund is Ownable {
  using SafeMath for uint256;
  using SafeERC20 for ERC20Basic;

  event Released(uint256 amount);

  // beneficiary of tokens after they are released
  address public beneficiary;
  ERC20Basic public token;

  uint256 public quarters;
  uint256 public start;


  uint256 public released;

  /**
   * @dev Creates a vesting contract that vests its balance of any ERC20 token to the
   * _beneficiary, tokens are release in an incremental fashion after a quater has passed until _start + _quarters * 3 * months. 
   * By then all of the balance will have vested.
   * @param _beneficiary address of the beneficiary to whom vested tokens are transferred
   * @param _quarters number of quarters the vesting will last
   * @param _token ERC20 token which is being vested
   */
  function VestingFund(address _beneficiary, uint256 _start, uint256 _quarters, address _token) public {
    
    require(_beneficiary != address(0) && _token != address(0));
    require(_quarters > 0);

    beneficiary = _beneficiary;
    quarters = _quarters;
    start = _start;
    token = ERC20Basic(_token);
  }

  /**
   * @notice Transfers vested tokens to beneficiary.
   */
  function release() public {
    uint256 unreleased = releasableAmount();
    require(unreleased > 0);

    released = released.add(unreleased);
    token.safeTransfer(beneficiary, unreleased);

    Released(unreleased);
  }

  /**
   * @dev Calculates the amount that has already vested but hasn't been released yet.
   */
  function releasableAmount() public view returns(uint256) {
    return vestedAmount().sub(released);
  }

  /**
   * @dev Calculates the amount that has already vested.
   */
  function vestedAmount() public view returns(uint256) {
    uint256 currentBalance = token.balanceOf(this);
    uint256 totalBalance = currentBalance.add(released);

    if (now < start) {
      return 0;
    }

    uint256 dT = now.sub(start); // time passed since start
    uint256 dQuarters = dT.div(90 days); // quarters passed

    if (dQuarters >= quarters) {
      return totalBalance; // return everything if vesting period ended
    } else {
      return totalBalance.mul(dQuarters).div(quarters); // ammount = total * (quarters passed / total quarters)
    }
  }
}