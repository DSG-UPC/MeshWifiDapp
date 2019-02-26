const argv = require('minimist')(process.argv.slice(2))
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const path = require('path')
const parentDir = path.resolve(process.cwd())
const stopOracle = 'screen -X -S oracle quit'
let options = {
  'cwd': parentDir
}

const OracleDispatch = artifacts.require('OracleDispatch')
const Forwarding = artifacts.require('Forwarding')
const EIP20 = artifacts.require('EIP20')
const Handler = require('../database/src/MongoHandler')
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
  var forwarding, token, handler, accounts = []
  before('Prepare Environment', async function () {

    // Start oracle server with test contract address
    let startOracle = 'screen -S oracle -L -dm node oracle.js --network staging --address ' + OracleDispatch.address
    const {
      stdout,
      stderr
    } = await exec(startOracle, options)
    console.log('Starting Oracle')
    if (stderr) {
      console.error('Starting Oracle Error')
      console.error(stderr)
    }
    console.log(stdout)
    await wait(1000, 'Started Oracle')

    // forwarding = await Forwarding.at(fwdAddress)
    // token = await EIP20.at(tokenAddress)
    await Forwarding.deployed().then(instance => {
      forwarding = instance
    })

    await EIP20.deployed().then(instance => {
      token = instance
    })

    handler = new Handler('staging')

    // Clean the database
    handler.removeAllData()
  })

  it("Log the forwarding information from a minted node", async function () {
    await web3.eth.getAccounts().then(a => {
      a.map(e => accounts.push(e))
    })

    let device_account = accounts[1]

    // First we need to ensure that the current amount of tokens that router
    // owns is 0. Then we will 'approve' that the router may receive tokens.

    await token.balanceOf(device_account).then(result => {
      assert(result == 0, 'The device already has tokens')
    })

    await token.allowance(accounts[0], device_account).then(result => {
      assert(result == 0, 'The device should not be allowed to receive tokens yet')
    })

    // Now that we have the configuration we wanted for our devuce,
    // we can create it along with its owner.

    await createUsersDevices(device_account, handler)

    // After checking that the device was correctly added to the database
    // we start with the tokens transferring.

    await wait(500, 'Waiting to fill database')

    await forwarding.nodeReporting(device_account)

    await wait(500, 'Waiting for forwarding to finish')

    // We need to check that the tokens were transferred correctly.

    await token.allowance(accounts[0], device_account).then(result => {
      assert(result > 0, 'The device is not allowed to receive tokens')
      console.log(`Now, the accounts is allowed to receive ${result} tokens`)
    })

    // We check that the tokens are correclty transferred.

    await token.balanceOf(forwarding.address).then(result => {
      console.log(`The amount of tokens of the forwading contract is ${result}`)
    })

    await token.balanceOf(accounts[0]).then(result => {
      console.log(`The amount of tokens of the entity contract is ${result}`)
    })

    await token.balanceOf(device_account).then(result => {
      console.log(`The amount of tokens transfered to the accounts is ${result}`)
      assert(result > 0, 'The device has no tokens')
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

async function createUsersDevices(router_account, handler) {
  await handler.addUser({
    name: 'Sergio',
    age: 22,
    pubKey: '129837189478373yhd32y8371h837do2',
    devices: [],
    role: 'Client',
    wallet: '0xbce83eeb42c0b98f5bfb24a20b494bf6'
  }, (result) => {
    assert(result._id, 'DB not retrieving results correctly')
  })

  await handler.mintDevice({
    name: 'AC1600',
    price: 119.99,
    ip: `${TestIP}`,
    deviceType: 'Router',
    owner: '0xbce83eeb42c0b98f5bfb24a20b494bf6',
    wallet: `${router_account}`
  }, (result) => {
    assert(result == router_account, 'DB not retrieving results correctly')
  })
}