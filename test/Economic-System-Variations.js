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

    });

    it("Economic system variations", async function () {
       this.timeout(3000000);

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


        ////// EXPERIMENT VARIABLES ///////

        // priceSystem = { "no_max" , "max" , "fixed" }
        priceSystem = "max"
        nProviders = 5

        deviceOwner = []
        iteration = 0
        minPricePerMB = 10
        maxPricePerMB = 30

        maxIterations = 29
        maxDevices = 62
       nDevices = 0


        ///  TODO calculation of how many devices per provider
        // nb of devices/provider at the beggining : unif(1,5)
        devices_provider = new Array(nProviders)

        // NOTE: the owner id 0 is the admin account
        for (var i = 0; i < nProviders; i++) {
          if (i%2 == 0) {
            devices_provider[i] = 1
            nDevices += 1
            deviceOwner.push(i+1)
          } else {
            devices_provider[i] = 3
            nDevices += 3
            deviceOwner.push(i+1,i+1,i+1)
          }
        }


        // We have to decide when a provider buys a new device, or not. We can fix a certain amount of tokens d.
        // When this amount is owned by a provider, he buys a new device with the probability p1 if it has less
        // than x% of the network size devices and with the probability p2 (< p1) in the other case.
        // The price for a new device is 150€. If the cost for maintaining a node
        priceNewDevice = 10000000000; // = d
        p1 = 0.7
        p2 = 0.2


        ////// EXPERIMENT OUPUT ///////

        output = []

        //The device id can be the IP or the guifi.net node name. In our implementation is the node name.
        devicesID = new Array(nDevices)

        providers = new Array(nProviders)

        const dao = await DAO.deployed();

        if (network == 'staging') {
            AdminAccount = accounts[0];
            ProviderAccounts = new Array(nProviders);
            for (var i = 0; i < nProviders; i++) {
              ProviderAccounts[i] = accounts[i+1];
            }

        } else {
            console.log('Please, use "staging" confinguration for the network.');
        }
        // Transfer tokens from reserve account to the other accounts
        const eip20 = await EIP20.deployed();


        await dao.setMinPricePerMB(minPricePerMB);
        await dao.setMaxPricePerMB(maxPricePerMB);

        await wait(5000, 'Starting Forwarding process');


        // The test will be:
        // see balances.
        // Get Monitoring Values (for all devices)
        // Get Invoice (for all providers)
        // see prices per MB per provider.
        // see owed to providers.
        // see total owed.
        // Start Payment
        // see balances.


        ////// FORWARDING //////


        // Once the client has accepted the contract we can continue with the Forwarding process.

        await Forwarding.deployed().then(instance => {
            forwarding = instance;
        });

        let funds;

        await eip20.balanceOf(Forwarding.address).then(result => {
            funds = result.toNumber();
            console.log(`Balance of the Forwarding contract (funds account): ${funds}`);
        })



        // Let's do several iterations.
        for (iteration = 0; iteration < maxIterations && funds > 0 && nDevices <= maxDevices; iteration++) {

          await wait(5000, '\n\n----- STARTING NEW ITERATION\n')

          let outputIteration = [];
          outputIteration.push(nDevices);
          for (var i = 0; i < nProviders; i++) {
            outputIteration.push(devices_provider[i]);
          }

          // Initially, the Forwarding contract (which is the reserve account) owns all tokens
          // and the pricePerMB is set to 1.
          await eip20.balanceOf(Forwarding.address).then(result => {
              funds_first = result.toNumber();
              funds = result.toNumber();
              console.log(`Balance of the Forwarding contract (funds account): ${funds_first}`);
          })
          printBalances(eip20);

          await wait(1000, `\n\nObtaining monitoring values for the ${iteration} iteration\n\n`);

          for (var i=0; i<nDevices; i++){
            query = "{\"deviceid\":"+i+",\"iteration\":"+iteration+",\"owner\":"+deviceOwner[i]+"}";
            console.log(`Query sent to the forwarding contract ${query}`);
            await forwarding.getMonitoringValues(query);
          }

          await wait(1000, `\n\nChecking provider addresses in Forwarding contract.\n\n`);


          for (var i=0; i<nProviders; i++){
            await forwarding.getProvider(i).then(result => {
                providers[i] = result;
                console.log(`Provider address: ${providers[i]}`)
            });
          }

          await wait(1000, `\n\nRecording data for analysing results.\n\n`);

          for (var i=0; i<nProviders; i++){
            await eip20.balanceOf(providers[i]).then(result => {
                balance = result.toNumber()
                outputIteration.push(balance)
            })
          }


          await wait(1000, `\n\nObtaining invoices for the ${iteration} iteration\n\n`);

          for (var i=0; i<nProviders; i++){
            switch (priceSystem) {
                case "max":
                  await forwarding.getInvoiceByAddress(providers[i]);
                  break;
                case "no_max":
                  await forwarding.getInvoiceByAddressNoMax(providers[i]);
                  break;
                case "fixed":
                  await forwarding.getInvoiceByAddressFixed(providers[i]);
                  break;
            }
          }



          await dao.getMinPricePerMB().then(result => {
              pricePerMB = result.toNumber();
              console.log(`The min price per MB is: ${pricePerMB}`);
          })

          // Every provider has different price/MB, depending on the number of devices it has.
          // It is in this function where the invoices are calculated.


          await forwarding.getTotalOwed().then(result => {
              owed_first_iteration = result.toNumber();
              console.log(`Total Owed in the ${iteration} iteration: ${owed_first_iteration} (sum of all the benefits)`)
          })

          for (var i=0; i<nProviders; i++){
            await forwarding.benefit_per_provider(providers[i]).then(result => {
                owed_provider = result.toNumber();
                console.log(`Benefit of the provider ${i+1} in this iteration: ${owed_provider} (10% of MB_forwarded * price_MB)`)
            })
          }
          await wait(1000, `\n\nPrice per MB per providers for the ${iteration} iteration\n\n`);

          for (var i=0; i<nProviders; i++){
            await forwarding.price_per_provider(providers[i]).then(result => {
                price = result.toNumber();
                console.log(`Price per MB of the provider ${i+1} in this iteration: ${price}`)
            })
          }


          // We proceed with the payment
          await forwarding.startPayment();
          await wait(1000, `\n\nResolving payments for the ${iteration} iteration\n\n`);

          // First of all, check if the forwarded amount was deduced from the funds.
          await eip20.balanceOf(Forwarding.address).then(result => {
              funds_after = result.toNumber();
              console.log(`Balance of the forwarding contract after the ${iteration} iteration: ${funds_after}`)
              let value = funds_first - owed_first_iteration;
              assert.equal(funds_after, value);
          })

          // Then check if the provider has received the tokens.
          for (var i=0; i<nProviders; i++){
            await eip20.balanceOf(providers[i]).then(result => {
                provider1_balance_first = result.toNumber()
                console.log(`Balance of the provider ${i+1} after the ${iteration} iteration: ${provider1_balance_first}`)
                //assert.equal(provider1_balance_first, 3000);
            })
          }



          // Finally, check if the pricePerMB has changed into the expected
          // value.
          await dao.getPricePerMB().then(result => {
              priceMB_first = result.toNumber()
              //console.log(`PricePerMB after the ${iteration} iteration: ${priceMB_first}`)
              //assert(pricePerMB < priceMB_first, "The price per mb now is greater than before");
              funds_first = funds_second = funds_after;
          });


          // //TODO paying costs of maintainment.
          // await wait(1000, `\n\nProviders paying costs for the devices in the ${iteration} iteration\n\n`);
          // for (var i=0; i<nProviders; i++){
          //   await eip20.balanceOf(providers[i]).then(result => {
          //       balance = result.toNumber();
          //       toPay = 0.9*balance;
          //       eip20.transfer(forwarding.address, toPay, {from: providers[i]});
          //       console.log(`The provider ${i+1} payed costs in the ${iteration} iteration: ${toPay}`)
          //   })
          // }


          // Now the providers decide if they buy a new device or not.
          let num_devicesIncentiveMax = Math.floor(3/2*nDevices/nProviders); // = x
          await wait(1000, `\n\nIs any provider going to buy a new device in the ${iteration} iteration? (the incentive maximun devices per provider is ${num_devicesIncentiveMax})\n\n`);


          for (var i=0; i<nProviders; i++){
            if (nDevices >= maxDevices) {
              console.log(`No more devices available. Max: ${nDevices}`);
              break;
            }
            await eip20.balanceOf(providers[i]).then(result => {
                balance = result.toNumber()
                if (balance < priceNewDevice) {
                  console.log(`Provider ${i+1} cannot buy a device in the ${iteration} iteration. It has ${balance}`)
                } else {
                  let p = Math.random();
                  if (devices_provider[i] < num_devicesIncentiveMax && p < p1 || devices_provider[i] >= num_devicesIncentiveMax && p < p2) {
                      console.log(`Provider ${i+1} BUYS a device in the ${iteration} iteration. p=${p}. It had ${balance} tokens and ${devices_provider[i]} devices.`);
                      devices_provider[i]++;
                      deviceOwner.push(i+1);
                      nDevices++;
                      eip20.transfer(forwarding.address, priceNewDevice, {from: providers[i]});
                  }
                }
            })
          }

          output.push(outputIteration)
        } // End interations

        console.log(`${output}`);



    });

});

function getTime(time) {
    return (time[0] * NS_PER_SEC + time[1]) * MS_PER_NS
}

function dateFormat(date) {
    return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}`
}
