pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title WhiteListRegistry
 * @dev A whitelist registry contract that holds the list of addreses that can participate in the crowdsale.
 * Owner cand add and remove addresses to whitelist.
 */

contract WhiteListRegistry is Ownable {

    mapping (address => WhiteListInfo) public whitelist;
    using SafeMath for uint;

    struct WhiteListInfo {
        bool whiteListed;
        uint minCap;
        uint maxCap;
    }

    event AddedToWhiteList(
        address contributor,
        uint minCap,
        uint maxCap
    );

    event RemovedFromWhiteList(
        address _contributor
    );

    function addToWhiteList(address _contributor, uint _minCap, uint _maxCap) public onlyOwner {
        require(_contributor != address(0));
        whitelist[_contributor] = WhiteListInfo(true, _minCap, _maxCap);
        AddedToWhiteList(_contributor, _minCap, _maxCap);
    }

    function removeFromWhiteList(address _contributor) public onlyOwner {
        require(_contributor != address(0));
        delete whitelist[_contributor];
        RemovedFromWhiteList(_contributor);
    }

    function isWhiteListed(address _contributor) public view returns(bool) {
        return whitelist[_contributor].whiteListed;
    }

    function isAmountAllowed(address _contributor, uint _amount) public view returns(bool) {
       return whitelist[_contributor].maxCap >= _amount && whitelist[_contributor].minCap <= _amount && isWhiteListed(_contributor);
    }

}
