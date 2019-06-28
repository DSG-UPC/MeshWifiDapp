
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

As we did with the DAO smart contract, we want to ease things when accessing information about the users or devices. In this case, we will externalize this information into a MongoDB database. We have chosen Mongo because the setup process is neither hard nor long. It takes just a couple of minutes creating the database and the needed entitites. Another important point is that the format in which the information is stored is JSON, which stands for JavaScript Object Notation. This is important as the communication between the blockchain and the database will be done by the oracle, which has been developed in Node.js so we are dealing directly with JavaScript notation.

All the classes related with the communication between MeshDApp and the database are stored under the `database/` folder. Every operation related with the database, is controlled by the `MongoHandler` class, which redirects the operation to be performed to the corresponding DAO class (note this [DAO](https://en.wikipedia.org/wiki/Data_access_object) is different from the [DAO contract](https://download.slock.it/public/DAO/WhitePaper.pdf)) and receives the information as a callback after the operation is performed by the corresponding DAO.

There are two schemas in this database, one for Devices and another one for Users. Both schemas are defined in their corresponding classes and are required for the framework Mongoose, which makes the communication with the database much more easier.

This module has its [own external repository](https://github.com/DSG-UPC/MeshWifiDapp-MongoDB) and further explanations can be found there.


### Exporters

Prometheus is intended to store the amount of data forwarded per each device in the system, this is done by requesting the forwarding information to every node, respectively. We were required to create a script to expose the data transferred by a node in a safe way (i.e. only authorized entities can access this information). Luckily for us, Prometheus allows to include a secret token as authorization header, so we are able to catch the headers of every request received by any device and decide whether the requester address is safe or not.

Once we know the requester address is the one we want, the given device sends the *inner* and *outter* traffic in a format that Prometheus can understand and parse correctly. Prometheus will plot the data transferred for every node using three sources of data (in/out/total) traffic.

Currently there are two implementations of the exporters, one in Lua and the other one in Node.js, but currently the only one which is finished and working is the Lua one. We decide to put more effort in the Lua implementation as it is supported by most of the routers (and all the devices that will be used in the network) and also because it requires less configuration.

This module has its [own external repository](https://github.com/DSG-UPC/Prometheus-Lua-Exporter) and further explanations can be found there.


## Deployment

There are three different ways of deploying the system, so don't go directly for the first one, because maybe is not the most suitable for what you want to do. These ways are:

- **Manually**, in which you would have to install and configure almost everything. The good point here is that this approach gives more freedom when your intention is creating a custom installation of the system (maybe a new docker image with your custom configuration).

- **Docker containers**, is a middle point between the first and the second option as you have to choose the configuration that will be used for the docker images you will be running. And also you may have to run some external modules (mongodb and prometheus) on your own.

- **Docker-Compose**, the easiest one, just running two commands and the system is up and working with the default configuration, not the best choice if you want to make big changes (or even small but important ones).


### Manually

1. **Read this point if you want to run it locally, otherwise continue to the second one**. We will need to install [MongoDB](https://docs.mongodb.com/manual/installation/). Once mongo is installed and running in our machine, we will have to initialize it and load some schemas. This can be done as follows:

```
mongo < database/init
```

2. The first thing to do is to install all the required dependencies:

```
npm install
```

3. Then we will need to compile and migrate the contracts to be used with respect to the Ethereum Network we'll be using:

```
./node_modules/.bin/truffle compile --all --network <<network-name>>

./node_modules/.bin/truffle migrate --reset --network <<network-name>>
```

4. Once all the contracts have been migrated succesfully and we have a `build/` directory in the root folder of the project, we can start the oracle from inside the `/oracle` folder:

```
node oracle --network staging
```

5. If everything went ok we should be able to see a long output describing the WebSocketProvider and also the contract ABI.


### Docker

1. Build the Dockerfile to get the image:

```
docker build -t <<any-name>> .
```

2. Execute the container **(Be sure to have a Ethereum provider and a MongoDB instances running and available, and a Prometheus server just in case you want to run locally)**

```
docker run -it --network=host -e NETWORK=test -e ETH_NET=localhost:8545 -e PROMETHEUS_IP=localhost:9090 -e MONGO_IP=localhost:27017 oracle-mesh
```

#### Things to be taken into account
The command from the second point has some features that need to be explained:

- **--network=host** This makes easier the integration when running everything locally. The idea is that the docker container inherits the network interface of the host, such that we can access to the different systems deployed on the host ports without needing to expose them individually (e.g. -p 8545:8545).

- Five environment variables need to be set for the oracle to work properly:
    
	- **NETWORK** will represent the network name (check truffle.js to find available networks). Default value `staging` (be sure to choose the same network as the ethereum network provider).
    
	- **ETH_NET** will represent the IP of the ethereum network provider. Default value `localhost:8545`
    
	- **PROMETHEUS_IP** will represent the IP of the prometheus server. Default value `localhost:9090`
    
	- **MONGO_IP** will represent the IP of the database (MongoDB). Default value `localhost:27017`

    - **HTTP_PROVIDER** string ('true' or 'false') used to validate if the provider will be via http or web socket instead. Default value `false` (which means using web socket).

- If you decide to run it with the docker command shown above, the console will only show output and it will need to remain open while the docker container is running. Consider using `-d` or flag to detach it.

- The command shown above to run the instance, is using the default values assuming it is being run in localhost, tune the parameters with the values you have for each of the services.


### Docker-Compose

Another approach, maybe the easiest one in terms of configuration, because it avoids keep installing or downloading things using several commands, is the docker compose. The only thing to be done here is downloading docker compose and (maybe) tunning the configuration in `config.js` to update the addresses of the different services that we are retrieving information from.

To run the system with docker compose make sure you have an instance of ganache already running in the correct network (read previous sections for further information), also that all the addresses in config.js are correct and that they point to your services as expected. Once you have checked that it would be enough running the following command to start the system:

```
docker-compose up
```

This is the easiest approach, but if you want to create a custom execution for the system you should refer to the previous sections.