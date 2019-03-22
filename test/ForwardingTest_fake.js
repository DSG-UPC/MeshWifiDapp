/// anchor top public record goose parrot sorry must decade tongue main orphan


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

  it(`performs the forwarding process (with mock data) with all the steps:
      - generate invoice for each node.
      - pay to each node what they deserve (or a proportional part).
      - adjust price for next iteration`, async function () {

    let funds_first = 1000000,
      funds_second, funds_third, funds_after;
    let owed_first_iteration, owed_second_iteration, owed_third_iteration;
    let priceMB_first, priceMB_second, priceMB_third;
    let provider1, provider2;
    let debt_first, debt_second, debt_third;
    let provider_balance_first, provider_balance_second, provider_balance_third;

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

    await wait(500, `\n\nObtaining monitoring values for the FIRST iteration\n\n`);


    await forwarding.getProvider(0).then(result => {
      provider1 = result;
      console.log(`First provider address: ${provider1}`)
    })

    await forwarding.getProvider(1).then(result => {
      provider2 = result;
      console.log(`Second provider address: ${provider2}`)
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
    await wait(500, `\n\nResolving payments for the FIRST iteration\n\n`);

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
      assert.equal(provider1_balance_first, 3000);
    })

    // Then check if the provider has received the tokens.
    await token.balanceOf(provider2).then(result => {
      provider2_balance_first = result.toNumber()
      console.log(`Balance of the second provider after the FIRST iteration: ${provider2_balance_first}`)
      assert.equal(provider2_balance_first, 2000);
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
      assert.equal(priceMB_first, 200);
      funds_first = funds_second = funds_after;
    });




    //// SECOND ITERATION ////

    // First of all we need to reduce the price into 191 to get a
    // fair result where the price doesn't change.

    await dao.setPricePerMB(191);

    // We start the monitoring for two nodes.
    await forwarding.getInvoice("1");
    await forwarding.getInvoice("2");

    await wait(500, `\n\nObtaining monitoring values for the SECOND iteration\n\n`);

    await forwarding.amount_per_provider(provider1).then(result => {
      owed_first_provider = result.toNumber();
      console.log(`Owed to the first provider in this iteration: ${owed_first_provider}`)
    })

    await forwarding.amount_per_provider(provider2).then(result => {
      owed_second_provider = result.toNumber();
      console.log(`Owed to the second provider in this iteration: ${owed_second_provider}`)
    })

    await forwarding.getTotalOwed().then(result => {
      owed_second_iteration = result.toNumber();
      console.log(`Monitoring result for the SECOND iteration: ${owed_second_iteration}`)
    })

    // We proceed with the payment
    await forwarding.startPayment();
    await wait(500, `\n\nResolving payments for the SECOND iteration\n\n`);

    // Now we should check the results of the forwarding process.

    // First of all, check if the forwarded amount was deduced from the funds.
    await token.balanceOf(Forwarding.address).then(result => {
      funds_after = result.toNumber();
      console.log(`Balance of the forwarding contract after the SECOND iteration: ${funds_after}`)
      let value = funds_second - owed_second_iteration;
      assert.equal(funds_after, value);
    })

    // Then check if the provider has received the tokens.
    await token.balanceOf(provider1).then(result => {
      provider1_balance_second = result.toNumber()
      console.log(`Balance of the first provider after the SECOND iteration: ${provider1_balance_second}`)
      assert.equal(provider1_balance_second, provider1_balance_first + owed_first_provider);
    })

    // Then check if the provider has received the tokens.
    await token.balanceOf(provider2).then(result => {
      provider2_balance_second = result.toNumber()
      console.log(`Balance of the second provider after the SECOND iteration: ${provider2_balance_second}`)
      assert.equal(provider2_balance_second, provider2_balance_first + owed_second_provider);
    })

    // Then check if the debt with the provider is 0.
    await forwarding.getDebt(provider1).then(result => {
      debt_second_provider1 = result.toNumber();
      console.log(`Debt with the first provider after the SECOND iteration: ${debt_second_provider1}`)
      assert.equal(debt_second_provider1, 0);
    });

    // Then check if the debt with the provider is 0.
    await forwarding.getDebt(provider2).then(result => {
      debt_second_provider2 = result.toNumber();
      console.log(`Debt with the second provider after the SECOND iteration: ${debt_second_provider2}`)
      assert.equal(debt_second_provider2, 0);
    });

    // Finally, check if the pricePerMB has changed into the expected
    // value.
    await dao.getPricePerMB().then(result => {
      priceMB_second = result.toNumber()
      console.log(`New pricePerMB after the SECOND iteration: ${priceMB_second}`)
      assert.equal(priceMB_second, 191);
      assert.equal(priceMB_second, priceMB_second);
      funds_second = funds_third = funds_after;
    });





    //// THIRD ITERATION ////

    // First of all we need to reduce the price into 10 to get a
    // fair result where the price doesn't change.

    await dao.setPricePerMB(10);

    // We start the monitoring for two nodes.
    await forwarding.getInvoice("1");
    await forwarding.getInvoice("2");

    await wait(500, `\n\nObtaining monitoring values for the THIRD iteration\n\n`);

    await forwarding.amount_per_provider(provider1).then(result => {
      owed_first_provider = result.toNumber();
      console.log(`Owed to the first provider in this iteration: ${owed_first_provider}`)
    })

    await forwarding.amount_per_provider(provider2).then(result => {
      owed_second_provider = result.toNumber();
      console.log(`Owed to the second provider in this iteration: ${owed_second_provider}`)
    })

    await forwarding.getTotalOwed().then(result => {
      owed_third_iteration = result.toNumber();
      console.log(`Monitoring result for the THIRD iteration: ${owed_third_iteration}`)
    })

    // We proceed with the payment
    await forwarding.startPayment();
    await wait(500, `\n\nResolving payments for the THIRD iteration\n\n`);

    // Now we should check the results of the forwarding process.

    // First of all, check if the forwarded amount was deduced from the funds.
    await token.balanceOf(Forwarding.address).then(result => {
      funds_after = result.toNumber();
      console.log(`Balance of the forwarding contract after the THIRD iteration: ${funds_after}`)
      let value = funds_third - owed_third_iteration;
      if (value < 0)
        value = 0;
      assert.equal(funds_after, value);
    })

    // Then check if the provider has received the tokens.
    await token.balanceOf(provider1).then(result => {
      provider1_balance_third = result.toNumber()
      console.log(`Balance of the first provider after the THIRD iteration: ${provider1_balance_third}, less than expected`)
      assert(provider1_balance_third < provider1_balance_second + owed_first_provider, "Only a proportional part is being paid");
    })

    // Then check if the provider has received the tokens.
    await token.balanceOf(provider2).then(result => {
      provider2_balance_third = result.toNumber()
      console.log(`Balance of the second provider after the THIRD iteration: ${provider2_balance_third}, less than expected`)
      assert(provider2_balance_third < provider2_balance_second + owed_second_provider, "Only a proportional part is being paid");
    })

    // Then check if the debt with the provider is 0.
    await forwarding.getDebt(provider1).then(result => {
      debt_third_provider1 = result.toNumber();
      console.log(`Debt with the first provider after the THIRD iteration: ${debt_third_provider1}`)
      assert(debt_third_provider1 > 0, "There must be some debt");
    });

    // Then check if the debt with the provider is 0.
    await forwarding.getDebt(provider2).then(result => {
      debt_third_provider2 = result.toNumber();
      console.log(`Debt with the second provider after the THIRD iteration: ${debt_third_provider2}`)
      assert(debt_third_provider2 > 0, "There must be some debt");
    });

    // Finally, check if the pricePerMB has changed into the expected
    // value.
    await dao.getPricePerMB().then(result => {
      priceMB_third = result.toNumber();
      console.log(`New pricePerMB after the THIRD iteration: ${priceMB_third}`);
      assert.equal(priceMB_third, 8);
      assert(priceMB_third < priceMB_second);
      funds_third = funds_after;
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