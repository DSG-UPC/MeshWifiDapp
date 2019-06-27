
# MeshWifiDApp

This repository is the entrypoint of the whole project. The system (MeshDApp) consists in a set of smart contracts that model the solution to our problem, which is ensuring the validity of the economic model proposed. These smart contract are in charge of several tasks (managing the payments from consumers when acquiring a new service, paying the providers the retribution they deserve, establishing a relation between clients and providers, ...).

The structure of the project is modular and the different modules are interconnected among them. The following sections describe the different modules (which are located in different repositories) and how they are connected to each other so that the system works. This repository holds two modules itself, these are the *smart contracts logic* and the *Oracle server*.


## Modules

As mentioned in previous section, this project is modular so it is composed by some modules that are interconnected to work as a unique system. These modules are spread in different repositories, with this approach it is easier to make a distinction between the different parts of MeshDApp and make changes such that each part is independent from each other.

### Smart Contracts

The smart contracts are the most important part of the project. They are an abstraction of the classes used in OOP with the main difference that the information held by smart contracts tends to be simpler. MeshDApp uses four types of contracts:

- **Oracle communication:** this type of contracts provide a direct communication between the Oracle (which is external) and the rest of blockchain smart contracts using RPC calls. To do so, we create two contracts: `OracleAPI` and `OracleDispatch` whose main responsibility is sending queries to the oracle with a keyword to match the type of request we want to send and some parameters along with the request type.
- **Tokens:** we took advantage of the already existing implementation of `ERC721` and `ERC20` tokens created by [openzeppelin](https://github.com/OpenZeppelin/openzeppelin-solidity) to make our own version of them:

	- **ERC721** is a type of NFT (Non-Fungible-Token) which is used to keep track of the different users and devices that exist within the network, creating a unique identifier for each of them.

	- **ERC20** is the token we will be using to store the funds owed by each user in the network at every moment. This will be the *money* of the system in which both the clients will be paying and the providers will receive their compensation.

- **Market related:** as we are modeling an economic system we need to model the operation in which a client and a provider establish a relationship, and also the operation where the providers are being rewarded. These operations are formalized in two smart contracts named `SimpleInternetAccess` and `Forwarding`, respectively:

	- **Simple Internet Contract:** to be able to access a given service (as it is the internet in our case), a client has to establish a relationship with a provider, such that this provider enables the client's device connecting to the internet. The client chooses the provider to be connected and the plan (amount of MBs) to be used, and creates a new contract (smart contract instance) paying an escrow to the created contract (an amount of tokens corresponding to the price of the service stated by the provider). Once the provider accepts the contract, the money is transferred to a reserve account where the funds are kept. Then, once the client runs out of MBs, he/she needs to pay again the money stated by the provider to renew the contract. **It's important to remark** that we are using an auxiliary contract to externalize the creation of this *Internet Contracts*. It is named `SimpleInternetAccessFactory` following a factory desing pattern.

	- **Forwarding:** providers need to be paid periodically. After a given time of network use, each provider request to be paid (*currently working on the automation of this process*) and the Forwarding contract calculates the amount he/she deserves to receive. This calculus is perfomed out of the blockchain environment as it requires sending a request to the Prometheus server to check the amount of data forwarded by that provider since the last forwarding operation. Once the contract has this data, and taking into account the price per MB specified by the given provider, the resulting amount is paid to the provider. The payment is done to every provider simultaneously in order to avoid running out of money. As we want to approach to a balance of zero between the funds being kept and the amount being paid, after each payment iteration, the price per mb maximum is tuned in order to reduce the spents for the next iteration if the money requested by the provider was greater than the funds (a proportional debt is acquired with each provider) or to increase them in case the remaining funds were higher than the payments at the end.

- **Helpers:** when using Solidity we need to take into account that the level of abstraction is very high and that we have to avoid as much as possible performing complex operations inside the smart contracts. For this reason sometimes we need to use some auxiliar contracts to make things easier and to release others from responsibilities. In this project there are three contracts of this kind `DAO`, `CRUD`, `Ownable`:
	
	- **DAO:** this contract allows the storage and management of several main global variables and constants, e.g. consumer prices. It is also used as a registry to store the address of other contracts that may have important information. We could say that it is used as an intermediate tool to communicate, for instance, the `Forwarding` contract, with the `ERC20` to perform the payments, as the Forwarding contract can retrieve the ERC20 address (or ERC721 if needed) just storing a reference to DAO's address.

	- **CRUD:** Following [rhitchens2](https://bitbucket.org/rhitchens2/soliditycrud) implementation, we have created our own version of a CRUD contract which is used as an auxiliary contract to access the information stored by ERC721 in an easier manner. The information is organized using structs and maps that hold the users and devices' data.

	- **Ownable:** when we need to create different instances of the same contract, e.g. SimpleInternetAccess, we want to be sure which is the creator address, i.e. the owner, so we are sure that whenever we receive a request to perform an operation on that contract, only the owner will be allowed to do it. That is why we are reusing this implementation (again from openzeppelin) of the Ownable contract. Specifying that a contract is ownable we can restrict some operations to the address of its creator.


### Oracle Server

We have already commented that some contracts need to interact with the Oracle server, as they need to retrieve information from systems that are external to the blockchain. This oracle needs to be deployed and connected to the given blockchain environment where these contracts have been deployed. The association process consists in creating a contract for this module and storing this address in the DAO contract.

The operations permitted by this server are: minting devices or users in the database (or also querying the database), requesting the monitoring server about the data forwarded for a given device in a given period of time and performing calculations for the forwarding contract.

The communication, as stated before is done via RPC callings from smart contracts to the oracle, and the results are return via a callback function invocation in the requester contract. This function will have a set of parameters that correspond with the returned values from the Oracle.


### Monitoring

We are using a monitoring server called [Prometheus](https://prometheus.io/) to keep track of the data forwarded for each of the devices that belong to the network. This data allows the system to obtain the values we need to pay to each provider respectively.

This system offers a target discovery service to identify new devices to be monitored. The process to add a new device to the list would be sending a request to the oracle, such that it mints a new device in the database and, after that, makes a request to the [Prometheus CRUD Targets](https://github.com/DSG-UPC/Prometheus-CRUD-Targets/tree/master) software(*to be implemented yet*) so that the new device is added to the list of targets that Prometheus needs to monitor.

This module has its [own external repository](https://github.com/DSG-UPC/MeshWifiDapp-Monitoring/tree/master/prometheus-server) and further explanations can be found there.


### MongoDB

/*Reference to own repo and briefly explain*/


### Exporters

/*Reference to own repo and briefly explain*/


## Deployment


### Manually


### Docker

