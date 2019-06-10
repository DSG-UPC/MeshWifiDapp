pragma solidity ^0.4.25;

import "contracts/DAO.sol";
import "contracts/tokens/EIP20Interface.sol";
import "contracts/helpers/CRUD.sol";
import "contracts/oracle/OracleAPI.sol";

contract Forwarding is usingOracle{

    mapping(address => uint256) public debt;
    mapping(address => uint256) public amount_per_provider;
    mapping(address => uint256) public price_per_provider;
    mapping(address => uint256) public benefit_per_provider;
    mapping(address => uint256) public amount_MB_per_provider;
    mapping(address => uint) public devices_per_provider;
    mapping(address => bool) public is_provider_added;
    mapping(uint256 => bool) public is_device_added;
    mapping(uint => uint256) public device_indexes;
    mapping(uint => address) public providers;
    address public reserve_account;
    uint public total_owed_iteration;
    uint public total_MB_iteration;
    uint public num_providers;
    uint public num_devices;
    DAO public dao;
    EIP20Interface token;

    constructor(address _DAOAddress) usingOracle(_DAOAddress) public {
        dao =  DAO(_DAOAddress);
        token = EIP20Interface(dao.getERC20());
        reserve_account = address(this);
        total_owed_iteration = 0;
        total_MB_iteration = 0;
        num_providers = 0;
        num_devices = 0;
    }

    function getTotalOwed() public view returns (uint owed){
        return total_owed_iteration;
    }

    function getProvider(uint index) public view returns (address provider){
        return providers[index];
    }

    function getDebt(address provider) public view returns (uint256 result){
        return debt[provider];
    }


    // It starts by checking if any provider requested to receive the payments, if no providers
    // asked about this it makes no sense to continue with the payment.
    //
    // Then, it checks if any provider requested to receive the payments, if no providers asked
    // about this it makes no sense to continue with the payment.
    //
    // By design, in our implementation it is not possible that the Reserve funds run out of tokens,
    // because we start with a 10^{14} (coded in the migration files 3_deploy_tokens.js
    // and 5_deploy_forwarding.js), so the providers will always be able to get the owed amount.
    // Finally the information of the providers and devices used in this iteration is removed
    //  from the contract (externalized in clearProvider method).
    function startPayment() public {
        require(num_providers > 0, "No providers requested money");
        uint reserve_funds = token.balanceOf(reserve_account);
        address current_provider;
        if (int(reserve_funds - total_owed_iteration) >= 0) {
            while(num_providers > 0){
                current_provider = providers[num_providers-1];
                token.transfer(current_provider, benefit_per_provider[current_provider]);
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
        //recalculateMaxPrice(total_owed_iteration, reserve_funds);
        total_owed_iteration = 0;
        total_MB_iteration = 0;
        for(uint i=0;i<num_devices;i++){
            is_device_added[device_indexes[i]] = false;
        }
        num_devices = 0;

    }

    function clearProvider(address current_provider) private {
        amount_per_provider[current_provider] = 0;
        price_per_provider[current_provider] = 0;
        benefit_per_provider[current_provider] = 0;
        amount_MB_per_provider[current_provider] = 0;
        devices_per_provider[current_provider] = 0;
        is_provider_added[current_provider] = false;
        delete providers[num_providers-1];
    }

    ///// ORACLE CALLING METHODS /////

    /*
     * This is the entry point of the contract. The provider notifies the contract that he wants to
     * receive the payment for the last period of forwarding. As we need to get the monitored data from
     * the provider's node, we need to ask the Oracle for this purpose. This method will be resolved in
     * __forwardingCallback.
     */
    function getInvoice(string ip) public {
        queryOracle('forwarding', msg.sender, ip);
    }


    // There is one method for each of the price/MB calculation option Fair, Unbounded and
    // Fixed price. The provider (identified by its Ethereum address) notifies the contract that
    // he wants to receive the payment for the last period of forwarding. The monitoring values are
    // already retrieved, so the contract calls the Oracle to calculate the price/MB for this provider,
    // taking into account the state of the network (number of devices and providers in total and number
    // of devices accounted owned by this provider during this iteration. The final calculus of the
    // benefit of the provider is calculated in __pricePerProviderCalculatorCallback.
    function getInvoiceByAddress(address provider) public {
        _queryOracle('calculate_price_per_provider', provider, devices_per_provider[provider], num_devices, num_providers);
    }
    function getInvoiceByAddressNoMax(address provider) public {
        _queryOracle('calculate_price_per_provider_no_max', provider, devices_per_provider[provider], num_devices, num_providers);
    }
    function getInvoiceByAddressFixed(address provider) public {
        _queryOracle('calculate_price_per_provider_fixed', provider, devices_per_provider[provider], num_devices, num_providers);
    }


    // This is the entry point of the contract. The provider notifies the contract that he wants to get the monitored forwarded
    // MB by a given device (identified with the device id provided by the system) for the last period of forwarding (indicated
    // by the iteration number). As we need to get the monitored data from the provider's node, we need to ask the Oracle for
    // this purpose. This method will be resolved in __forwardingCallback.
    function getMonitoringValues(string query) public {
        queryOracle('forwarding_fake', msg.sender, query);
    }

    /*
     * This method generates an event received by the Oracle to calculate the proportional value according to the values
     * it sends as parameters in _queryOracle.
     *
     * This is resolved in __proportionalCallback.
     */
    function calculateProportional(address provider, uint funds) private {
        _queryOracle('calculate_proportional', provider, amount_per_provider[provider], funds, total_owed_iteration);
    }

    /*
     * Once the payment process finishes we need to calculate the new price for the MB, such that the result for the next
     * iteration helps us to reduce (or remove) the debts with the providers (if they exist) and to keep as less tokens
     * as possible in the contract (there is a threshold of 5%).
     * The idea is that the amount of tokens owed to the providers in each iteration, and the tokens paid for the internet
     * access per iteration, are as close as possible, so that we can ensure a zero sum game.
     *
     * The response for this method is receive in __priceCalculatorCallback.
     */
    function recalculateMaxPrice(uint total_owed, uint reserve_funds) private {
        _queryOracle('recalculate_max_price', msg.sender, total_owed, reserve_funds, dao.getPricePerMB());
    }


    ///// ORACLE CALLBACKS /////


    /*
     * The first callback. Once a device requests to be included for the compensation distribution at this iteration:
     * - First of all, we must check that this device was not already included for this iteration.
     * - When this is done, we add the device to the list of devices and increase the number of devices in 1.
     * - Then, we need to update the amount of forwarded MB by that provider, that is, adding the MBs forwarded by this device
     *   to the accumulated forwarded amount by the provider.

     * - Finally, we add this amount to the total owed (for all providers) in this iteration.
     */
    function __forwardingCallback(uint256 _response, address _provider, uint256 _deviceid) onlyFromOracle public {
        require(_provider != 0x0, "This provider address is not a valid one");
        require(!is_device_added[_deviceid], 'This device has already requested forwarding for this iteration');
        if (!is_provider_added[_provider]){
          providers[num_providers] = _provider;
          is_provider_added[_provider] = true;
          num_providers++;
          amount_MB_per_provider[_provider] = 0;
          devices_per_provider[_provider] = 0;
        }
        is_device_added[_deviceid] = true;
        device_indexes[num_devices] = _deviceid;
        num_devices++;
        //uint added = _response * dao.getPricePerMB() + debt[_provider];
        uint added = _response;
        amount_MB_per_provider[_provider] += added;
        devices_per_provider[_provider] += 1;
        total_MB_iteration += added;
    }

    function __priceCalculatorCallback(uint _response) onlyFromOracle public {
        dao.setPricePerMB(_response);
    }


    // This function receives a provider (Ethereum address) and its price/MB, and calculates the amount
    // of tokens that corresponds to a provider (price/MB * amount_MB_forwarded). Then, the benefit
    // that the provider makes, which is the amount of tokens that corresponds to it minus the cost of
    // maintaining the devices. The cost of maintaining the devices is implicit in the price/MB, and it
    // is the 90% of the calculated tokens with price_{min}. The calculated benefit is the amount of
    // tokens that will be paid to the provider.
    function __pricePerProviderCalculatorCallback(uint256 _response, address _provider) onlyFromOracle public {
        require(_provider != 0x0, "This provider address is not a valid one");
        amount_per_provider[_provider] = _response * amount_MB_per_provider[_provider];
        benefit_per_provider[_provider] = amount_per_provider[_provider] - ((dao.getMinPricePerMB() * amount_MB_per_provider[_provider] * 9 )/ 10); // Benefit: Amount - cost. Cost = 90% * amount with price_min
        price_per_provider[_provider] = _response;
        total_owed_iteration += benefit_per_provider[_provider];
    }


    /*
     * Once received the proportional value, it is transferred to the corresponding provider and the
     * debt is updated with the corresponding value.
     */
    function __proportionalCallback(address _provider, uint _response) onlyFromOracle public {
        token.transfer(_provider, _response);
        debt[_provider] = amount_per_provider[_provider] - _response;
        clearProvider(_provider);
    }
}
