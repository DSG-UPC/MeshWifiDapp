const OracleHandler = require('./../OracleHandler')

class MintHandler extends OracleHandler {

    constructor() {
        super()
    }

    getTransaction(account, recipient, result, callback) {
        let transaction = {
            from: account,
            to: recipient,
            data: this.getWeb3().eth.abi.encodeFunctionCall({
                name: '__nodeMintCallback',
                type: 'function',
                inputs: [{
                    type: 'string',
                    name: '_response'
                }]
            }, [result.toString()]),
            gas: this.getWeb3().utils.numberToHex(450000)
        }
        callback(transaction)
    }
}

module.exports = MintHandler