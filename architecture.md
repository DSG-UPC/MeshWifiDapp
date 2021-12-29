# Components

## Centralized - 1 machine
* Mongo server (NodeDB)
    * https://hub.docker.com/r/dsgupc/meshdapp-mongodb
    *Credential and original image: https://github.com/DSG-UPC/MeshWifiDapp-MongoDB/blob/master/docker/init.js
* Prometheus (Monitoring server)
    * https://hub.docker.com/r/dsgupc/meshdapp-prometheus
    * https://github.com/DSG-UPC/Prometheus-Node-Exporter/tree/f4435c17e8010f6b8ebe17d548f8bd783364a30f
* if blockchain is **centralized** -> ganache https://trufflesuite.com/docs/ganache/quickstart.html is autoinstalled  with `npm install` in the oracle repo, then you simply need to run it
* Oracle (communication with the blockchain)
    * https://github.com/DSG-UPC/MeshWifiDapp


# Decentralized - All the rest of the machines
* Prometheus clients (monitoring client) 1 in each routing device
    * Lua  https://github.com/DSG-UPC/Prometheus-Lua-Exporter/tree/78e482f5e847b3799d20482a8935ec6db0a453dc
    * Node https://github.com/DSG-UPC/Prometheus-Node-Exporter/tree/f4435c17e8010f6b8ebe17d548f8bd783364a30f
* Smart contracts (executed in Ethereum, they run wherever you run the ethereum node)
    * https://github.com/DSG-UPC/MeshWifiDapp
* If blockchain runs **decentralized** -> geth 
    * https://github.com/vertigobr/ethereum
    * https://medium.com/@javahippie/building-a-local-ethereum-network-with-docker-and-geth-5b9326b85f37