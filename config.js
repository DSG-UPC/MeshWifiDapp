var config = {}

// mongodb://username:password@ip:port/db_name

config.staging = {
    mongo: getMongoURL(),
    prometheus: getPrometheusURL()
}

config.production = {
    mongo: getMongoURL(),
    prometheus: getPrometheusURL()
}

function getMongoURL() {
    let ip = process.env.MONGO_IP || 'localhost';
    return `mongodb://ammbr:4mmBr_P4ssW0rd@${ip}:27017/ammbr`;
}

function getPrometheusURL() {
    return process.env.PROMETHEUS_IP || 'localhost:9090';
}

module.exports = config