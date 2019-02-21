# MeshWifiDappOracle

This repository contains the code representing the Oracle, that is, the software in charge of the communication between the Blockchain and the outer world.

The main implementation is inside the `/oracle` directory. This package contains the main implementation of the Oracle and the different Handlers (`/handlers` directory) that will be used to process the different requests the oracle will be able to receive.

## Dependency management

Any configuration can be updated in `config.js` file. This file will hold the different parameters required for the communication with the monitoring server (Prometheus) and with the database system (MongoDB).

## How to run it

1. _Read this point if you want to run it locally, otherwise continue to the second one_. We will need to install [MongoDB](https://docs.mongodb.com/manual/installation/). Once mongo is installed and running in our machine, we will have to initialize it and load some schemas. This can be done as follows:

```mongo < database/init```

2. The first thing to do is to install all the required dependencies:

```npm install```

3. Then we will need to compile and migrate the contracts to be used with respect to the Ethereum Network we'll be using:

```./node_modules/.bin/truffle compile --all --network <network-name>```

```./node_modules/.bin/truffle migrate --reset --network <network-name>```

4. Once all the contracts have been migrated succesfully and we have a `build/` directory in the root folder of the project, we can start the oracle from inside the `/oracle` folder:

```node oracle --network staging```

5. If everything went ok we should be able to see a long output describing the WebSocketProvider and also the contract ABI.

## How to test it

We need to follow the steps from the previous section before trying to test the oracle. This can be done in two ways:

1. Directly executing the tests written for that purpose (this is not giving too much information):

```./node_modules/.bin/truffle test --network staging```

2. Using truffle console and testing the OracleTest methods freely:

```./node_modules/.bin/truffle console --network staging```

```OracleTest.new(OracleLookup.address).then(instance => {oracle = instance})```

```oracle.methods```

## Run the database in a Docker container
Another posibility is to run the database system detached as a docker container. Inside the `docker/` folder there is a Dockerfile along with an init script to initialize the database. Once we are inside the `docker/` folder, the needed commands to run it as a container are the following:

```
docker build -t mongo-mesh .
```

```
docker run \
--name mongo-mesh \
-e MONGO_INITDB_DATABASE=ammbr \
-p 27017:27017 \
-v /var/lib/docker-mongo:/data/db
-d mongo-mesh \ 
mongod --auth
```

After these steps we should be able to connect to the database using the following command:

```
mongo -u <<username>> \
-p <<password>> <<IP>> \
--authenticationDatabase "ammbr"
```

### Some reminders about the docker container
- If you choose to run it inside a Docker container, make sure the port `27017` is free.
- The tags `<<username>>`, `<<password>>` and so on are not written directly in the README but they can be found in the init.js script.
- In order to try the oracle, we will need to change the `config.js` file which contains the configuration to connect to the database.