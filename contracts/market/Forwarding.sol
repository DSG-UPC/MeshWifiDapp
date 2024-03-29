pragma solidity ^0.4.25;

import "contracts/DAO.sol";
import "contracts/tokens/EIP20Interface.sol";
import "contracts/helpers/CRUD.sol";
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

    function getDebt(address provider) public view returns (uint256 result){
        return debt[provider];
    }
    
    /*
     * The most important method in this contract. Every period of time, this method will be called from an authorized
     * entity and the compensations payment will start:
     * - It starts by checking if any provider requested to receive the payments, if no providers asked about this
     *   it makes no sense to continue with the payment.
     * - Then we get the current balance (in tokens) of the contract account (the available funds).
     * - The next step consists in checking whether the contract can afford the total amount of tokens owed for this
     *   iteration or not.
     *      - If we can afford it, we proceed with the payment.
     *      - Else, we will not pay the whole owed amount to the owner, but a proportional part of it (in order for
     *        every provider to get at least a small amount of tokens). As this task requires precise mathematical
     *        operations, this calculus is performed by the Oracle (explained in calculateProportional).
     *        We need to keep track of the debt generated during this procedure with this provider.
     *      - Finally we also remove the current provider information from this contract (externalized in clearProvider
     *        method).
     *  - Once this process is finished, we need to recalculate the new price for the MB. This is a crucial part of
     *    the process because it helps to keep a zero sum game model in the system (if we have debt, we need to reduce
     *    pricePerMB, else we can raise it). This explanation continues in recalculateMaxPrice.
     */
    function startPayment() public {
        require(num_providers > 0, "No providers requested money");
        uint reserve_funds = token.balanceOf(reserve_account);
        address current_provider;
        if (int(reserve_funds - total_owed_iteration) >= 0) {
            while(num_providers > 0){
                current_provider = providers[num_providers-1];
                token.transfer(current_provider, amount_per_provider[current_provider]);
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
     * The first callback. Once a provider requests to be included for the compensation distribution at this iteration:
     * - First of all, we must check that this provider was not already included for this iteration.
     * - When this is done, we add the provider to the list of providers and increase the number or providers in 1.
     * - Then, we need to calculate the amount owed to that provider, that is, multiply the price per MB times the number
     *   of MBs forwarded by this provider. It is also important to include the debt we have acquired with the provider
     *   in previous iterations.
     * - Finally, we add this amount to the total owed (for all providers) in this iteration.
     */
    function __forwardingCallback(uint256 _response, address _provider) onlyFromOracle public {
        require(_provider != 0x0, "This provider address is not a valid one");
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
