pragma solidity ^0.4.18;


import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract FinalizableCappedCrowdsale is CappedCrowdsale, Ownable {

    bool public isFinalized = false;
    bool public reconciliationDateSet = false;
    uint public reconciliationDate = 0;

    event Finalized();

    /**
     * @dev Must be called after crowdsale ends, to do some extra finalization
     * work. Calls the contract's finalization function.
     */
    function finalize() onlyOwnerOrAfterReconciliation public {
        require(!isFinalized);
        require(hasEnded());

        finalization();
        Finalized();
        isFinalized = true;
    }

    function setReconciliationDate(uint _reconciliationDate) onlyOwner {
        reconciliationDate = _reconciliationDate;
        reconciliationDateSet = true;
    }

    /**
     * @dev Can be overridden to add finalization logic. The overriding function
     * should call super.finalization() to ensure the chain of finalization is
     * executed entirely.
     */
    function finalization() internal {
    }

    /**
     * @dev ensures finalization is delayed so that we can perform reconciliation
     */ 
    modifier onlyOwnerOrAfterReconciliation() {
        require(msg.sender == owner || (reconciliationDate <= now && reconciliationDateSet));
        _;
    }
}