pragma solidity ^0.4.25;

import "contracts/DAOInterface.sol";
import "contracts/tokens/EIP20Interface.sol";
import "contracts/market/SimpleInternetFactory.sol";
import "contracts/helpers/CRUD.sol";
import "contracts/tokens/MyERC721.sol";
// We need to import OracleAPI to be able to communicate
// with the oracle
import "contracts/oracle/OracleAPI.sol";

contract Forwarding is usingOracle{

    mapping(address => uint256) debt;
    DAOInterface public DAO;
    SimpleInternetFactory public factory;
    address public eip20;
    address public erc721;
    address public entity;

    constructor(address _DAOAddress, address _centralEntity)
        usingOracle(_DAOAddress) public {
        DAO =  DAOInterface(_DAOAddress);
        eip20 = DAO.getERC20();
        erc721 = DAO.getERC721();
        entity = DAO.getReserveAccount();
    }

    function getInvoices() public {
        MyERC721 erc = MyERC721(erc721);
        address[] providers;
        mapping(address => uint256) amount_per_provider;

        // Once we have 'providers' and 'amount_per_provider' filled with data

        uint balance = reserve_funds - total_amount;
        if (balance >= 0) {
            for (uint i = 0; i < providers.length; i++)
                eip20.transfer(providers[i], amount_per_provider[providers[i]]);
            recalculate_max_price(reserve_funds, total_amount);
        } else {
            for (uint i = 0; i < providers.length; i++) {
                uint proportional = (amount_per_provider[providers[i]] * reserve_funds / total_amount);
                eip20.transfer(p, proportional);
                debt[p] = amount_per_provider[p] - proportional;
            }
            recalculate_max_price(reserve_funds, total_amount);
        }
    }

    function recalculate_max_price (reserve_funds, total_amount) private {
    uint threshold = 5;
    uint balance = reserve_funds - total_amount;
    uint old_max_price = DAO.getPricePerMB();
    if (balance > 0) {
        if (1 - total_amount / reserve_funds >= threshold / 100) {
            //We raise the max_price_per_mb
            uint raise = (1 - (total_amount / reserve_funds)) / (threshold / 100);
            old_max_price += old_max_price * raise * (threshold / 100);
        } else {
            //We reduce the max_price_per_mb
            uint reduce = ((total_amount / reserve_funds) - 1) / threshold;
            old_max_price -= old_max_price * reduce * (threshold / 100);
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
}
