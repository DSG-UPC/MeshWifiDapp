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

    let funds = 1000000;

    // Initially, the Forwarding contract owns all tokens and the pricePerMB is set to 1.
    await token.balanceOf(Forwarding.address).then(result => {
      assert.equal(result, funds);
    })
    await dao.getPricePerMB().then(result => {
      pricePerMB = result.toNumber();
      assert.equal(result, 1);
    })

    // We start the monitoring for a given node.
    await forwarding.getInvoice(TestIP);


    await wait(500, `Obtaining monitoring values`);

    await forwarding.getProvider(0).then(result => {
      console.log(`Provider address: ${result}`)
      provider = result;
    })

    await forwarding.getTotalOwed().then(result => {
      console.log(`Monitoring result: ${result}`)
      forwarded = result.toNumber();
    })

    // We proceed with the payment
    await forwarding.startPayment();
    await wait(1000, `Resolving payments`);

    // Now we should check if our deductions were right.

    // First of all, check if the forwarded amount was deduced from the funds.
    await token.balanceOf(Forwarding.address).then(result => {
      console.log(`Balance of the forwarding contract after the iteration: ${result}`)
      let value = funds - forwarded;
      assert.equal(result.toNumber(), value);
    })

    // Then check if the provider has received the tokens.
    await token.balanceOf(provider).then(result => {
      console.log(`Balance of the provider after the iteration: ${result}`)
      assert.equal(result, forwarded);
    })

    // Finally, check if the pricePerMB has changed into the expected
    // value.
    await dao.getPricePerMB().then(result => {
      console.log(`New pricePerMB after the iteration: ${result}`)
      pricePerMB = result
      assert.equal(result, Math.floor(funds / forwarded));
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