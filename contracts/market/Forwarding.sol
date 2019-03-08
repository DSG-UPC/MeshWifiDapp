pragma solidity ^0.4.25;

import "contracts/DAO.sol";
import "contracts/tokens/EIP20Interface.sol";
import "contracts/helpers/CRUD.sol";
// We need to import OracleAPI to be able to communicate
// with the oracle
import "contracts/oracle/OracleAPI.sol";

contract Forwarding is usingOracle{

    mapping(address => uint256) private debt;
    mapping(address => uint256) private amount_per_provider;
    mapping(address => bool) private is_provider;
    address[] providers;
    DAO public dao;
    uint private total_owed;
    uint private num_providers;
    address public eip20;
    address public entity;

    constructor(address _DAOAddress)
        usingOracle(_DAOAddress) public {
        dao =  DAO(_DAOAddress);
        eip20 = dao.getERC20();
        entity = dao.getReserveAccount();
        total_owed = 0;
        num_providers = 0;
    }
    
    function getInvoice(string ip) public {
        // We are omitting the database update with the timestamp by now.
        // Let's suppose all clients request to get paid at the same time.
        queryOracle('forwarding', msg.sender, ip);
    }
    
    function startPayment() public {
        EIP20Interface token = EIP20Interface(eip20);
        uint reserve_funds = token.balanceOf(entity);
        uint balance = reserve_funds - total_owed;
        if (balance >= 0) {
            while(num_providers > 0){
                token.transfer(providers[0], amount_per_provider[providers[0]]);
                debt[providers[0]] = 0;
                is_provider[providers[0]] = false;
                delete providers[0];
                num_providers -= 1;
            }
            recalculate_max_price(reserve_funds);
        } else {
            while(num_providers > 0){
                uint proportional = amount_per_provider[providers[0]] * reserve_funds / total_owed;
                token.transfer(providers[0], proportional);
                debt[providers[0]] = amount_per_provider[0] - proportional;
                is_provider[providers[0]] = false;
                delete providers[0];
                num_providers -= 1;
            }
            recalculate_max_price(reserve_funds);
        }
    }

    function recalculate_max_price(uint reserve_funds) private {
        uint threshold = 5;
        uint balance = reserve_funds - total_owed;
        uint old_max_price = dao.getPricePerMB();
        if (balance > 0) {
            if (1 - total_owed / reserve_funds >= threshold / 100) {
                // We raise the max_price_per_mb
                uint raise = (1 - (total_owed / reserve_funds));
                old_max_price += old_max_price * raise;
            } else {
                // We reduce the max_price_per_mb
                uint reduce = (total_owed / reserve_funds - 1);
                old_max_price -= old_max_price * reduce;
            }
            dao.setPricePerMB(old_max_price);
        }
    }

    function __forwardingHandler(uint256 _response, address _provider) onlyFromOracle public {
        if(!is_provider[_provider]){
            is_provider[_provider] = true;
            providers.push(_provider);
            num_providers += 1;
            amount_per_provider[_provider] = _response * dao.getPricePerMB() + debt[_provider];
        } else{
            amount_per_provider[_provider] += _response * dao.getPricePerMB() + debt[_provider];
        }
        total_owed += amount_per_provider[_provider];
    }
}
