pragma solidity ^0.4.25;

import "contracts/oracle/OracleAPI.sol";
import "contracts/helpers/CRUD.sol";
import 'openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol';
import 'openzeppelin-solidity/contracts/token/ERC721/ERC721Mintable.sol';
//import "github.com/Arachnid/solidity-stringutils/strings.sol";

//TODO Import owners address from DAO
//???
//?import "contracts/helpers/Owners.sol";??
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract MyERC721 is ERC721Full, ERC721Mintable, Ownable, usingOracle {
  event LogCallback();
  uint constant MAX_STRING_SIZE = 8;

  CRUD routers;
  CRUD gateways;
  //CRUD routers = new CRUD('router');
  //CRUD gateways = new CRUD('gateway');

  constructor(string _name, string _symbol, address _lookupContract,
        address _crudrouter, address _crudgateway)
  ERC721Full(_name, _symbol)
  usingOracle(_lookupContract)
  public
  {
    routers = CRUD( _crudrouter);
    gateways = CRUD(_crudgateway);
  }


//DOC ways to secure that owner owns device for example sharing private key

  /**
   * Mint request to the oracle
   * @dev This function will initatiate the mint process for IPs that are not
   * already registered.
   * @param ip The ip address of the decice to be registered
  */
  function requestMint(string ip) external payable {
    //TODO how do we prevent users from repeatdly calling this function?
    //Making it payable is one option, but then we should consider that Ether
    //has value inside the network
    //Denies queries for existing MACs to save uncessary requests
    require(routers.exists(ip) == false);
    queryOracle('nodedb^mint',msg.sender, ip);
  }

  function activateGateway(string _ip) external {
    uint id;
    uint256 index;
    address addr;
    (id, index, addr) = routers.getByIP(_ip);
    require(_isApprovedOrOwner(msg.sender,id));
    gateways.add(_ip, addr, id);
  }

  function getGateways() external view returns(address gateway){
    return gateways;
  }

  function getRouters() external view returns(address gateway){
    return routers;
  }

  function __oracleCallback(uint256 _uid, string _ip, address _address, address _originator) onlyFromOracle external {
    emit LogCallback();
    routers.add(_ip, _address, _uid);
    _mint(_originator, _uid);
  }
}
