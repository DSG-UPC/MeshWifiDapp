pragma solidity ^0.4.25;

import "contracts/DAO.sol";
import "contracts/tokens/EIP20Interface.sol";
import "contracts/helpers/CRUD.sol";
// We need to import OracleAPI to be able to communicate
// with the oracle
import "contracts/oracle/OracleAPI.sol";

contract Forwarding is usingOracle{

    mapping(address => uint256) public debt;
    mapping(address => uint256) public amount_per_provider;
    mapping(address => bool) public is_provider_added;
    mapping(uint => address) public providers;
    address public reserve_account;
    uint public total_owed_iteration;
    uint public num_providers;
    DAO public dao;
    EIP20Interface token;

    constructor(address _DAOAddress) usingOracle(_DAOAddress) public {
        dao =  DAO(_DAOAddress);
        token = EIP20Interface(dao.getERC20());
        reserve_account = address(this);
        total_owed_iteration = 0;
        num_providers = 0;
    }

    function getTotalOwed() public view returns (uint owed){
        return total_owed_iteration;
    }

    function getProvider(uint index) public view returns (address provider){
        return providers[index];
    }
    
    function startPayment() public {
        require(num_providers > 0, "No providers requested money");
        uint reserve_funds = token.balanceOf(reserve_account);
        // int balance = reserve_funds - total_owed_iteration;
        address current_provider;
        if (int(reserve_funds - total_owed_iteration) >= 0) {
            while(num_providers > 0){
                current_provider = providers[num_providers-1];
                transferMoney(current_provider, amount_per_provider[current_provider]);
                debt[current_provider] = 0;
                clearProvider(current_provider);
                num_providers--;
            }
        } else {
            while(num_providers > 0){
                current_provider = providers[num_providers-1];
                calculateProportional(current_provider, reserve_funds);
                num_providers--;
            }
        }
        recalculateMaxPrice(total_owed_iteration, reserve_funds);
        total_owed_iteration = 0;
    }

    function clearProvider(address current_provider) private {
        amount_per_provider[current_provider] = 0;
        is_provider_added[current_provider] = false;
        delete providers[num_providers-1];
    }

    function transferMoney(address current_provider, uint value) private{
        token.approve(current_provider, value);
        token.transfer(current_provider, value);
    }

    /*
    * Oracle calling methods
    */

    function getInvoice(string ip) public {
        queryOracle('forwarding', msg.sender, ip);
    }

    function calculateProportional(address provider, uint funds) private {
        _queryOracle('calculate_proportional', provider, amount_per_provider[provider], funds, total_owed_iteration);
    }

    function recalculateMaxPrice(uint total_owed, uint reserve_funds) private {
        _queryOracle('recalculate_max_price', msg.sender, total_owed, reserve_funds, dao.getPricePerMB());
    }

    /*
    * Oracle callbacks
    */

    function __forwardingCallback(uint256 _response, address _provider) onlyFromOracle public {
        require(!is_provider_added[_provider], 'This provider has already requested forwarding for this iteration');
        providers[num_providers] = _provider;
        is_provider_added[_provider] = true;
        num_providers++;
        amount_per_provider[_provider] = _response * dao.getPricePerMB() + debt[_provider];
        total_owed_iteration += amount_per_provider[_provider];
    }

    function __priceCalculatorCallback(uint _response) onlyFromOracle public {
        dao.setPricePerMB(_response);
    }

    function __proportionalCallback(address _provider, uint _response) onlyFromOracle public {
        transferMoney(_provider, _response);
        debt[_provider] = amount_per_provider[_provider] - _response;
        clearProvider(_provider);
    }
}
