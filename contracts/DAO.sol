pragma solidity ^0.4.25;


import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract DAO is Ownable {
  address public ERC20;
  address public ERC721;
  address public Owners;
  address public OracleQuery;
  address OracleResponse;
  uint256 public pricePerMB;


  constructor(uint256 _pricePerMB, address _OracleQuery)
    public
  {
    pricePerMB = _pricePerMB;
    OracleResponse = msg.sender;
    OracleQuery = _OracleQuery;
  }

  function setOracleQueryAddress(address _address)  public onlyOwner {
    OracleQuery = _address;
  }

  function getOracleQueryAddress() public view returns (address) {
    return OracleQuery;
  }

  function setOracleResponseAddress(address _address) public onlyOwner {
    OracleResponse = _address;
  }

  function getOracleResponseAddress() public view returns (address) {
    return OracleResponse;
  }

  function getERC20() public view returns(address) {
    return ERC20;
  }

  function setERC20(address _address) internal onlyOwner returns(bool) {
    ERC20 = _address;
    return true;
  }

  function setERC721(address _address) internal onlyOwner returns(bool) {
    ERC721 = _address;
    return true;
  }

  function getERC721() public view returns(address) {
    return ERC721;
  }

  function getOwners() public view returns(address) {
    return Owners;
  }

  function setOwners(address _address) internal onlyOwner returns(bool) {
    Owners = _address;
    return true;
  }

  function getPricePerMB() public view returns(uint256) {
    return pricePerMB;
  }

  function setPricePerMB(uint256 _pricePerMB) internal onlyOwner returns(bool) {
    pricePerMB = _pricePerMB;
    return true;
  }

}
