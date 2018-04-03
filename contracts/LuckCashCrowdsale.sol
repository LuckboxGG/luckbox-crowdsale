pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/crowdsale/FinalizableCrowdsale.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./LuckCashToken.sol";
import "./WhiteListRegistry.sol";
import "./FinalizableCappedCrowdsale.sol";
import "./PoolSegregationCrowdsale.sol";
import "./VestingFund.sol";

/**
 * @title Luck Token Crowdsale contract - crowdsale contract for the luck tokens.
 */

contract LuckCashCrowdsale is FinalizableCappedCrowdsale, PoolSegregationCrowdsale {

    // whitelist registry contract
    WhiteListRegistry public whitelistRegistry;
    using SafeMath for uint;
    uint constant public CAP = 600000000*1e18;
    mapping (address => uint) contributions;

    /**
     * event for token vest fund launch
     * @param beneficiary who will get the tokens once they are vested
     * @param fund vest fund that will received the tokens
     * @param tokenAmount amount of tokens purchased
     */
    event VestedTokensFor(address indexed beneficiary, address fund, uint256 tokenAmount);
    
    /**
     * event for finalize function call at the end of the crowdsale
     */
    event Finalized();    

    /**
     * event for token minting for private investors
     * @param beneficiary who will get the tokens once they are vested
     * @param tokenAmount amount of tokens purchased
     */
    event MintedTokensFor(address indexed beneficiary, uint256 tokenAmount);

    /**
     * @dev Contract constructor function
     * @param _startTime The timestamp of the beginning of the crowdsale
     * @param _endTime Timestamp when the crowdsale will finish
     * @param _rate The token rate per ETH
     * Percent value is saved in crowdsalePercent.
     * @param _wallet Multisig wallet that will hold the crowdsale funds.
     * @param _whiteListRegistry Address of the whitelist registry contract
     */
    function LuckCashCrowdsale(uint256 _startTime, uint256 _endTime, uint256 _rate, address _wallet, address _whiteListRegistry) public
    CappedCrowdsale(CAP.mul(325).div(1000))
    PoolSegregationCrowdsale(CAP)
    FinalizableCappedCrowdsale()
    Crowdsale(_startTime, _endTime, _rate, _wallet)
    {
        require(_whiteListRegistry != address(0));
        whitelistRegistry = WhiteListRegistry(_whiteListRegistry);
        LuckCashToken(token).pause();
    }

    /**
     * @dev Creates LuckCashToken contract. This is called on the Crowdsale contract constructor 
     */
    function createTokenContract() internal returns(MintableToken) {
        return new LuckCashToken(CAP); // 600 million cap
    }

    /**
     * @dev Mintes fresh token for a private investor.
     * @param beneficiary The beneficiary of the minting
     * @param amount The total token amount to be minted
     */
    function mintTokensFor(address beneficiary, uint256 amount, uint poolId) external onlyOwner onlyIfInPool(amount, poolId) {
        require(beneficiary != address(0) && amount != 0);

        token.mint(beneficiary, amount);

        MintedTokensFor(beneficiary, amount);
    }

    /**
     * @dev Creates a new contract for a vesting fund that will release funds for the beneficiary every quarter
     * @param beneficiary The beneficiary of the funds
     * @param amount The total token amount to be vested
     * @param quarters The number of quarters over which the funds will vest. Every quarter a sum equal to amount.quarters will be release
     */
    function createVestFundFor(address beneficiary, uint256 amount, uint256 quarters, uint poolId) external onlyOwner onlyIfInPool(amount, poolId) {
        require(beneficiary != address(0) && amount != 0);
        require(quarters > 0);

        VestingFund fund = new VestingFund(beneficiary, endTime, quarters, token); // the vesting period starts when the crowdsale has ended
        token.mint(fund, amount);

        VestedTokensFor(beneficiary, fund, amount);
    }

    /**
     * @dev overrides Crowdsale#validPurchase to add whitelist logic
     * @return true if buyers is able to buy at the moment
     */
    function validPurchase() internal view returns(bool) {
        return super.validPurchase() && canContributeAmount(msg.sender, msg.value);
    }

    /**
     * @dev transfers unsold tokens to the user adoption pool
     */ 
    function transferFromCrowdsaleToUserAdoptionPool() public onlyOwner {
        require(now > endTime);
        
        super.transferRemainingTokensToUserAdoptionPool(super.getTokenAmount(cap) - super.getTokenAmount(weiRaised));
    }
    
    /**
     * @dev finalizes crowdsale
     */ 
    function finalization() internal {
        token.finishMinting();
        LuckCashToken(token).unpause();

        wallet.transfer(this.balance);

        super.finalization();
    }

    /**
     * @dev overrides Crowdsale#forwardFunds to report of funds transfer and not transfer into the wallet untill the end
     */
    function forwardFunds() internal {
        reportContribution(msg.sender, msg.value);
    }

    /**
     * @dev checks that the user is whitelisted and within the min/max caps
     */ 
    function canContributeAmount(address _contributor, uint _amount) internal view returns (bool) {
        uint totalAmount = contributions[_contributor].add(_amount);
        return whitelistRegistry.isAmountAllowed(_contributor, totalAmount);  
    }

    /**
     * @dev keeps track of contributions per user
     */ 
    function reportContribution(address _contributor, uint _amount) internal returns (bool) {
       contributions[_contributor] = contributions[_contributor].add(_amount);
    }
}
