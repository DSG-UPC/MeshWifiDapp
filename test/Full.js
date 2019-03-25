const SimpleInternetAccess = artifacts.require('SimpleInternetAccess')
const SimpleInternetAccessFactory = artifacts.require('SimpleInternetAccessFactory')
const MyERC721 = artifacts.require("MyERC721");
const EIP20 = artifacts.require("EIP20");
const Crud = artifacts.require('CRUD');
const CrudFactory = artifacts.require('CRUDFactory');
const OracleDispatch = artifacts.require('OracleDispatch');
const Forwarding = artifacts.require("Forwarding");
const DAO = artifacts.require("DAO");
const EthCrypto = require('eth-crypto');

const MongoHandler = require('../database/src/MongoHandler');
const db = new MongoHandler('production');
const minimist = require('minimist'),
    argv = minimist(process.argv.slice(2), {
        string: ['network']
    })
const network = argv['network']
console.log(network);
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');
const parentDir = path.resolve(process.cwd());

const ProviderIP = '10.1.24.75';
const ClientIP = '10.1.24.74';
const MaxData = 1024;

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
const randomInt = getRandomInt(10000)

const stopOracle = 'screen -X -S oracle' + randomInt + ' quit';
let options = {
    //'cwd': parentDir+'/ethereum/'
    'cwd': parentDir + '/oracle/' //+'/ethereum/'
};

async function wait(ms, text) {
    var testPromise = new Promise(function (resolve, reject) {
        setTimeout(function () {
            console.log(text);
            resolve(text);
        }, ms);
    });
    var result = await testPromise;
}

function awaitEvent(event, handler) {
    return new Promise((resolve, reject) => {
        function wrappedHandler(...args) {
            Promise.resolve(handler(...args)).then(resolve).catch(reject);
        }
        event.watch(wrappedHandler);
    });
}


async function createIdentity() {
    const identity = await EthCrypto.createIdentity();
    return identity;
}
let Identity, pubKey

