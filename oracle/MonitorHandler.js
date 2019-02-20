const moment = require('moment')
const request = require('request')
const OracleHandler = require('./OracleHandler')
var config = require('../config')

class MonitorHandler extends OracleHandler {

    constructor(_account, _network) {
        super()
        this.account = _account
        this.ip = config[_network].prometheus
        this.monitorServer = `http://${this.ip}/api/v1/`
        this.stepTime = '1m'
        this.step = `step=${this.stepTime}`
        this.state = 'total'
    }

    handle(_id, _recipient, _originator, _data, callback) {
        let _this = this
        this.monitor(_data, (_traffic) => {
            _this.getTransaction(_recipient, _traffic, _originator, callback)
        })
    }

    getTransaction(recipient, traffic, originator, callback) {
        let transaction = {
            from: this.account,
            to: recipient,
            data: this.getWeb3().eth.abi.encodeFunctionCall({
                name: '__oracleCallback',
                type: 'function',
                inputs: [{
                    type: 'uint256',
                    name: '_response'
                }, {
                    type: 'string',
                    name: '_originator'
                }]
            }, [traffic, originator]),
            gas: this.getWeb3().utils.numberToHex(300000)
        }
        callback(transaction)
    }

    monitor(data, callback) {
        var queryTarget = `query_range?query=target_forwarded_bytes{instance=\"${data}\", state=\"${this.state}\"}&`
        var queryStart = `start=${this.lastMinute()}&`
        var queryEnd = `end=${this.now()}&`
        var url = this.monitorServer + queryTarget + queryStart + queryEnd + this.step
        let _this = this

        request(url, function (error, response, body) {
            if (error)
                console.log("error: " + error)
            console.log("status code: " + response.statusCode)
            let wx = JSON.parse(body)
            let traffic = Math.round(_this.getTraffic(wx) / 1024)
            console.log("Traffic (MB): " + traffic)
            callback(traffic)
        })
    }

    unixTimestamp(date) {
        let splitted = date.split(" ");
        return splitted[0] + "T" + splitted[1] + "Z"
    }

    now() {
        return this.unixTimestamp(moment().utc().format('YYYY-MM-DD HH:mm:ss'));
    }

    lastHour() {
        return this.unixTimestamp(moment().utc().subtract(1, 'hours').format('YYYY-MM-DD HH:mm:ss'));
    }

    lastMinute() {
        return this.unixTimestamp(moment().utc().subtract(1, 'minutes').format('YYYY-MM-DD HH:mm:ss'));
    }

    getTraffic(json) {
        let results = json.data.result[0]
        if (results != null || results != undefined)
            return results.values[results.values.length - 1][1] - results.values[0][1]
        return -1
    }
}

module.exports = MonitorHandler