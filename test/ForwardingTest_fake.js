///Mnemonic mutual fog maze oval novel estate state come erode timber early bar


// const argv = require('minimist')(process.argv.slice(2));
const util = require('util');
const OracleDispatch = artifacts.require('OracleDispatch');
const exec = util.promisify(require('child_process').exec);
const path = require('path');
const parentDir = path.resolve(process.cwd());
let options = {
  'cwd': parentDir
};
const minimist = require('minimist'),
    argv = minimist(process.argv.slice(2), {
        string: ['network']
    })
const network = argv['network']

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
const randomInt = getRandomInt(10000)
const stopOracle = 'screen -X -S oracle' + randomInt + ' quit';

const DAO = artifacts.require('DAO');
const EIP20 = artifacts.require('EIP20');
const Forwarding = artifacts.require('Forwarding');
const TestIP = 'localhost:3000'

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
      Promise.resolve(handler(...args)).then(resolve).catch(reject)
    }
    event.watch(wrappedHandler)
  });
}

contract("Test the forwarding contract", async function () {
  var forwarding, token, dao, forwarded;
  before('Prepare Environment', async function () {

    // Start oracle server with test contract address
    let startOracle = 'screen -S oracle' + randomInt + ' -L -dm node oracle/oracle.js --network ' + network + ' --address ' + OracleDispatch.address;
    const {
      stdout,
      stderr
    } = await exec(startOracle, options);
    console.log('Starting Oracle');

    if (stderr) {
      console.error('Starting Oracle Error')
      console.error(stderr)
    };

    console.log(stdout);
    await wait(1000, 'Started Oracle');

    await Forwarding.deployed().then(instance => {
      forwarding = instance;
    });

    await EIP20.deployed().then(instance => {
      token = instance;
    });

    await DAO.deployed().then(instance => {
      dao = instance;
    })
  })

  it(`performs the forwarding process (with mock data) with all the steps:
      - generate invoice for each node.
      - pay to each node what they deserve (or a proportional part).
      - adjust price for next iteration`, async function () {

    let funds_first = 1000000;

    // Initially, the Forwarding contract owns all tokens and the pricePerMB is set to 1.
    await token.balanceOf(Forwarding.address).then(result => {
      assert.equal(result, funds_first);
    })
    await dao.getPricePerMB().then(result => {
      pricePerMB = result.toNumber();
      assert.equal(result, 1);
    })

    // We start the monitoring for two nodes.
    await forwarding.getInvoice("1");
    await forwarding.getInvoice("2");

    await wait(100, `\n\nObtaining monitoring values for the FIRST iteration\n\n`);


    await forwarding.getProvider(0).then(result => {
      provider1 = result;
      console.log(`First provider address: ${provider1}`)
    })

    await forwarding.getProvider(1).then(result => {
      provider2 = result;
      console.log(`Second provider address: ${provider2}`)
    })

    await token.balanceOf(provider1).then(result => {
      initial_provider1 = result.toNumber();
      console.log(`First provider initial balance: ${initial_provider1}`);
    })

    await token.balanceOf(provider2).then(result => {
      initial_provider2 = result.toNumber();
      console.log(`Second provider initial balance: ${initial_provider2}`);
    })

    await forwarding.getTotalOwed().then(result => {
      owed_first_iteration = result.toNumber();
      console.log(`Monitoring result for the FIRST iteration: ${owed_first_iteration}`)
    })

    await forwarding.amount_per_provider(provider1).then(result => {
      owed_first_provider = result.toNumber();
      console.log(`Owed to the first provider in this iteration: ${owed_first_provider}`)
    })

    await forwarding.amount_per_provider(provider2).then(result => {
      owed_second_provider = result.toNumber();
      console.log(`Owed to the second provider in this iteration: ${owed_second_provider}`)
    })

    // We proceed with the payment
    await forwarding.startPayment();
    await wait(100, `\n\nResolving payments for the FIRST iteration\n\n`);

    // Now we should check the results of the forwarding process.

    // First of all, check if the forwarded amount was deduced from the funds.
    await token.balanceOf(Forwarding.address).then(result => {
      funds_after = result.toNumber();
      console.log(`Balance of the forwarding contract after the FIRST iteration: ${funds_after}`)
      let value = funds_first - owed_first_iteration;
      assert.equal(funds_after, value);
    })

    // Then check if the provider has received the tokens.
    await token.balanceOf(provider1).then(result => {
      provider1_balance_first = result.toNumber()
      console.log(`Balance of the first provider after the FIRST iteration: ${provider1_balance_first}`)
      assert.equal(provider1_balance_first, 3000 + initial_provider1);
    })

    // Then check if the provider has received the tokens.
    await token.balanceOf(provider2).then(result => {
      provider2_balance_first = result.toNumber()
      console.log(`Balance of the second provider after the FIRST iteration: ${provider2_balance_first}`)
      assert.equal(provider2_balance_first, 2000 + initial_provider2);
    })

    // Then check if the debt with the provider is 0.
    await forwarding.getDebt(provider1).then(result => {
      debt_first_provider1 = result.toNumber();
      console.log(`Debt with the first provider after the FIRST iteration: ${debt_first_provider1}`)
      assert.equal(debt_first_provider1, 0);
    });

    // Then check if the debt with the provider is 0.
    await forwarding.getDebt(provider2).then(result => {
      debt_first_provider2 = result.toNumber();
      console.log(`Debt with the second provider after the FIRST iteration: ${debt_first_provider2}`)
      assert.equal(debt_first_provider2, 0);
    });

    // Finally, check if the pricePerMB has changed into the expected
    // value.
    await dao.getPricePerMB().then(result => {
      priceMB_first = result.toNumber()
      console.log(`New pricePerMB after the FIRST iteration: ${priceMB_first}`)
      assert(pricePerMB < priceMB_first, "The price per mb now is greater than before");
      assert.equal(priceMB_first, Math.floor(funds_first / owed_first_iteration));
      funds_first = funds_second = funds_after;
    });

  })

  after('Clear Environment', async function () {
    // Stop Oracle server
    const {
      stdout,
      stderr
    } = await exec(stopOracle, options)
    console.log('Stop Oracle')
    if (stderr) {
      console.log('Stop Oracle Error')
      console.error(stderr)
    }
    console.log(stdout);
  });
})