contract("1st test", async function (accounts) {

    before('Prepare Environment', async function () {
        // Create identity
        Identity = await createIdentity();
        console.log(Identity);
        pubKey = EthCrypto.publicKey.compress(Identity.publicKey).slice(2);
        // Start oracle server with test contract address
        console.log('OracleDispatch for Oracle !!! ' + OracleDispatch.address);
        let startOracle = 'screen -S oracle' + randomInt + ' -L -dm node oracle.js --network ' + network + ' --address ' + OracleDispatch.address;
        const {
            stdout,
            stderr
        } = await exec(startOracle, options);
        console.log('Starting Oracle');
        if (stderr) {
            console.error('Starting Oracle Error');
            console.error(stderr);
        }
        console.log(stdout);
        await wait(1000, 'Started Oracle');
        //db.removeAllData();
    });

    /*
    beforeEach('setup variables', async () => {
      let a = 1;
    });
    */

    after('Clear Environment', async function () {
        // Stop Oracle server
        const {
            stdout,
            stderr
        } = await exec(stopOracle, options);
        console.log('Stop Oracle');
        if (stderr) {
            console.log('Stop Oracle Error');
            console.error(stderr);
        }
        console.log(stdout);
    });

    it("mint a new device and store it in routers CRUD struct", async function () {
        let AdminAccount, ReserveAccount, ClientAccount, ProviderAccount
        const dao = await DAO.deployed();
        await dao.getReserveAccount().then(i => {
            ReserveAccount = i;
        })
        if (network == 'staging') {
            AdminAccount = accounts[0];
            ClientAccount = accounts[1];
            ProviderAccount = accounts[2];
        } else {
            AdminAccount = accounts[3];
            ClientAccount = accounts[4];
            ProviderAccount = accounts[5];
        }
        console.log(`Admin account: ${AdminAccount};
                    \nClient account: ${ClientAccount};
                    \nProvider account: ${ProviderAccount}`)
        // Transfer tokens from reserve account to the other accounts
        const eip20 = await EIP20.deployed();
        await eip20.balanceOf(AdminAccount).then(i => {
            console.log('Admin: ' + AdminAccount + '\tTokens: ' + i);
        });
        await eip20.balanceOf(Forwarding.address).then(i => {
            console.log('Forwarding/Reserve: ' + Forwarding.address + '\tTokens: ' + i);
        });
        await eip20.transfer(ClientAccount, 2000, {
            from: AdminAccount
        });
        await eip20.transfer(ProviderAccount, 2000, {
            from: AdminAccount
        });

        // Client Check if device is minted and mint device
        const cfact = await CrudFactory.deployed();
        const clientsAddr = await cfact.getClients.call();
        const clients = await Crud.at(clientsAddr);
        let exists = await clients.exists.call(ClientIP);
        if (!exists) {

            const erc721 = await MyERC721.deployed();
            console.log('Erc721 ' + erc721.address);
            await erc721.requestClientMint(ClientIP, {
                from: ClientAccount,
                gas: web3.utils.numberToHex(5876844)
            });
            console.log('Waiting for mint...');
            await wait(3000, '');
            exists = await clients.exists.call(ClientIP);
            console.log('1');
            let clientsEntry = await clients.getByIP.call(ClientIP);
            console.log(clientsEntry);
            let tokenEntry = await erc721.ownerOf(clientsEntry.uid);
            assert.equal(tokenEntry, ClientAccount,
                'The owner of the token is  not registered correctly in the ERC721');
            console.log('client device minted');
        }

        // Client create identity

        // Client deploy Internet contract
        const internetAccessFactory = await SimpleInternetAccessFactory.deployed();
        const testInternet = await internetAccessFactory.createContract(
            //ProviderAccount, ProviderIP, MaxData, '0x'+pubKey, {
            ProviderAccount, ProviderIP, MaxData, '0x0', {
                from: ClientAccount,
                //gas: web3.utils.numberToHex(5876844)
            })
        console.log('Internet contract created');
        const internetAccessAddress = await internetAccessFactory.getDeployedContractsbyClient({
            from: ProviderAccount
        })
        //console.log(internetAccessAddress[0]);
        const internetAccess = await SimpleInternetAccess.at(internetAccessAddress[0]);
        // Client allowance to simpleinternet access
        const price = await internetAccess.pricePerMB.call();
        console.log('Establishing contract with price/MB ' + price + ' and max MB: ' + MaxData);
        await eip20.approve(internetAccess.address, MaxData * price, {
            from: ClientAccount
        })
        console.log('Client approved allowance to contract');

        console.log('Point 4');
        // provider accept contract
        // var providerBefore = await eip20.balanceOf(ProviderAccount)
        // var clientBefore = await eip20.balanceOf(ClientAccount)
        //var identity = await web3.eth.accounts.create()
        //var rsa = identity.privateKey
        //var rsa_pub = identity.address
        // TODO Encrypt message
        await internetAccess.acceptContract('NorthMacedonia', {
            from: ProviderAccount
        })
        console.log('Provider Accepted contract');

        //provider launch monitoring
        await internetAccess.checkUsage({
            from: ProviderAccount
        })
        console.log('Provider checking usage');

        // var clientAfter = await eip20.balanceOf(ClientAccount);
        // var providerAfter = await eip20.balanceOf(ProviderAccount);

        //provider poll for check in state of payment
        var isTransferred = await internetAccess.sentToProvider.call();
        assert.isTrue(isTransferred, 'Token transference to the provider went wrong');
        // assert(clientAfter < clientBefore, 'Wrong token amount in user wallet')
        // assert(providerAfter > providerBefore, 'Wrong token amount in provider wallet')
        /*await internetAccess.acceptContract();*/





        ////// FORWARDING //////

        // Once the client has accepted the contract we can continue with the Forwarding process.

        await Forwarding.deployed().then(instance => {
            forwarding = instance;
        });

        // Initially, the Forwarding contract (which is the reserve account) owns all tokens
        // and the pricePerMB is set to 1.
        await eip20.balanceOf(Forwarding.address).then(result => {
            assert.equal(result, funds_first);
        })
        await dao.getPricePerMB().then(result => {
            pricePerMB = result.toNumber();
        })

        // We start the monitoring for the provider node.
        await forwarding.getInvoice(ProviderIP);

        await wait(100, `\n\nObtaining monitoring values for the FIRST iteration\n\n`);

        await forwarding.getProvider(0).then(result => {
            provider1 = result;
            console.log(`First provider address: ${provider1}`)
        })

        await forwarding.getTotalOwed().then(result => {
            owed_first_iteration = result.toNumber();
            console.log(`Monitoring result for the FIRST iteration: ${owed_first_iteration}`)
        })

        await forwarding.amount_per_provider(provider1).then(result => {
            owed_first_provider = result.toNumber();
            console.log(`Owed to the first provider in this iteration: ${owed_first_provider}`)
        })

        // We proceed with the payment
        await forwarding.startPayment();
        await wait(100, `\n\nResolving payments for the FIRST iteration\n\n`);

        // First of all, check if the forwarded amount was deduced from the funds.
        await eip20.balanceOf(Forwarding.address).then(result => {
            funds_after = result.toNumber();
            console.log(`Balance of the forwarding contract after the FIRST iteration: ${funds_after}`)
            let value = funds_first - owed_first_iteration;
            assert.equal(funds_after, value);
        })

        // Then check if the provider has received the tokens.
        await eip20.balanceOf(provider1).then(result => {
            provider1_balance_first = result.toNumber()
            console.log(`Balance of the first provider after the FIRST iteration: ${provider1_balance_first}`)
            assert.equal(provider1_balance_first, 3000);
        })

        // Then check if the debt with the provider is 0.
        await forwarding.getDebt(provider1).then(result => {
            debt_first_provider1 = result.toNumber();
            console.log(`Debt with the first provider after the FIRST iteration: ${debt_first_provider1}`)
            assert.equal(debt_first_provider1, 0);
        });

        // Finally, check if the pricePerMB has changed into the expected
        // value.
        await dao.getPricePerMB().then(result => {
            priceMB_first = result.toNumber()
            console.log(`New pricePerMB after the FIRST iteration: ${priceMB_first}`)
            assert(pricePerMB < priceMB_first, "The price per mb now is greater than before");
            funds_first = funds_second = funds_after;
        });
    });

});