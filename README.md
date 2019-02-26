# MeshWifiDappOracle

This repository contains the code representing the Oracle, that is, the software in charge of the communication between the Blockchain and the outer world.

The main implementation is inside the `/oracle` directory. This package contains the main implementation of the Oracle and the different Handlers (`/handlers` directory) that will be used to process the different requests the oracle will be able to receive.

## Dependency management

Any configuration can be updated in `config.js` file. This file will hold the different parameters required for the communication with the monitoring server (Prometheus) and with the database system (MongoDB).

## How to run it

### Manually

1. _Read this point if you want to run it locally, otherwise continue to the second one_. We will need to install [MongoDB](https://docs.mongodb.com/manual/installation/). Once mongo is installed and running in our machine, we will have to initialize it and load some schemas. This can be done as follows:

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

### Using a Docker container

1. Build the Dockerfile to get the image:

```
docker build -t <<any-name>> .
```

2. Execute the container (**Be sure to have a Ethereum provider, a Prometheus server and a MongoDB instances running and available**)

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
- If it is ran with the docker command shown above, the console will only show output. Consider using `-d` or flag to detach it.

## How to test it

We need to follow the steps from the previous section before trying to test the oracle. This can be done in two ways:

1. Directly executing the tests written for that purpose (this is not giving too much information):

```
./node_modules/.bin/truffle test --network staging
```

2. Using truffle console and testing the OracleTest methods freely:

```
./node_modules/.bin/truffle console --network staging

OracleTest.new(OracleLookup.address).then(instance => {oracle = instance})

oracle.methods
```