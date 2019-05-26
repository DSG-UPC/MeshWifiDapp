const OracleHandler = require('./OracleHandler')

class ForwardingHandler extends OracleHandler {

    constructor(_account, _mongoHandler, _monitoringHandler) {
        super()
        this.account = _account
        this.mongoHandler = _mongoHandler
        this.monitorHandler = _monitoringHandler
    }

    handle(_id, _recipient, _originator, _data, callback) {
        let result = {}
        let _this = this

        this.monitorHandler.monitor_fake(_data, (_traffic) => {
            result.wallet = _traffic.owner;
            result.traffic = _traffic.monitor;
            result.deviceid = _traffic.deviceid;
            _this.getTransaction(_this.account, _recipient, result, callback)
        })
    }

    getTransaction(account, recipient, result, callback) {
        let transaction = {
            from: account,
            to: recipient,
            data: this.getWeb3().eth.abi.encodeFunctionCall({
                name: '__forwardingCallback',
                type: 'function',
                inputs: [{
                    type: 'uint256',
                    name: '_response'
                }, {
                    type: 'address',
                    name: '_provider'
                }, {
                    type: 'uint256',
                    name: '_deviceid'
                }]
            }, [result.traffic, result.wallet, result.deviceid]),
            gas: this.getWeb3().utils.numberToHex(500000)
        }
        callback(transaction)
    }
}

module.exports = ForwardingHandler
