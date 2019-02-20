var config = {}

// mongodb://username:password@ip:port/db_name

config.staging = {
    mongo: 'mongodb://test:test@localhost:27017/test',
    prometheus: 'localhost:9090'
}

config.production = {
    mongo: `mongodb://ammbr:4mmBr_P4ssW0rd@${process.env.MONGO_IP}:27017/ammbr`,
    prometheus: process.env.PROMETHEUS_IP
}

module.exports = config