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

<<<<<<< HEAD
  function createContract(address _provider, string _providerIP,
    string _providerMonitor, uint _maxData)
=======
  function createContract(address _client, string _providerIP, uint _maxData,
                          bytes32 _pubKey)
>>>>>>> 6841d042c5ef5a1f868bafb56f9bd9353e0f0dd7
    public
    returns (address newContract)
  {
<<<<<<< HEAD
    address newContract = new SimpleInternetAccess(msg.sender, _providerIP,
      _providerMonitor, _maxData, provider, daoAddress,
      erc20Address);
=======
    newContract = new SimpleInternetAccess(_client, _providerIP,
      _maxData, msg.sender, daoAddress, erc20Address, _pubKey);
>>>>>>> 6841d042c5ef5a1f868bafb56f9bd9353e0f0dd7
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
    require(msg.sender == Ownable.owner);
    SimpleInternetAccess todie = SimpleInternetAccess(_contract);
    todie.kill();
    //TODO remove contract from local Factory structure

  }
}
