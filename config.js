var config = {
    mongo: getMongoIP(),
    prometheus: process.env.PROMETHEUS_IP || 'localhost:9090',
    ethereum_provider: process.env.ETH_NET || 'localhost:8545',
};

function getMongoIP() {
    let ip = process.env.MONGO_IP || 'localhost:27017'
    return `mongodb://ammbr:4mmBr_P4ssW0rd@${ip}/ammbr`;
}

module.exports = config