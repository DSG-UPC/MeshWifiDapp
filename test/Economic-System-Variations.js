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
const minimist = require('minimist'),
    argv = minimist(process.argv.slice(2), {
        string: ['network']
    })
const network = argv['network']
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');
const parentDir = path.resolve(process.cwd());

const fs = require('fs');

const MaxData = 512;
const NS_PER_SEC = 1e9;
const MS_PER_NS = 1e-6;

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
const randomInt = getRandomInt(10000)

const stopOracle = 'screen -X -S oracle' + randomInt + ' quit';
let oracleOptions = {
    'cwd': parentDir + '/oracle/'
};
const stopEventListener = 'screen -X -S events' + randomInt + ' quit';
let eventOptions = {
    //'cwd': parentDir+'/ethereum/'
    'cwd': parentDir + '/test/' //+'/ethereum/'
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
let Identity, pubKey;

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
        } = await exec(startOracle, oracleOptions);
        console.log('Starting Oracle');
        if (stderr) {
            console.error('Starting Oracle Error');
            console.error(stderr);
        }
        console.log(stdout);
        await wait(1000, 'Started Oracle');
    });

    after('Clear Environment', async function () {
        // Stop Oracle server
        const {
            stdout,
            stderr
        } = await exec(stopOracle, oracleOptions);
        console.log('Stop Oracle');
        if (stderr) {
            console.log('Stop Oracle Error');
            console.error(stderr);
        }
        console.log(stdout);
        /*
        const {
            stdout1,
            stderr1
        } = await exec(stopEventListener, eventOptions);
        console.log('Stop EventListener');
        if (stderr1) {
            console.log('Stop EventListener Error');
            console.error(stderr1);
        }
        console.log(stdout1);
        */
    });

    it("Economic system variations", async function () {

        afterTime = new Date();

        let AdminAccount, ReserveAccount, ClientAccounts, ProviderAccounts
        async function printBalances(eip20, forwarding, iaccess) {
            if (eip20) {
                await eip20.balanceOf(AdminAccount).then(i => {
                    console.log('Admin: ' + AdminAccount + '\tTokens: ' + i);
                });
                for (var n = 0; n < ProviderAccounts.length; n++) {
                  await eip20.balanceOf(ProviderAccounts[n]).then(i => {
                        console.log('Provider '+ (n+1) +': ' + ProviderAccounts[n] + '\tTokens: ' + i);
                  });
                }
                /*await eip20.balanceOf(ClientAccounts).then(i => {
                    var n;
                    for (n = 0; n < ClientAccounts.length; n++) {
                      console.log('Client '+ n+1 +': ' + ClientAccounts[n] + '\tTokens: ' + i);
                    }
                });*/
            }
            if (forwarding) {
                await eip20.balanceOf(forwarding.address).then(i => {
                    console.log('Forwarding/Reserve: ' + forwarding.address + '\tTokens: ' + i);
                })
            };
            if (iaccess) {
                await eip20.balanceOf(iaccess.address).then(i => {
                    console.log('Internet Access: ' + iaccess.address + '\tTokens: ' + i);
                })
            };
        }
        const dao = await DAO.deployed();
        await dao.getReserveAccount().then(i => {
            ReserveAccount = i;
        })
        if (network == 'staging') {
            AdminAccount = accounts[0];
            ProviderAccounts = new Array(accounts[1],accounts[2]);
        } else {
            console.log('Please, use "staging" confinguration for the network.');
        }
        // Transfer tokens from reserve account to the other accounts
        const eip20 = await EIP20.deployed();

        printBalances(eip20);

        /*
        await eip20.transfer(ProviderAccount, 50, {
            from: AdminAccount
        });
        */


        ////// EXPERIMENT VARIABLES ///////

        nDevices = 4
        nProviders = 2
        iteration = 0

        ///  TODO calculation of how many devices per provider
        // NOTE: the owner 0 is the admin account
        deviceOwner = [1,1,2,2]


        //The device id can be the IP or the guifi.net node name. In our implementation is the node name.
        devicesID = new Array(nDevices)

        providers = new Array(nProviders)


        await wait(5000, 'Starting Forwarding process');

        ////// FORWARDING //////


        // Once the client has accepted the contract we can continue with the Forwarding process.

        await Forwarding.deployed().then(instance => {
            forwarding = instance;
        });



        // Initially, the Forwarding contract (which is the reserve account) owns all tokens
        // and the pricePerMB is set to 1.
        await eip20.balanceOf(Forwarding.address).then(result => {
            funds_first = result.toNumber();
            console.log(`Balance of the Forwarding contract (funds account): ${funds_first}`);
        })
        await dao.getPricePerMB().then(result => {
            pricePerMB = result.toNumber();
            console.log(`The current price per MB is: ${pricePerMB}`);
        })

        for (var i=0; i<nDevices; i++){
          // Avoid space
          query = "{\"deviceid\":"+i+",\"iteration\":"+iteration+",\"owner\":"+deviceOwner[i]+"}";
          console.log(`Query sent to the forwarding contract ${query}`);
          await forwarding.getInvoiceFake(query);
        }

        await wait(1000, `\n\nObtaining monitoring values for the FIRST iteration\n\n`);

        for (var i=0; i<nProviders; i++){
          await forwarding.getProvider(i).then(result => {
              providers[i] = result;
              console.log(`Provider address: ${providers[i]}`)
          })
        }


        await forwarding.getTotalOwed().then(result => {
            owed_first_iteration = result.toNumber();
            console.log(`Monitoring result for the FIRST iteration: ${owed_first_iteration}`)
        })

        for (var i=0; i<nProviders; i++){
          await forwarding.amount_per_provider(providers[i]).then(result => {
              owed_provider = result.toNumber();
              console.log(`Owed to the provider ${i+1} in this iteration: ${owed_provider}`)
          })
        }


        // We proceed with the payment
        await forwarding.startPayment();
        await wait(1000, `\n\nResolving payments for the FIRST iteration\n\n`);

        // First of all, check if the forwarded amount was deduced from the funds.
        await eip20.balanceOf(Forwarding.address).then(result => {
            funds_after = result.toNumber();
            console.log(`Balance of the forwarding contract after the FIRST iteration: ${funds_after}`)
            let value = funds_first - owed_first_iteration;
            assert.equal(funds_after, value);
        })

        // Then check if the provider has received the tokens.
        for (var i=0; i<nProviders; i++){
          await eip20.balanceOf(providers[i]).then(result => {
              provider1_balance_first = result.toNumber()
              console.log(`Balance of the provider ${i+1} after the FIRST iteration: ${provider1_balance_first}`)
              //assert.equal(provider1_balance_first, 3000);
          })
        }


        // Then check if the debt with the provider is 0.
        //await forwarding.getDebt(provider1).then(result => {
        //    debt_first_provider1 = result.toNumber();
        //    console.log(`Debt with the provider after the FIRST iteration: ${debt_first_provider1}`)
        //    assert.equal(debt_first_provider1, 0);
        //});

        // Finally, check if the pricePerMB has changed into the expected
        // value.
        await dao.getPricePerMB().then(result => {
            priceMB_first = result.toNumber()
            console.log(`New pricePerMB after the FIRST iteration: ${priceMB_first}`)
            //assert(pricePerMB < priceMB_first, "The price per mb now is greater than before");
            funds_first = funds_second = funds_after;
        });



        await wait(5000, 'Full process is finished')

    });

});

function getTime(time) {
    return (time[0] * NS_PER_SEC + time[1]) * MS_PER_NS
}

function dateFormat(date) {
    return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}`
}
