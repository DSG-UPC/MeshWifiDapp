pragma solidity ^0.4.25;

import "contracts/DAOInterface.sol";
import "contracts/tokens/EIP20Interface.sol";
import "contracts/helpers/CRUD.sol";
import "contracts/tokens/MyERC721.sol";
// We need to import OracleAPI to be able to communicate
// with the oracle
import "contracts/oracle/OracleAPI.sol";

contract Forwarding is usingOracle{

    mapping(address => uint256) private debt;
    mapping(address => uint256) private amount_per_provider;
    address[] private providers;
    DAOInterface public DAO;
    uint private total_owed;
    address public eip20;
    address public erc721;
    address public entity;

    constructor(address _DAOAddress, address _centralEntity)
        usingOracle(_DAOAddress) public {
        DAO =  DAOInterface(_DAOAddress);
        eip20 = DAO.getERC20();
        erc721 = DAO.getERC721();
        entity = DAO.getReserveAccount();
        total_owed = 0;
    }
    
    function getInvoice(string ip) public {
        // We are omitting the database update with the timestamp by now.
        // Let's suppose all clients request to get paid at the same time.
        queryOracle('monitor', msg.sender, ip);
    }
    
    function startPayment() public {
        uint reserve_funds = eip20.balanceOf(entity);
        uint balance = reserve_funds - total_owed;
        if (balance >= 0) {
            while(providers.length > 0){
                eip20.transfer(providers[0], amount_per_provider[providers[0]]);
                debt[providers[0]] = 0;
                delete providers[0];
            }
            recalculate_max_price();
        } else {
            while(providers.length > 0){
                uint proportional = amount_per_provider[providers[0]] * reserve_funds / total_owed;
                eip20.transfer(providers[0], proportional);
                debt[providers[0]] = amount_per_provider[0] - proportional;
                delete providers[0];
            }
            recalculate_max_price();
        }
    }

    function recalculate_max_price() private {
        uint threshold = 5;
        uint balance = reserve_funds - total_owed;
        uint old_max_price = DAO.getPricePerMB();
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
            DAO.setPricePerMB(old_max_price);
        }
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

    function __oracleCallback(uint256 _response, string _originator) onlyFromOracle public {
        providers.push(originator);
        amount_per_provider[originator] += _response * DAO.getPricePerMB() + debt[originator];
        total_owed += amount_per_provider[originator];
    }
}
