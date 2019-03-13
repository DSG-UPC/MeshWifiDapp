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
    address[] public providers;
    uint public total_owed_iteration;
    uint public num_providers;
    DAO public dao;
    address public eip20;
    address public reserve_account;
    uint public new_money;

    constructor(address _DAOAddress)
        usingOracle(_DAOAddress) public {
        dao =  DAO(_DAOAddress);
        eip20 = dao.getERC20();
        reserve_account = dao.getReserveAccount();
        total_owed_iteration = 0;
        num_providers = 0;
        new_money = 1;
    }
    
    function getInvoice(string ip) public {
        // We are omitting the database update with the timestamp by now.
        // Let's suppose all clients request to get paid at the same time.
        queryOracle('forwarding', msg.sender, ip);
    }
    
    function startPayment() public {
        EIP20Interface token = EIP20Interface(eip20);
        uint reserve_funds = token.balanceOf(reserve_account);
        uint balance = reserve_funds - total_owed_iteration;
        if (balance >= 0) {
            while(num_providers > 0){
                //token.transfer(providers[0], amount_per_provider[providers[0]]);
                //reserve_funds = token.balanceOf(reserve_account);
                amount_per_provider[providers[0]] = 0;
                debt[providers[0]] = 0;
                is_provider_added[providers[0]] = false;
                delete providers[0];
                num_providers--;
            }
        } else {
            while(num_providers > 0){
                uint proportional = amount_per_provider[providers[0]] * reserve_funds / total_owed_iteration;
                //token.transfer(providers[0], proportional);
                //reserve_funds = token.balanceOf(reserve_account);
                debt[providers[0]] = amount_per_provider[0] - proportional;
                amount_per_provider[providers[0]] = 0;
                is_provider_added[providers[0]] = false;
                delete providers[0];
                num_providers--;
            }
        }
        recalculateMaxPrice(reserve_funds, balance);
        total_owed_iteration = 0;
    }

    function recalculateMaxPrice(uint reserve_funds, uint balance) public{
        uint precision = 10 ** numDigits(total_owed_iteration);
        uint threshold = precision - 5 * precision / 100; // 0.95
        uint old_max_price = dao.getPricePerMB();
        uint new_max_price = old_max_price;
        if (balance >= 0) {
            if(threshold * reserve_funds >= total_owed_iteration * precision){
                // We raise the max_price_per_mb
                // uint raise = (1 - (total_owed_iteration / reserve_funds));
                // uint raise = threshold * total_owed_iteration / reserve_funds;
                // new_max_price += old_max_price * raise / precision;
                new_max_price *= reserve_funds / total_owed_iteration;
            }
        } else {
            // We reduce the max_price_per_mb
            // uint reduce = (total_owed_iteration / reserve_funds - 1);
            // uint reduce = threshold * reserve_funds / total_owed_iteration;
            // new_max_price -= old_max_price * reduce / precision;
            new_max_price /=  total_owed_iteration / reserve_funds;
            if(new_max_price < 1)
                new_max_price = 1;
        }
        new_money = new_max_price;
        dao.setPricePerMB(new_max_price);
    }

    function __forwardingCallback(uint256 _response, address _provider) onlyFromOracle public {
        require(!is_provider_added[_provider], 'This provider has already requested forwarding for this iteration');
        providers.push(_provider);
        is_provider_added[_provider] = true;
        num_providers += 1;
        amount_per_provider[_provider] = _response * dao.getPricePerMB() + debt[_provider];
        total_owed_iteration += amount_per_provider[_provider];
    }

    /**
    * This will be used to calculate the precision level
    * we want to achieve, we want to use as larger precision
    * as possible for the initial calculations.
    */
    function numDigits(uint number) private pure returns (uint) {
        uint digits = 0;
        while (number > 0) {
            number /= 10;
            digits++;
        }
        return digits;
    }
}
