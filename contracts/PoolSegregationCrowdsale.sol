pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract PoolSegregationCrowdsale is Ownable {
    /**
    * we include the crowdsale eventhough this is not treated in this contract (zeppelin's CappedCrowdsale )
    */
    enum POOLS {POOL_STRATEGIC_INVESTORS, POOL_COMPANY_RESERVE, POOL_USER_ADOPTION, POOL_TEAM, POOL_ADVISORS, POOL_PROMO}

    using SafeMath for uint;

    mapping (uint => PoolInfo) poolMap;

    struct PoolInfo {
        uint contribution;
        uint poolCap;
    }

    function PoolSegregationCrowdsale(uint _cap) {
        poolMap[uint(POOLS.POOL_STRATEGIC_INVESTORS)] = PoolInfo(0, _cap.mul(285).div(1000));
        poolMap[uint(POOLS.POOL_COMPANY_RESERVE)] = PoolInfo(0, _cap.mul(10).div(100));
        poolMap[uint(POOLS.POOL_USER_ADOPTION)] = PoolInfo(0, _cap.mul(20).div(100));
        poolMap[uint(POOLS.POOL_TEAM)] = PoolInfo(0, _cap.mul(3).div(100));
        poolMap[uint(POOLS.POOL_ADVISORS)] = PoolInfo(0, _cap.mul(3).div(100));
        poolMap[uint(POOLS.POOL_PROMO)] = PoolInfo(0, _cap.mul(3).div(100));
    }

    /**
     * @dev ensures minting tokens does not exceed the relevant pool size
     */ 
    modifier onlyIfInPool(uint amount, uint poolId) {
        PoolInfo poolInfo = poolMap[poolId];
        require(poolInfo.contribution.add(amount) <= poolInfo.poolCap); 
        _;
        poolInfo.contribution = poolInfo.contribution.add(amount);
    }

    /**
     * @dev increases the user adoption pool size with the remaining unsold tokens
     */ 
    function transferRemainingTokensToUserAdoptionPool(uint difference) internal {
        poolMap[uint(POOLS.POOL_USER_ADOPTION)].poolCap = poolMap[uint(POOLS.POOL_USER_ADOPTION)].poolCap.add(difference);
    }

    function getPoolCapSize(uint poolId) public view returns(uint) {
        return poolMap[poolId].poolCap;
    }
}