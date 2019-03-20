const argv = require('minimist')(process.argv.slice(2));
const util = require('util');
const OracleDispatch = artifacts.require('OracleDispatch');
const exec = util.promisify(require('child_process').exec);
const path = require('path');
const parentDir = path.resolve(process.cwd());
const stopOracle = 'screen -X -S oracle quit';
let options = {
  'cwd': parentDir
};

const DAO = artifacts.require('DAO');
const EIP20 = artifacts.require('EIP20');
const Forwarding = artifacts.require('Forwarding');
const TestIP = 'localhost:9000'

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
    let startOracle = 'screen -S oracle -L -dm node oracle/oracle.js --network staging --address ' + OracleDispatch.address
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

  it(`performs a real forwarding process with all the steps:
      - generate invoice for each node.
      - pay to each node what they deserve (or a proportional part).
      - adjust price for next iteration`, async function () {

    let funds_first = 1000000,
      funds_second, funds_after;
    let owed_first, owed_second;
    let priceMB_first, priceMB_second;
    let provider;
    let debt_first, debt_second;
    let provider_balance_first, provider_balance_second;

    // Initially, the Forwarding contract owns all tokens and the pricePerMB is set to 1.
    await token.balanceOf(Forwarding.address).then(result => {
      assert.equal(result, funds_first);
    })
    await dao.getPricePerMB().then(result => {
      pricePerMB = result.toNumber();
      assert.equal(result, 1);
    })

    // We start the monitoring for a given node.
    await forwarding.getInvoice(TestIP);

    await wait(500, `Obtaining monitoring values for the FIRST iteration`);


    await forwarding.getProvider(0).then(result => {
      provider = result;
      console.log(`Provider address: ${provider}`)
    })

    await forwarding.getTotalOwed().then(result => {
      owed_first = result.toNumber();
      console.log(`Monitoring result for the FIRST iteration: ${owed_first}`)
    })

    // We proceed with the payment
    await forwarding.startPayment();
    await wait(1000, `Resolving payments for the FIRST iteration`);

    // Now we should check if our deductions were right.

    // First of all, check if the forwarded amount was deduced from the funds.
    await token.balanceOf(Forwarding.address).then(result => {
      funds_after = result.toNumber();
      console.log(`Balance of the forwarding contract after the FIRST iteration: ${funds_after}`)
      let value = funds_first - owed_first;
      assert.equal(funds_after, value);
    })

    // Then check if the provider has received the tokens.
    await token.balanceOf(provider).then(result => {
      provider_balance_first = result.toNumber()
      console.log(`Balance of the provider after the FIRST iteration: ${provider_balance_first}`)
      assert.equal(provider_balance_first, owed_first);
    })

    // Then check if the debt with the provider is 0.
    await forwarding.getDebt(provider).then(result => {
      debt_first = result.toNumber();
      console.log(`Debt with the provider after the FIRST iteration: ${debt_first}`)
      assert.equal(debt_first, 0);
    })

    // Finally, check if the pricePerMB has changed into the expected
    // value.
    await dao.getPricePerMB().then(result => {
      priceMB_first = result.toNumber()
      console.log(`New pricePerMB after the FIRST iteration: ${priceMB_first}`)
      assert.equal(priceMB_first, Math.floor(funds_first / owed_first));
      funds_first = funds_second = funds_after;
    })



    //// SECOND ITERATION ////

    // We will increase the price per mb 

    // We start the monitoring for a given node.
    await forwarding.getInvoice(TestIP);

    await wait(500, `\n\n\nObtaining monitoring values for SECOND iteration`);

    await forwarding.getTotalOwed().then(result => {
      owed_second = result.toNumber();
      console.log(`Monitoring result of the SECOND iteration: ${owed_second}`)
    })

    // We proceed with the payment
    await forwarding.startPayment();
    await wait(1000, `Resolving payments for SECOND iteration`);

    // First of all, check if the forwarded amount was deduced from the funds.
    await token.balanceOf(Forwarding.address).then(result => {
      funds_after = result.toNumber();
      console.log(`Balance of the forwarding contract after the SECOND iteration: ${funds_after}`)
      let value = funds_second - owed_second;
      value = value < 0 ? 0 : value;
      assert.equal(funds_after, value);
    });

    // Then check if the provider has received the tokens.
    await token.balanceOf(provider).then(result => {
      provider_balance_second = result.toNumber()
      console.log(`Balance of the provider after the SECOND iteration: ${provider_balance_second}`)
      let value = provider_balance_first + owed_second

      // If the value is over the maximum funds that can be transferred (1000000 in this case), we give the maximum to the provider and acquire a debt
      if (value > 1000000) {
        debt_second = value - 1000000;
        value = 1000000;
      } else {
        debt_second = 0;
      }
      assert.equal(provider_balance_second, value);
    });

    // Then check if the debt with the provider is 0.
    await forwarding.getDebt(provider).then(result => {
      console.log(`Debt with the provider after the SECOND iteration: ${debt_second}`)
      assert.equal(debt_second, result);
      assert(debt_second >= debt_first, "The debt in this iteration needs to be greater than or equal than in the previous one.");
    })

    // Finally, check if the pricePerMB has changed into the expected
    // value.
    await dao.getPricePerMB().then(result => {
      priceMB_second = result.toNumber()
      console.log(`New pricePerMB after the SECOND iteration: ${priceMB_second}`)
      assert.equal(priceMB_second, Math.floor(priceMB_first * (funds_second / owed_second)));
      assert(priceMB_second <= priceMB_first, "The price for this iteration needs to be lower than or equal than in the prvious one.");
      funds_second = funds_after;
    })

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