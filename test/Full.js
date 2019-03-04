const SimpleInternetAccess = artifacts.require('SimpleInternetAccess')
const SimpleInternetAccessFactory = artifacts.require('SimpleInternetAccessFactory')
const MyERC721 = artifacts.require("MyERC721");
const EIP20 = artifacts.require("EIP20");
const Crud = artifacts.require('CRUD');
const CrudFactory = artifacts.require('CRUDFactory');
const OracleDispatch = artifacts.require('OracleDispatch');
const EthCrypto = require('eth-crypto');

const MongoHandler = require('../database/src/MongoHandler');
const db = new MongoHandler('production');
const network = 'meshdapp'
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
        Identity = await createIdentity();
        console.log(Identity);
        pubKey = EthCrypto.publicKey.compress(Identity.publicKey).slice(2);
        // Start oracle server with test contract address
        console.log('OracleDispatch for Oracle !!! ' + OracleDispatch.address);
        let startOracle = 'screen -S oracle'+randomInt+' -L -dm node oracle.js --network '+network+' --address ' + OracleDispatch.address;
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
        let ReserveAccount, ClientAccount, ProviderAccount
        if (network == 'staging'){
          ReserveAccount = accounts[0];
          ClientAccount = accounts[1];
          ProviderAccount = accounts[2];
        } else {
          ReserveAccount = accounts[3];
          ClientAccount = accounts[4];
          ProviderAccount = accounts[5];
        }
        // Client Check if device is minted and mint device
        const cfact = await CrudFactory.deployed();
        console.log(cfact.address);
        const clientsAddr = await cfact.getClients.call();
        const clients = await Crud.at(clientsAddr);
        let exists = await clients.exists.call(ClientIP);
        if (!exists) {

            const erc721 = await MyERC721.deployed();
            await erc721.requestClientMint(ClientIP, {
                from: ClientAccount,
                gas: web3.utils.numberToHex(5876844)
            });
            console.log('Waiting for mint...');
            await wait(3000, '');
            exists = await clients.exists.call(ClientIP);
            console.log(exists);
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
        console.log(internetAccessFactory.address);
        const testInternet = await internetAccessFactory.createContract(
            //ProviderAccount, ProviderIP, MaxData, '0x'+pubKey, {
            ProviderAccount, ProviderIP, MaxData, '0x0', {
                from: ClientAccount,
                //gas: web3.utils.numberToHex(5876844)
            })
        console.log(testInternet);
        console.log('Internet contract created');
        const internetAccessAddress = await internetAccessFactory.getDeployedContractsbyClient({from:ProviderAccount})
        console.log(typeof internetAccessAddress);
        console.log(internetAccessAddress);
        const internetAccess = await SimpleInternetAccess.at(internetAccessAddress[internetAccessAddress.length()-1]);

        // Client allowance to simpleinternet access
        const eip20 = await EIP20.deployed();
        eip20.approve(internetAccess, MaxData * internetAccess.pricePerMB, {
            from: ClientAccount
        })
        console.log('Client transfered to contract');

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
        var isTransferred = await internetAccess.sentToProvider
        assert.isTrue(isTransferred, 'Token transference to the provider went wrong')
        // assert(clientAfter < clientBefore, 'Wrong token amount in user wallet')
        // assert(providerAfter > providerBefore, 'Wrong token amount in provider wallet')
        /*await internetAccess.acceptContract();*/

    });

});
