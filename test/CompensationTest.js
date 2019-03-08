const argv = require('minimist')(process.argv.slice(2))
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const path = require('path')
const parentDir = path.resolve(process.cwd())
const stopOracle = 'screen -X -S oracle quit'
let options = {
  'cwd': parentDir
}

// ARTIFACTS

const OracleDispatch = artifacts.require('OracleDispatch')
const MyERC721 = artifacts.require('MyERC721')
const DAO = artifacts.require('DAO')
const SimpleInternetAccessFactory = artifacts.require('SimpleInternetAccessFactory')
const EIP20 = artifacts.require('EIP20')
const Forwarding = artifacts.require('Forwarding')

// CONFIGURATION PARAMETERS

const Handler = require('../database/src/MongoHandler')
const TestIP_provider = 'localhost:9000'
const TestIP_client = 'localhost:9000'
const MaxData = 1024;


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

contract("Test the whole compensation process", async function (accounts) {
  var forwarding, token, handler, accounts = []
  before('Prepare Environment', async function () {

    // Start oracle server with test contract address
    let startOracle = 'screen -S oracle -L -dm node oracle/oracle.js --network staging --address ' + OracleDispatch.address
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

    handler = new Handler('staging')

    // Clean the database
    handler.removeAllData()
  })

  it("performs the whole process", async function () {

    var forwarding = await Forwarding.deployed()
    var eip20 = await EIP20.deployed()
    var dao = await DAO.deployed()
    var internetFactory = await SimpleInternetAccessFactory.deployed()
    var erc721 = await MyERC721.deployed()
    var ReserveAccount, ClientAccount, ProviderAccount

    if (network == 'staging') {
      ReserveAccount = accounts[0];
      ClientAccount = accounts[1];
      ProviderAccount = accounts[2];
    } else {
      ReserveAccount = accounts[3];
      ClientAccount = accounts[4];
      ProviderAccount = accounts[5];
    }

    /**
     * 1) Client creates a new Internet contract:
     *    - Mint user --> One client and one provider.
     *    - Mint device --> Provider's device.
     *    - Allowance from client to Internet contract must be >= maxData * pricePerMB.
     *    - *For next steps, take into account the wallet of the provider that will be used in the forwarding process.
     */

    await erc721.requestClientMint(TestIP_client)
    await erc721.requestClientMint(TestIP_provider)

    await erc721.requestRouterMint(TestIP_provider)

    var PubKey = // Whatever

      await erc721.getClients().then(crud => {
        crud.getCount().then(result => {
          assert(result == 1, "The mint process for clients went wrong")
        })
      })

    await erc721.getRouters().then(crud => {
      crud.getCount().then(result => {
        assert(result == 2, "The mint process for routers went wrong")
      })
    })

    // Should it be from reserve account instead ???
    var internetContract = await internetFactory.createContract(ClientAccount, TestIP_provider, MaxData, PubKey, {
      from: ClientAccount
    })

    await internetFactory.getDeployedContractsbyClient({
      from: ClientAccount
    }).then(array => {
      assert(array.length == 1, "The count of deployed Internet Contracts must be one.")
    })

    var escrow = MaxData * dao.getPricePerMB()

    await eip20.approve(internetContract, escrow, {
      from: ClientAccount
    })

    await eip20.allowance(ClientAccount, internetContract).then(result => {
      assert(result == escrow, "The allowance from the user to the internet contract must be" +
        " greater than or equal to the escrow.")
    })

    /**
     * 	2) Provider accepts the contract:
     *    - Execute acceptContract() method from the provider account.
     *    - *For next steps. Contract holds a variable called 'activationTime' needed for monitoring.
     */

    await internetContract.acceptContract(PubKey, {
      from: ProviderAccount
    })

    var old_contractAmount = await eip20.balanceOf(internetContract.address)
    assert(old_contractAmount == escrow, "The amount of tokens in the contract has to be the escrow")

    /**
     * 3) Client reaches the maximum data he/she can use:
     *    - The provider calls checkUsage() and the money is sent from the InternetContract to the reserve account.
     */

    var old_reserveAmount = await eip20.balanceOf(ReserveAccount)

    await internetContract.checkUsage({
      from: ProviderAccount
    })

    var new_reserveAmount = await eip20.balanceOf(ReserveAccount)
    var providerAmount = await eip20.balanceOf(ProviderAccount)

    assert(old_contractAmount < escrow,
      "After the transference, the contract must have less tokens than before")
    assert(old_reserveAmount < new_reserveAmount,
      "After the transference, the reserve account must have more tokens than before")

    /**
     * 	4) Every period of time (to be defined), the provider routers' request the Forwarding contract to transfer the
     *     compensation into their accounts.
     *      - Allowance from reserve account to provider account must be at least the amount each device deserves to
     *        receive.
     *      - Next step would be to monitor the provider. We cannot monitor individualy each of the clients routers'
     *        because there is some intermediate traffic (provider router is used as an intermediate node) that won't
     *        be recorded.
     *      - From this amount of monitored data, we will distribute the tokens (*pricePerMB).
     */

    await forwarding.getInvoice(TestIP_provider)

    await wait(500, 'Awaiting to calculate provider compensation')

    await forwarding.startPayment()

    let after_payment_reserve = await eip20.balanceOf(ReserveAccount)
    let after_payment_provider = await eip20.balanceOf(ProviderAccount)

    assert(new_reserveAmount < after_payment_reserve)
    assert(providerAmount < after_payment_provider)

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