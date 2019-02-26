const SimpleInternetAccess = artifacts.require('./contracts/market/SimpleInternetAccess.sol')
const SimpleInternetAccessFactory = artifacts.require('./contracts/market/SimpleInternetAccessFactory.sol')
const argv = require('minimist')(process.argv.slice(2))
var jsonLookup = require('../build/contracts/DAO.json')
var jsonMyERC721 = require('../build/contracts/MyERC721.json')

contract('OracleTest', () => {
    var oracle, network, net_id, lookupAddress
    var accounts = []
    var factory
    network = argv['network']
    before('setup contract and accounts for each test', async () => {

        // Here we get all the active accounts.

        await web3.eth.getAccounts().then(a => {
            a.map(e => accounts.push(e))
        })

        // Then we get the current network.

        if (network == null || network == undefined)
            network = "development"
        else if (network === "staging")
            net_id = 7775
        else if (network === "production")
            net_id = 1516

        lookupAddress = jsonLookup.networks[net_id].address
    })
    it('Ensures that a contract between client and provider is accepted', async () => {
        let contracts = [],
            internetContract, pubKey = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCzflA+Y91Bm0LzcvWzkqSLjYo7mUA1rD6Uirk8Z54oKhB94NC8XW3YXPbRwIYGGsmjEEuNsoBq5WPOoomEnawVwhYB8F0ecBV8+JMzNdEmlmiRDjSExYim4UiDp9u9r7JU1/6OuoH+aoaQ/foWxCWATbysGE8KHh/BvrfrJR+gjQIDAQAB'
        let myERC721Address = jsonMyERC721.networks[net_id].address

        // We create the factory to generate new contracts.

        await SimpleInternetAccessFactory.new(lookupAddress, myERC721Address)
            .then(instance => {
                factory = instance
            })

        // We create a new contract for the second account in the list of generated accounts.

        await factory.createContract(accounts[2], 'localhost:9090', 'localhost:9000', 1024)

        // We get a list of the deployed contracts by provider

        await factory.getDeployedContractsbyProvider().then(a => {
            a.map(e => contracts.push(e))
        })

        // We get an instance of the created contract as an object

        await SimpleInternetAccess.at(contracts[0]).then(instance => {
            internetContract = instance
        })

        // We need to check whether the contract is accepted or not.
        // It is accepted only if the value passed as a parameter
        // is greater than the value maxData * pricePerMB (we have stated
        // both values when creating the contract).

        hexPubKey = web3.utils.hexToBytes(web3.utils.asciiToHex(pubKey))

        console.log(hexPubKey)

        await internetContract.acceptContract('localhost:9000', hexPubKey, 1023).then(result => {
            assert.isFalse(result)
        })

        await internetContract.acceptContract('localhost:9000', hexPubKey, 1025).then(result => {
            assert.isTrue(result)
        })

        console.log(internetContract.checkUsage())
    })
})
