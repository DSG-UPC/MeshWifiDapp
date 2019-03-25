pragma solidity ^0.4.25;

import "./SimpleInternetAccess.sol";
import "contracts/helpers/Ownable.sol";


contract SimpleInternetAccessFactory is Ownable {
  mapping(address => address[]) deployedContractsbyProvider;
  mapping(address => address[]) deployedContractsbyClient;
  address public daoAddress;
  DAOInterface public DAOContract;
  address public erc20Address;

  constructor(address _daoAddress) public {
    daoAddress = _daoAddress;
    DAOContract =  DAOInterface(daoAddress);
    erc20Address = DAOContract.getERC20();
  }

  function getDAOAddress() public view returns (address) {
    return daoAddress;
  }

  function createContract(address _client, string _providerIP, uint _maxData, bytes32 _pubKey) public
    returns (address newContract)
  {
    newContract = new SimpleInternetAccess(_client, _providerIP,
      _maxData, msg.sender, daoAddress, erc20Address, _pubKey);
    deployedContractsbyProvider[msg.sender].push(newContract);
    deployedContractsbyClient[_client].push(newContract);
    return newContract;
  }

  function getDeployedContractsbyProvider() public view returns (address[]) {
    return deployedContractsbyProvider[msg.sender];
  }

  function getDeployedContractsbyClient() public view returns (address[] ) {
    return deployedContractsbyClient[msg.sender];
  }

  function kill() public {
    if (msg.sender == Ownable.owner) selfdestruct(owner);
  }

  function killContract(address _contract) public{
    require(msg.sender == Ownable.owner, "Only the owner can perform this operation");
    SimpleInternetAccess todie = SimpleInternetAccess(_contract);
    todie.kill();
    //TODO remove contract from local Factory structure

  }
}
