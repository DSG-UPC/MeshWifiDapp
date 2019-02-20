pragma solidity ^0.4.25;
//
// This is the API file to be included by a user of this oracle
//

// This must match the signature in dispatch.sol
contract Oracle {
  function query(string _queryType, address _originator, string _query) public returns (bytes32);
}

// This must match the signature in lookup.sol
contract OracleLookup {
  function getQueryAddress() public view returns (address);
  function getResponseAddress() public view returns (address);
}

// The actual part to be included in a client contract
contract usingOracle {
  //address constant lookupContract = 0xe7Da79C138848BB43b8C6D2b1fDEf7405F60CD52;
  address public lookupContract;

  constructor(address _lookupContract) internal {
    lookupContract = _lookupContract;
  }

  modifier onlyFromOracle() {
    OracleLookup lookup = OracleLookup(lookupContract);
    require(msg.sender == lookup.getResponseAddress());
    _;
  }

  function queryOracle(string queryType, address originator, string query) public returns (bytes32) {
    OracleLookup lookup = OracleLookup(lookupContract);
    Oracle oracle = Oracle(lookup.getQueryAddress());
    return oracle.query(queryType, originator, query);
  }
}
