const SimpleInternetAccess = artifacts.require('SimpleInternetAccess')
const SimpleInternetAccessFactory = artifacts.require('SimpleInternetAccessFactory')
const MyERC721 = artifacts.require("MyERC721");
const EIP20 = artifacts.require("EIP20");
const Crud = artifacts.require('CRUD');
const CrudFactory = artifacts.require('CRUDFactory');
const OracleDispatch = artifacts.require('OracleDispatch');
const EthCrypto = require('eth-crypto');

const MongoHandler = require('../../database/src/MongoHandler');
const db = new MongoHandler('production');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');
const parentDir = path.resolve(process.cwd());

const ProviderIP = '10.1.24.75';
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


function createIdentity() {
    const identity = await EthCrypto.createIdentity();
    return identity;
}
const Identity = createIdentity();
const pubKey = EthCrypto.publicKey.compress(Identity.publicKey).slice(2);

contract("1st test", async function (accounts) {

    before('Prepare Environment', async function () {
        // Start oracle server with test contract address
        console.log('OracleDispatch for Oracle !!! ' + OracleDispatch.address);
        let startOracle = 'screen -S oracle' + randomInt + ' -L -dm node oracle.js --network staging --address ' + OracleDispatch.address;
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
        const ReserveAccount = accounts[0];
        const ClientAccount = accounts[1];
        const ProviderAccount = accounts[2];
        // Client Check if device is minted and mint device
        let exists = await clients.exists.call(TestIP);
        if (!exists) {
            const cfact = await CrudFactory.deployed();
            const clientsAddr = await cfact.getClients.call();
            const clients = await Crud.at(clientsAddr);
            const erc721 = await MyERC721.deployed();
            await erc721.requestClientMint(TestIP, {
                from: ClientAccount,
                gas: web3.utils.numberToHex(600000)
            });
            console.log('Waiting for mint...');
            await wait(2000, '');
            exists = await clients.exists.call(TestIP);
            let clientsEntry = await clients.getByIP.call(TestIP);
            console.log(clientsEntry);
            let tokenEntry = await erc721.ownerOf(clientsEntry.uid);
            assert.equal(tokenEntry, ClientAccount,
                'The owner of the token is  not registered correctly in the ERC721');
            console.log('client device minted');
        }

        // Client allowance to simpleinternet access
        const eip20 = await EIP.deployed();
        eip20.approve(internetAccess, MaxData * internetAccess.pricePerMB, {
            from: ClientAccount
        })

        // Client create identity

        // Client deploy Internet contract
        const internetAccessFactory = SimpleInternetAccessFactory.deployed();
        const internetAccessAddress = await internetAccessFactory.createContract(
            ProviderAccount, ProviderIP, MaxData, '0x'+pubKey, {
                from: ClientAccount
            })
        const internetAccess = SimpleInternetAccess.at(internetAccessAddress);

        // provider accept contract
        // var providerBefore = await eip20.balanceOf(ProviderAccount)
        // var clientBefore = await eip20.balanceOf(ClientAccount)
        var identity = await web3.eth.accounts.create()
        var rsa = identity.privateKey
        var rsa_pub = identity.address
        // TODO Encrypt message
        await internetAccess.acceptContract('NorthMacedonia', {
            from: ProviderAccount
        })

        //provider launch monitoring
        await internetAccess.checkUsage({
            from: ProviderAccount
        })

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
