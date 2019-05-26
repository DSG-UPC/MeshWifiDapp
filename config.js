var config = {
    mongo: getMongoIP(),
    prometheus: process.env.PROMETHEUS_IP || 'http://10.228.207.65:9090',
    ethereum_provider: process.env.ETH_NET || 'http://127.0.0.1:8545',
    json_server: process.env.JSON_SERVER || 'http://localhost:3000',
};

function getMongoIP() {
    let ip = process.env.MONGO_IP || '127.0.0.1:27017'
    return `mongodb://ammbr:4mmBr_P4ssW0rd@${ip}/ammbr`;
}

module.exports = config
