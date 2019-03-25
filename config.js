var config = {
    mongo: getMongoIP(),
    prometheus: process.env.PROMETHEUS_IP || 'http://localhost:9090',
    ethereum_provider: process.env.ETH_NET || 'http://localhost:8545',
    json_server: process.env.JSON_SERVER || 'http://10.228.207.37:3000',
};

function getMongoIP() {
    let ip = process.env.MONGO_IP || 'http://localhost:27017'
    return `mongodb://ammbr:4mmBr_P4ssW0rd@${ip}/ammbr`;
}

module.exports = config