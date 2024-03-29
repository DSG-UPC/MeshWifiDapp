/*
Deposit-based Internet Access Contract.
Steps:
1) Provider Initiates Contract for a concrete client given
a maximim amount of data to be consumed and a pricer per MB
2) Client accepts the contract accepting the terms and depositing
at least maxData*pricePerMB tokens in the contract
3) Provider stores in the contract a passhprase for accessing the Connection
encrypted with the public key of the client
4) After connection is established the involved parties are resposnible for
invoking queries to the Oracle concenring the monitoring values of the usage
5) The monitoring usage values of the client and the provider are comapred
and depending on the outcome of the comparison a fraction or all the deposited
amount is transfered to the provider and a notification is send for renegotiation
of new contract. If the monitoring values of the different parties do not aggree
then an external conflict resolution process is initiated.
*/
pragma solidity ^0.4.25;

import "contracts/DAOInterface.sol";
import "contracts/tokens/EIP20Interface.sol";
import "contracts/oracle/OracleAPI.sol";
import "contracts/helpers/Ownable.sol";


contract SimpleInternetAccess is Ownable, usingOracle{
    struct Person {
      address wallet;
      string ip;
      string monitor;
      uint monitoredUsage;
      bytes32 pubKey;
    }

    Person public provider;
    Person public client;
    string public ticket;
    uint public maxData;
    uint public pricePerMB;
    uint public clientDebt;
    uint activationTime;
    uint public monitoredUsage;
    bool public accepted = false;
    bool public oracleResult = false;
    DAOInterface public DAOContract;
    address public erc20Address;
    address public reserveAccount;
    EIP20Interface internal tokenContract;
    bool public concluded;
    event LogContractCreated(address provider, uint maxData, uint pricePerMB, bytes32 pubKey, address erc20);
    event LogClientAccepted(address client, bytes32 pubkey);
    event LogActivation(string ticket, string providerIP, uint activationTime);
    event LogRenegotiate(uint debt);
    event LogRemainingData(uint remainingData);
    event LogEntry();

    /*
    * The provider creates a contract with the proposed maximum amount of data and price,
    * the IP address of his monitoring service as well as the client address.
    */
    constructor(address _client, string _providerIP, uint _maxData,
                address creator, address _DAOAddress, address _erc20Address,
                bytes32 _pubKey)
      public
      usingOracle(_DAOAddress)
    {
       /**
       * @dev The client accepts the contract. To do this the client must have
       * allowed this contract to manage tokens more than maxData*pricePerMB. Also
       * the user needs to have provided an allowance <= of the value parameter
       * @param _pubKey The user's pubkey
       * TODO maybe only owner can register users? What about the URI generation?
       */
        erc20Address = _erc20Address;
        tokenContract = EIP20Interface(_erc20Address);
        provider.wallet = _client;
        provider.ip = _providerIP;
        maxData = _maxData;
        client.wallet = creator;
        client.pubKey = _pubKey;
        DAOContract =  DAOInterface(_DAOAddress);
        pricePerMB = DAOContract.getPricePerMB();
        reserveAccount = DAOContract.getReserveAccount();
        concluded = false;
        emit LogContractCreated(client.wallet, maxData, pricePerMB, client.pubKey, erc20Address);
    }

    function acceptContract(string newTicket) public {
        //After the contract is accepted by the client the provider store a ticket
        //in the contract encrypted with the public key of the client
        //The activation time is stored.
        require(msg.sender == provider.wallet,"The message sender is not the provider");
        uint allowance = tokenContract.allowance(client.wallet,address(this));
        require(allowance >= maxData*pricePerMB,"The allowance is lower than maxData * pricePerMB");
        if (!tokenContract.transferFrom(client.wallet, address(this), maxData*pricePerMB)){
          revert("Transfer of allowance from client to Internet contract failed");
        }
        accepted = true;
        activationTime = now;
        ticket = newTicket;
        emit LogActivation(newTicket, provider.ip, activationTime);
    }

    function getClientDebt() public view returns (uint debt){
      return clientDebt;
    }

    function getClientWallet() public view returns (address addr){
      return client.wallet;
    }

    function getOracleResult() public view returns (bool result){
      return oracleResult;
    }

    function checkUsage() public {
        //The provider or the client can initiate the process to check the usage.
        //An oracle is being used to retrieve the values from the monitoring
        //services.
        // Alternatively DELAYS can be used to automatically check usage
        // periodically see: https://github.com/johnhckuo/Oraclize-Tutorial

        require(msg.sender == provider.wallet || msg.sender == client.wallet,
                  "The message sender is neither the client nor the provider");
        
        queryOracle('monitor', msg.sender, provider.ip);
    }

    function __oracleCallback(uint _response, address _originator) onlyFromOracle external {
        // Callback to recieve the monitoring values and trigger usageResult()
        
        monitoredUsage = _response;
        if (_originator == client.wallet){
            client.monitoredUsage = _response;
            oracleResult = usageResult();
        }
        if (_originator == provider.wallet){
            provider.monitoredUsage = _response;
            oracleResult = usageResult();
        }
    }

    function usageResult() private returns (bool) {
        //This function checks the usage and accordingly
        //1) Transfers the tokens of the client to provider
        //2) Notifies for the necessity of a new contract, including client debts
        //3) If maxData is not reached the amount of remaining data is pushed in the log
        //4) Function to solve dispute should be called

        require(monitoredUsage != 0, "Monitored usage is equals zero");
        if (monitoredUsage >= maxData) {
            //maxData is reached, time to pay
            uint totalAmount = monitoredUsage*pricePerMB;
            uint clientAllowance = tokenContract.allowance(client.wallet,address(this));
            uint contractBalance = tokenContract.balanceOf(address(this));
            uint clientBalance = tokenContract.balanceOf(client.wallet);
            if (contractBalance + clientAllowance >= totalAmount) {
              // The are sufficient funds overall
              if (contractBalance < totalAmount) {
                // Need to get first the tokens frome the client
                // Since it is a two step transfer we could transfer these
                // tokens directly to the provider, but we would need a
                // mechanism to track the amount that is already transferred.
                // Therefore it is easier to transfer first to this contract
                bool success = tokenContract.transferFrom(
                                client.wallet,
                                reserveAccount,
                                totalAmount-contractBalance);
                if (!success){
                  return false;
                }
              }
              // Tokens not used are send back to the client
              tokenContract.transfer(reserveAccount,totalAmount);
              tokenContract.transfer(client.wallet,contractBalance-totalAmount);
              concluded = true;
              emit LogRenegotiate(0);
            } else {
                uint debt = 0;
                uint tokens = 0;
                // The client has insufficient funds
                // In order to avoid exceptions we need to make the following
                //separation:
                if (clientBalance >= clientAllowance){
                    // Balance more than allowance so tranfer all allow
                    debt = totalAmount-clientAllowance;
                    tokens = clientAllowance;
                }
                else{
                    debt = totalAmount - clientBalance;
                    tokens = clientBalance;
                }
                tokenContract.transferFrom(client.wallet, reserveAccount, tokens);
                clientDebt = debt;
                concluded = true;
                emit LogRenegotiate(debt);
            }
            selfdestruct(client.wallet);
        } else{
          //maxData is not reached
          uint remaining = maxData - monitoredUsage;

          emit LogRemainingData(remaining);
          return true;
        }
        //TODO Think of a better way to find if both measurements are updated
        //TODO Test the else cases
        /*if (client.monitoredUsage ==0 && provider.monitoredUsage ==0){
          return false;
        }

        if (client.monitoredUsage == provider.monitoredUsage) {
             // No dispute on the monitoring
            if (client.monitoredUsage >= maxData) {
                //maxData is reached, time to pay
                uint totalAmount = client.monitoredUsage*pricePerMB;
                uint clientAllowance = tokenContract.allowance(client.wallet,address(this));
                uint contractBalance = tokenContract.balanceOf(address(this));
                uint clientBalance = tokenContract.balanceOf(client.wallet);
                if (contractBalance + clientAllowance >= totalAmount) {
                  // The are sufficient funds overall
                  if (contractBalance < totalAmount) {
                    // Need to get first the tokens frome the client
                    // Since it is a two step transfer we could transfer these
                    // tokens directly to the provider, but we would need a
                    // mechanism to track the amount that is already transferred.
                    // Therefore it is easier to transfer first to this contract
                    bool success = tokenContract.transferFrom(
                                    client.wallet,
                                    address(this),
                                    totalAmount-contractBalance);
                    if (!success){
                      return false;
                    }
                  }
                  // Tokens not used are send back to the client
                  tokenContract.transfer(provider.wallet,totalAmount);
                  tokenContract.transfer(client.wallet,contractBalance-totalAmount);
                  emit LogRenegotiate(0);
                } else {
                    uint debt = 0;
                    uint tokens = 0;
                    // The client has insufficient funds
                    // In order to avoid exceptions we need to make the following
                    //separation:
                    if (clientBalance >= clientAllowance){
                        // Balance mor than allowance so tranfer all allow
                        debt = totalAmount-clientAllowance;
                        tokens = clientAllowance;
                    }
                    else{
                        debt = totalAmount - clientBalance;
                        tokens = clientBalance;
                    }
                    tokenContract.transferFrom(client.wallet, provider.wallet, tokens);
                    clientDebt = debt;
                    emit LogRenegotiate(debt);
                }
                selfdestruct(client.wallet);
            } else{
              //maxData is not reached
              uint remaining = maxData - client.monitoredUsage;
              emit LogRemainingData(remaining);
              return true;
            }
        } else{
            return false;
            // TODO Solve monitoring dispute
        }
        */
    }

    function getUsers() public view returns (
      address, string, string, uint, bytes32,
      address, string, string, uint, bytes32
      ) {
        return (
          provider.wallet,
          provider.ip,
          provider.monitor,
          provider.monitoredUsage,
          provider.pubKey,
          client.wallet,
          client.ip,
          client.monitor,
          client.monitoredUsage,
          client.pubKey
        );
    }

    function getSummary() public view returns (
      uint, uint, uint, bool, string, uint
      ) {
        return (
          maxData,
          pricePerMB,
          activationTime,
          accepted,
          ticket,
          address(this).balance
        );
    }

    function returnTokens() public {
      require(msg.sender == provider.wallet, "The message sender is not the provider");
      uint contractBalance = tokenContract.balanceOf(address(this));
      tokenContract.transferFrom(address(this), client.wallet, contractBalance);
    }

    function kill() public {
      if (accepted){
        selfdestruct(client.wallet);
      }
      else{
         selfdestruct(provider.wallet);
      }
    }

    function compareStrings (string a, string b) public pure  returns (bool){
       return keccak256(bytes(a)) == keccak256(bytes(b));
   }
}
