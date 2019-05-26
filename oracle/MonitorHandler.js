const moment = require('moment')
const request = require('request')
const OracleHandler = require('./OracleHandler')
var config = require('../config')

class MonitorHandler extends OracleHandler {

    constructor(_account) {
        super()
        this.account = _account
        this.monitorServer = `${config.json_server}`
        this.step = 'step=1m'
        this.state = 'total'
    }

    handle(_id, _recipient, _originator, _data, callback) {
        let _this = this
        this.monitor_fake(_data, (_traffic) => {
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
                    type: 'address',
                    name: '_owner'
                }]
            }, [traffic.monitor, traffic.owner]),
            gas: this.getWeb3().utils.numberToHex(300000)
        }
        console.log(transaction);
        console.log('Sending transaction from MonitorHandler')
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
            let traffic = {};
            traffic.monitor = Math.round(_this.getTraffic(wx));
            console.log("Traffic (MB): " + traffic.monitor);

            callback(traffic)
        })
    }

    monitor_fake(data, callback) {
        var url = config.json_server
        var json = JSON.parse(decodeURIComponent(data));
        var monitor = `${url}/monitor?id=${json.deviceid}`;
        var owner = `${url}/owner?id=${json.owner}`;
        var node = `${url}/node?id=${json.deviceid}`
        var result = {}

        request(monitor, function (error, response, body) {
            if (error)
                console.log("error: " + error)
            console.log("status code: " + response.statusCode)
            let wx = JSON.parse(body)
            console.log("Traffic (MB): " + wx[0].values[json.iteration])
            result.monitor = wx[0].values[json.iteration]
            console.log(result.monitor);
            request(owner, function (error, response, body) {
                if (error)
                    console.log("error: " + error)
                console.log("status code: " + response.statusCode)
                let wx = JSON.parse(body)
                console.log("Owner: " + wx[0].value)
                result.owner = wx[0].value
                console.log(result.owner);
                result.deviceid=json.deviceid;
                callback(result)
            })
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
        return this.unixTimestamp(moment().utc().subtract(3, 'minutes').format('YYYY-MM-DD HH:mm:ss'));
    }

    getTraffic(json) {
        let results = json.data.result[0]
        if (results != null || results != undefined)
            return results.values[results.values.length - 1][1] - results.values[0][1]
        return -1
    }
}

module.exports = MonitorHandler
