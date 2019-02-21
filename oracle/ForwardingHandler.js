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
        this.mongoHandler.findDeviceByWallet(_data, (_device) => {
            if (_device) {
                result.wallet = _device.wallet
                _this.monitorHandler.monitor(_device.ip, (_traffic) => {
                    result.traffic = _traffic
                    _this.getTransaction(_this.account, _recipient, result, callback)
                })
            }
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
                    name: '_originator'
                }]
            }, [result.traffic, result.wallet]),
            gas: this.getWeb3().utils.numberToHex(300000)
        }
        callback(transaction)
    }
}

module.exports = ForwardingHandler