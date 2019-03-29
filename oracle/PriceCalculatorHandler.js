const OracleHandler = require('./OracleHandler')

class PriceCalculatorHandler extends OracleHandler {

    constructor(_account) {
        super();
        this.account = _account;
    }

    handle(_id, _recipient, _originator, result, callback) {
        let [owed, funds, pricePerMB] = result;
        console.log(`Owed: ${owed};\nFunds: ${funds};\nPricePerMB: ${pricePerMB};\n`)
        let threshold = 0.95;
        let old_max_price = pricePerMB;
        let new_max_price = old_max_price;
        if (funds - owed >= 0) {
            if (threshold * funds >= owed) {
                new_max_price = Math.floor(new_max_price * (funds / owed));
                if (new_max_price == 1)
                    new_max_price = 2;
            }
        } else {
            new_max_price = Math.floor(new_max_price / (owed / funds));
            if (new_max_price < 1)
                new_max_price = 1;
        }
        this.getTransaction(this.account, _recipient, new_max_price, callback);
    }

    getTransaction(account, recipient, result, callback) {
        console.log("New price is: " + result);
        let transaction = {
            from: account,
            to: recipient,
            data: this.getWeb3().eth.abi.encodeFunctionCall({
                name: '__priceCalculatorCallback',
                type: 'function',
                inputs: [{
                    type: 'uint256',
                    name: '_response'
                }]
            }, [result]),
            gas: this.getWeb3().utils.numberToHex(300000)
        };
        console.log('Sending transaction from PriceCalculatorHandler')
        callback(transaction);
    }
}

module.exports = PriceCalculatorHandler