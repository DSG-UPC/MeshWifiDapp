pragma solidity ^0.4.25;

import "contracts/DAOInterface.sol";
import "contracts/tokens/EIP20Interface.sol";
// We need to import OracleAPI to be able to communicate
// with the oracle
import "contracts/oracle/OracleAPI.sol";

contract Forwarding is usingOracle{

  DAOInterface public DAOContract;
  address public tokenContract;
  address public entity;
  EIP20Interface public token;

  constructor(address _DAOAddress, address _centralEntity)
        usingOracle(_DAOAddress) public {
      DAOContract =  DAOInterface(_DAOAddress);
      address erc20 = DAOContract.getERC20();
      token = EIP20Interface(erc20);
      entity = _centralEntity;
  }

  function getTokenContract() internal view returns (address){
      return tokenContract;
  }

  function nodeReporting(string _wallet) public {

      // We check that the device is minted into our node_db.
      // If it belongs to the db, it should return the type of
      // the device.
      queryOracle('forwarding', msg.sender, _wallet);
  }

  function __forwardingCallback(uint256 _response, address _originator) onlyFromOracle external {

      // Now we transfer the corresponding tokens to the router that requested
      // the forwarding. This part is crucial

      // First we need to approve that central entity can transfer tokens to
      // forwarding contract (is like the middleware in the main operation).
      token.approve(entity, address(this), _response);

      // Then we need to approve that the router performing the forwarding action
      // is able to receive tokens from the central entity.
      token.approve(entity, _originator, _response);

      // Finally we transfer the tokens to the router account.
      token.transferFrom(entity, _originator, _response);
  }

}
