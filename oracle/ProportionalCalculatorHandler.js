const OracleHandler = require('./OracleHandler')

class ProportionalCalculatorHandler extends OracleHandler {

    constructor(_account) {
        super();
        this.account = _account;
    }

    handle(_id, _recipient, _originator, result, callback) {
        let [owed, funds, total_owed] = result;
        console.log(`Owed: ${owed};\nFunds: ${funds};\nTotal owed: ${total_owed};\n`);
        result = {};
        result.proportional = Math.floor(owed * (funds / total_owed));
        result.provider = _originator;
        this.getTransaction(this.account, _recipient, result, callback);
    }

    getTransaction(account, recipient, result, callback) {
        console.log(`Proportional: ${result.proportional};\nProvider: ${result.provider}`);
        let transaction = {
            from: account,
            to: recipient,
            data: this.getWeb3().eth.abi.encodeFunctionCall({
                name: '__proportionalCallback',
                type: 'function',
                inputs: [{
                    type: 'address',
                    name: '_provider'
                }, {
                    type: 'uint256',
                    name: '_response'
                }]
            }, [result.provider, result.proportional]),
            gas: this.getWeb3().utils.numberToHex(300000)
        };
        callback(transaction);
    }
}

module.exports = ProportionalCalculatorHandler