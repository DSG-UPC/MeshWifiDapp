const OracleHandler = require('./OracleHandler')

class PricePerProviderCalculatorHandler extends OracleHandler {

    constructor(_account) {
        super();
        this.account = _account;
    }

    handle(_id, _recipient, _originator, result, callback) {
        let [devices_provider, num_devices, num_providers, price_system] = result;
        console.log(`Devices provider: ${devices_provider};\nTotal devices: ${num_devices};\nTotal providers: ${num_providers};\n`)

        // Fixed values
        let minPricePerMB = 10;
        let maxPricePerMB = 30;
        let num_devicesIncentiveMax = Math.floor(3/2*num_devices/num_providers)

        let price = minPricePerMB;

        if (price_system != "fixed") {
          price = minPricePerMB + (maxPricePerMB - minPricePerMB) / (num_devicesIncentiveMax - 1) * (devices_provider - 1);

          if (price_system=="max" && price > maxPricePerMB) {
            price = maxPricePerMB;
          }
        }

        let response = {};
        response.response = price;
        response.provider = _originator;

        this.getTransaction(this.account, _recipient, response, callback);
    }

    getTransaction(account, recipient, response, callback) {
        console.log("The price for "+ response.provider +" provider is: " + response.response);

        let transaction = {
            from: account,
            to: recipient,
            data: this.getWeb3().eth.abi.encodeFunctionCall({
                name: '__pricePerProviderCalculatorCallback',
                type: 'function',
                inputs: [{
                    type: 'uint256',
                    name: '_response'
                }, {
                    type: 'address',
                    name: '_provider'
                }]
            }, [response.response, response.provider]),
            gas: this.getWeb3().utils.numberToHex(300000)
        };
        console.log('Sending transaction from PricePerProviderCalculatorHandler')
        callback(transaction);
    }
}

module.exports = PricePerProviderCalculatorHandler
