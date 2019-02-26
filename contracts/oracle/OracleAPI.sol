pragma solidity ^0.4.25;
//
// This is the API file to be included by a user of this oracle
//
import "contracts/DAOInterface.sol";


// This must match the signature in dispatch.sol
contract Oracle {
  function query(string _queryType, address _originator, string _query) public returns (bytes32);
}


// The actual part to be included in a client contract
contract usingOracle {
  //address constant lookupContract = 0xe7Da79C138848BB43b8C6D2b1fDEf7405F60CD52;
  address public lookupContract;

  constructor(address _lookupContract) internal {
    lookupContract = _lookupContract;
  }

  modifier onlyFromOracle() {
    DAOInterface lookup = DAOInterface(lookupContract);
    require(msg.sender == lookup.getOracleResponseAddress());
    _;
  }

  function queryOracle(string queryType, address originator, string query) public returns (bytes32) {
    DAOInterface lookup = DAOInterface(lookupContract);
    Oracle oracle = Oracle(lookup.getOracleQueryAddress());
    return oracle.query(queryType, originator, query);
  }
}
