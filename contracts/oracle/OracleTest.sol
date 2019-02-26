pragma solidity ^0.4.25;
//
// An example client calling our oracle service
//
import "./OracleAPI.sol";

contract OracleTest is usingOracle {
  uint256 public response;
  string public entity;
  bytes32 public id;
  string public entryId;
  bool _exists;
  string _originator_;
  string _mint;
  string _register;
  string _deviceExists;
  string _deviceType_;
  string _deviceActivate;
  uint256 _traffic;

  constructor(address _lookupContract) usingOracle(_lookupContract) public{}

  function getExists() public view returns(bool){
    return _exists;
  }

  function getMint() public view returns(string){
    return _mint;
  }

  function getRegister() public view returns(string){
    return _register;
  }

  function getDeviceExists() public view returns(string){
    return _deviceExists;
  }

  function getDeviceActivate() public view returns(string){
    return _deviceActivate;
  }

  function getDeviceType() public view returns(string){
    return _deviceType_;
  }

  function getTraffic() public view returns(uint256){
    return _traffic;
  }

  function __oracleCallback(uint256 _response, string _originator) onlyFromOracle public {
    _traffic = _response;
    _originator_ = _originator;
  }

  function __nodeRegisterCallback(string _response) onlyFromOracle public {
    _register = _response;
  }

  function __nodeMintCallback(string _response) onlyFromOracle public {
    _mint = _response;
  }

  function __nodeExistsCallback(bool _response, string _device) onlyFromOracle public {
    _exists = _response;
    _deviceExists = _device;
  }

  function __nodeActivateGWCallback(string _deviceType, string _device) onlyFromOracle public {
    _deviceActivate = _device;
    _deviceType_ = _deviceType;
  }

  function mint(string _json) public {
    id = queryOracle('nodedb^mint', msg.sender, _json);
  }

  function register(string _json) public {
    id = queryOracle('nodedb^register', msg.sender, _json);
  }

  function activateGW(string _json) public {
    id = queryOracle('nodedb^activateGW', msg.sender, _json);
  }

  function exists(string _json) public {
    id = queryOracle('nodedb^exists', msg.sender, _json);
  }

  function monitor(string _query) public {
    id = queryOracle('monitor', msg.sender, _query);
  }
}
