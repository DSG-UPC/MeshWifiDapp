pragma solidity ^0.4.25;

/**
* @title Maintance of list of Available gateways
* @dev see https://bitbucket.org/rhitchens2/soliditycrud
*/

contract CRUDFactory{

  address routers;
  address gateways;

  constructor() public {
      routers = new CRUD('router');
      gateways = new CRUD('gateway');
  }

  function getRouters() public view returns (address addr){
      return routers;
    }

  function getGateways() public view returns (address addr){
      return gateways;
  }

}

contract CRUD{

  //enum DeviceTypes {Router, Gateway}
  //DeviceTypes devices;
  //DeviceTypes constant defaultChoice = DeviceTypes.Router;
  string devicesType = "router";

  struct crudStruct {
    uint256 uid;
    address addr;
    string ip;
    uint index;
  }

  mapping(string => crudStruct) private crudStructs;
  mapping(uint256 => string) public IDtoIP;
  string[] private crudIndex;

  event LogNew(string indexed ip, uint index, address  addr, uint  uid, string devicesType);
  event LogUpdate(string indexed ip, uint index, address  addr, uint  uid,  string devicesType);
  event LogDelete(string indexed ip, uint index, address  addr,  string devicesType);

  constructor(string _type) public {
    devicesType = _type;
  }

  function exists(string  ip)
    public
    view
    returns(bool isIndeed)
  {
    if( crudIndex.length == 0) return false;
    return ( compareStrings(crudIndex[crudStructs[ip].index], ip));
  }

  function add(
    string ip,
    address addr,
    uint256 uid)
    public
    returns(uint index)
  {
    require(!exists(ip));
    crudStructs[ip].ip = ip;
    crudStructs[ip].addr = addr;
    crudStructs[ip].uid   = uid;
    crudStructs[ip].index     = crudIndex.push(ip)-1;
    IDtoIP[uid] = ip;
    emit LogNew(
        ip,
        crudStructs[ip].index,
        addr,
        uid,
        devicesType);
    return crudIndex.length-1;
  }

  function del(string ip)
    public
    returns(uint index)
  {
    require(exists(ip));
    uint rowToDelete = crudStructs[ip].index;
    address addr = crudStructs[ip].addr;
    uint256 uid = crudStructs[ip].uid;
    string storage keyToMove = crudIndex[crudIndex.length-1];
    crudIndex[rowToDelete] = keyToMove;
    crudStructs[keyToMove].index = rowToDelete;
    crudIndex.length--;
    IDtoIP[uid] = '';
    emit LogDelete(
        ip,
        rowToDelete,
        addr,
        devicesType);
    emit LogUpdate(
        keyToMove,
        rowToDelete,
        crudStructs[keyToMove].addr,
        crudStructs[keyToMove].uid,
        devicesType);
    return rowToDelete;
  }

  function getByIP(string ip)
    public
    constant
    returns(uint uid, uint index, address addr)
  {
    require(exists(ip));
    return(
      crudStructs[ip].uid,
      crudStructs[ip].index,
      crudStructs[ip].addr);
  }

  function getByUID(uint256 uid)
    public
    constant
    returns(string ip, uint index, address addr)
  {
    string storage _ip = IDtoIP[uid];
    require(!compareStrings(_ip,'') && exists(_ip));
    return(
      _ip,
      crudStructs[_ip].index,
      crudStructs[_ip].addr);
  }

  /*
  function updateAddress(address addr, string ip)
    public
    returns(bool success)
  {
    require(exists(ip));
    crudStructs[ip].addr = addr;
    emit LogUpdate(
      ip,
      crudStructs[ip].index,
      addr,
      crudStructs[ip].uid,
      devicesType);
    return true;
  }*/


  function getCount()
    public
    view
    returns(uint count)
  {
    return crudIndex.length;
  }

  function getAtIndex(uint index)
    public
    view
    returns(string ip)
  {
    return crudIndex[index];
  }

  function compareStrings (string a, string b) public pure returns (bool){
       return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
   }

}
