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
const moment = require('moment')
const minimist = require('minimist'),
    argv = minimist(process.argv.slice(2), {
        string: ['network']
    })
const network = argv['network']
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');
const parentDir = path.resolve(process.cwd());

const ProviderIP = '10.1.24.75';
const ClientIP = '10.1.24.74';
const MaxData = 512;
const NS_PER_SEC = 1e9;
const MS_PER_NS = 1e-6;

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

        await wait(6000, 'Starting the minting process');

        let AdminAccount, ReserveAccount, ClientAccount, ProviderAccount
        async function printBalances(eip20, forwarding, iaccess) {
            if (eip20) {
                await eip20.balanceOf(AdminAccount).then(i => {
                    console.log('Admin: ' + AdminAccount + '\tTokens: ' + i);
                });
                await eip20.balanceOf(ProviderAccount).then(i => {
                    console.log('Provider: ' + ProviderAccount + '\tTokens: ' + i);
                });
                await eip20.balanceOf(ClientAccount).then(i => {
                    console.log('Client: ' + ClientAccount + '\tTokens: ' + i);
                });
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

        printBalances(eip20);
        await eip20.transfer(ClientAccount, 1024, {
            from: AdminAccount
        });
        /*
        await eip20.transfer(ProviderAccount, 50, {
            from: AdminAccount
        });
        */

        // Client Check if device is minted and mint device
        const cfact = await CrudFactory.deployed();
        const clientsAddr = await cfact.getClients.call();
        const clients = await Crud.at(clientsAddr);
        let exists = await clients.exists.call(ClientIP);
        time = process.hrtime();
        if (!exists) {
            const erc721 = await MyERC721.deployed();
            console.log('Erc721 ' + erc721.address);
            receipt = await erc721.requestClientMint(ClientIP, {
                from: ClientAccount,
                gas: web3.utils.numberToHex(5876844)
            });
            console.log('Waiting for mint...');
            await wait(3000, '');
            exists = await clients.exists.call(ClientIP);
            let clientsEntry = await clients.getByIP.call(ClientIP);
            //console.log(clientsEntry);
            let tokenEntry = await erc721.ownerOf(clientsEntry.uid);
            assert.equal(tokenEntry, ClientAccount,
                'The owner of the token is  not registered correctly in the ERC721');
            console.log('client device minted');
        }

        diff = process.hrtime(time);

        let gasUsed = receipt.receipt.gasUsed;
        console.log(`GasUsed for minting : ${gasUsed}`);
        let tx = await web3.eth.getTransaction(receipt.tx);
        let gasPrice = tx.gasPrice;
        console.log(`GasPrice: ${gasPrice}`);

        minting_time = (diff[0] * NS_PER_SEC + diff[1]) * MS_PER_NS

        console.log(`\n\nBenchmark for Minting took ${minting_time} milliseconds\n\n`);
        await wait(6000, 'Starting Internet contract creation between client and provider')




        // Client create identity

        // Client deploy Internet contract
        time = process.hrtime();


        const internetAccessFactory = await SimpleInternetAccessFactory.deployed();
        const testInternet = await internetAccessFactory.createContract(
            //ProviderAccount, ProviderIP, MaxData, '0x'+pubKey, {
            ProviderAccount, ProviderIP, MaxData, '0x0', {
                from: ClientAccount,
                //gas: web3.utils.numberToHex(5876844)
            }
        )

        const internetAccessAddress = await internetAccessFactory.getDeployedContractsbyClient({
            from: ProviderAccount
        })
        console.log('Internet contract created: ' + internetAccessAddress[0]);
        const internetAccess = await SimpleInternetAccess.at(internetAccessAddress[0]);

        // Client allowance to simpleinternet access
        const price = await internetAccess.pricePerMB.call();
        console.log('Establishing contract with price/MB ' + price + ' and max MB: ' + MaxData);
        await eip20.approve(internetAccess.address, MaxData * price, {
            from: ClientAccount
        })
        let allowance = await eip20.allowance.call(ClientAccount, internetAccess.address)
        await eip20.balanceOf(ClientAccount).then(i => {
            console.log('Client Tokens: ' + i);
            assert.isAtLeast(parseInt(i), parseInt(allowance), 'Client allowance higher than total tokens')
        });
        assert.equal(parseInt(allowance), parseInt(MaxData * price), 'Token transfer to the Internet contract went wrong');
        console.log('Client approved allowance to contract: ' + allowance + ' tokens');

        printBalances(eip20, Forwarding, internetAccess);
        //let testlog = await internetAccess.getUsers.call()
        //console.log(JSON.stringify(testlog, null, "  "));

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

        diff = process.hrtime(time);

        console.log('Provider checking usage');

        await eip20.balanceOf(ClientAccount).then(result => {
            assert(result.toNumber(), 512);
        })

        await eip20.balanceOf(internetAccess.address).then(result => {
            assert(result.toNumber(), 512);
        });

        // assert(clientAfter < clientBefore, 'Wrong token amount in user wallet')
        // assert(providerAfter > providerBefore, 'Wrong token amount in provider wallet')
        /*await internetAccess.acceptContract();*/

        internet_contract_time = (diff[0] * NS_PER_SEC + diff[1]) * MS_PER_NS

        console.log(`\n\nBenchmark for Internet Contract acceptance took ${internet_contract_time} milliseconds\n\n`);






        await wait(6000, 'Starting Forwarding process');

        ////// FORWARDING //////

        time = process.hrtime();

        // Once the client has accepted the contract we can continue with the Forwarding process.

        await Forwarding.deployed().then(instance => {
            forwarding = instance;
        });

        // Initially, the Forwarding contract (which is the reserve account) owns all tokens
        // and the pricePerMB is set to 1.
        await eip20.balanceOf(Forwarding.address).then(result => {
            funds_first = result.toNumber();
        })
        await dao.getPricePerMB().then(result => {
            pricePerMB = result.toNumber();
        })

        // We start the monitoring for the provider node.
        await forwarding.getInvoice(ProviderIP);

        await wait(1000, `\n\nObtaining monitoring values for the FIRST iteration\n\n`);

        await forwarding.getProvider(0).then(result => {
            provider1 = result;
            console.log(`Provider address: ${provider1}`)
        })

        await forwarding.getTotalOwed().then(result => {
            owed_first_iteration = result.toNumber();
            console.log(`Monitoring result for the FIRST iteration: ${owed_first_iteration}`)
        })

        await forwarding.amount_per_provider(provider1).then(result => {
            owed_first_provider = result.toNumber();
            console.log(`Owed to the provider in this iteration: ${owed_first_provider}`)
        })

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
        await eip20.balanceOf(provider1).then(result => {
            provider1_balance_first = result.toNumber()
            console.log(`Balance of the provider after the FIRST iteration: ${provider1_balance_first}`)
            assert.equal(provider1_balance_first, 3000);
        })

        // Then check if the debt with the provider is 0.
        await forwarding.getDebt(provider1).then(result => {
            debt_first_provider1 = result.toNumber();
            console.log(`Debt with the provider after the FIRST iteration: ${debt_first_provider1}`)
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

        diff = process.hrtime(time);

        forwarding_contract_time = (diff[0] * NS_PER_SEC + diff[1]) * MS_PER_NS

        console.log(`\n\nBenchmark for Forwarding took ${forwarding_contract_time} milliseconds\n\n`);




        /// SECOND ITERATION ///




        // First of all we need to reduce the price into 331 to get a
        // fair result where the price doesn't change.

        await dao.setPricePerMB(331);

        // We start the monitoring for two nodes.
        await forwarding.getInvoice(ProviderIP);

        await wait(1000, `\n\nObtaining monitoring values for the SECOND iteration\n\n`);

        await forwarding.amount_per_provider(provider1).then(result => {
            owed_first_provider = result.toNumber();
            console.log(`Owed to the provider in this iteration: ${owed_first_provider}`)
        })

        await forwarding.getTotalOwed().then(result => {
            owed_second_iteration = result.toNumber();
            console.log(`Monitoring result for the SECOND iteration: ${owed_second_iteration}`)
        })

        // We proceed with the payment
        await forwarding.startPayment();
        await wait(1000, `\n\nResolving payments for the SECOND iteration\n\n`);

        // Now we should check the results of the forwarding process.

        // First of all, check if the forwarded amount was deduced from the funds.
        await eip20.balanceOf(Forwarding.address).then(result => {
            funds_after = result.toNumber();
            console.log(`Balance of the forwarding contract after the SECOND iteration: ${funds_after}`)
            let value = funds_second - owed_second_iteration;
            assert.equal(funds_after, value);
        })

        // Then check if the provider has received the tokens.
        await eip20.balanceOf(provider1).then(result => {
            provider1_balance_second = result.toNumber()
            console.log(`Balance of the first provider after the SECOND iteration: ${provider1_balance_second}`)
            assert.equal(provider1_balance_second, provider1_balance_first + owed_first_provider);
        })

        // Then check if the debt with the provider is 0.
        await forwarding.getDebt(provider1).then(result => {
            debt_second_provider1 = result.toNumber();
            console.log(`Debt with the first provider after the SECOND iteration: ${debt_second_provider1}`)
            assert.equal(debt_second_provider1, 0);
        });

        // Finally, check if the pricePerMB has changed into the expected
        // value.
        await dao.getPricePerMB().then(result => {
            priceMB_second = result.toNumber()
            console.log(`New pricePerMB after the SECOND iteration: ${priceMB_second}`)
            assert.equal(priceMB_second, 331);
            funds_second = funds_third = funds_after;
        });





        //// THIRD ITERATION ////

        // First of all we need to reduce the price into 10 to get a
        // fair result where the price doesn't change.

        await dao.setPricePerMB(3);

        // We start the monitoring for two nodes.
        await forwarding.getInvoice(ProviderIP);

        await wait(1000, `\n\nObtaining monitoring values for the THIRD iteration\n\n`);

        await forwarding.amount_per_provider(provider1).then(result => {
            owed_first_provider = result.toNumber();
            console.log(`Owed to the provider in this iteration: ${owed_first_provider}`)
        })

        await forwarding.getTotalOwed().then(result => {
            owed_third_iteration = result.toNumber();
            console.log(`Monitoring result for the THIRD iteration: ${owed_third_iteration}`)
        })

        // We proceed with the payment
        await forwarding.startPayment();
        await wait(1000, `\n\nResolving payments for the THIRD iteration\n\n`);

        // Now we should check the results of the forwarding process.

        // First of all, check if the forwarded amount was deduced from the funds.
        await eip20.balanceOf(Forwarding.address).then(result => {
            funds_after = result.toNumber();
            console.log(`Balance of the forwarding contract after the THIRD iteration: ${funds_after}`)
            let value = funds_third - owed_third_iteration;
            if (value < 0)
                value = 0;
            assert.equal(funds_after, value);
        })

        // Then check if the provider has received the tokens.
        await eip20.balanceOf(provider1).then(result => {
            provider1_balance_third = result.toNumber()
            console.log(`Balance of the provider after the THIRD iteration: ${provider1_balance_third}, less than expected`)
            assert(provider1_balance_third < provider1_balance_second + owed_first_provider, "Only a proportional part is being paid");
        })

        // Then check if the debt with the provider is 0.
        await forwarding.getDebt(provider1).then(result => {
            debt_third_provider1 = result.toNumber();
            console.log(`Debt with the provider after the THIRD iteration: ${debt_third_provider1}`)
            assert(debt_third_provider1 > 0, "There must be some debt");
        });

        // Finally, check if the pricePerMB has changed into the expected
        // value.
        await dao.getPricePerMB().then(result => {
            priceMB_third = result.toNumber();
            console.log(`New pricePerMB after the THIRD iteration: ${priceMB_third}`);
            assert.equal(priceMB_third, 1);
            assert(priceMB_third < priceMB_second);
            funds_third = funds_after;
        });

        await wait(6000, 'Full process is finished')

    });

});
