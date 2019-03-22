const OracleHandler = require('./OracleHandler')

class ForwardingHandler extends OracleHandler {

    constructor(_account, _mongoHandler, _monitoringHandler) {
        super()
        this.account = _account
        this.mongoHandler = _mongoHandler
        this.monitorHandler = _monitoringHandler
    }

    handle(_id, _recipient, _originator, _ip, callback) {
        let result = {}
        let _this = this
        // this.mongoHandler.findDeviceByIP(_ip, (_device) => {
        //     if (_device) {
        //         result.wallet = _device.wallet
        //         _this.monitorHandler.monitor_fake(_device.ip, (_traffic) => {
        //             result.traffic = _traffic
        //             _this.getTransaction(_this.account, _recipient, result, callback)
        //         })
        //     }
        // })
        this.monitorHandler.monitor_fake(_ip, (_traffic) => {
            result.wallet = _traffic.owner;
            result.traffic = _traffic.monitor
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
                }]
            }, [result.traffic, result.wallet]),
            gas: this.getWeb3().utils.numberToHex(300000)
        }
        callback(transaction)
    }
}

module.exports = ForwardingHandler