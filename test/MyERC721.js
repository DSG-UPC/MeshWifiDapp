const MyERC721 = artifacts.require("MyERC721");
const Crud = artifacts.require('CRUD');
const CrudFactory = artifacts.require('CRUDFactory');
const OracleDispatch = artifacts.require('OracleDispatch');
const MongoHandler = require('../../database/src/MongoHandler');
var db = new MongoHandler('production');
const TestIP = '10.1.24.75';
const TestIP1 = '10.1.24.76';
const device = {
  name: 'AC1600',
  price: 119.99,
  ip: `${TestIP}`,
  deviceType: 'Router',
  owner: 'c71943425a898db276dd5771656e100d',
  wallet: '0x28b17326d08992f16d382db2923d0d8b4ff8adb0'
}


const util = require('util');
const exec = util.promisify(require('child_process').exec);
//const exec = require('child_process').exec;
const path = require('path');
const parentDir = path.resolve(process.cwd());
//const startOracle = 'screen -S oracle -L -dm node oracle.js --network staging';

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

const randomInt = getRandomInt(10000)
const stopOracle = 'screen -X -S oracle'+randomInt+' quit';
let options = {
  //'cwd': parentDir+'/ethereum/'
  'cwd': parentDir //+'/ethereum/'
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



contract("1st MyERC721 test", async function (accounts) {


  before('Prepare Environment', async function () {

    // Start oracle server with test contract address
    let startOracle = 'screen -S oracle'+randomInt+' -L -dm node oracle.js --network staging --address ' + OracleDispatch.address;
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
    let account_one = accounts[0];
    let account_two = accounts[1];
    let token = await MyERC721.deployed();
    let cfact = await CrudFactory.deployed();
    const routersAddr = await cfact.getRouters.call();
    const gatewaysAddr = await cfact.getGateways.call();
    let routers = await Crud.at(routersAddr);
    let gateways = await Crud.at(gatewaysAddr);
    await token.requestMint(TestIP, {
      from: account_one,
      gas: web3.utils.numberToHex(600000)
    });


    console.log('Aquí llego')
    await wait(2000, 'Waiting for mint...');

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('What do you think of Node.js? ', (answer) => {
      // TODO: Log the answer in a database
      console.log(`Thank you for your valuable feedback: ${answer}`);

      rl.close();
    });
    console.log('Press any key to continue.');
    //process.stdin.once('data', async function () {
      const count = await routers.getCount.call();
      console.log(count);
      const exists = await routers.exists.call(TestIP);
      console.log(exists);
      //assert.isTrue(exists, 'The new IP is not stored in the routers struct');
      let routersEntry = await routers.getByIP.call(TestIP);
      console.log(routersEntry);
      //console.log(routersEntry.uid);
      let tokenEntry = await token.ownerOf(routersEntry.uid);
      assert.equal(tokenEntry, account_two,
        'The owner of the token is  not registered correctly in the ERC721');
      console.log(tokenEntry);
    //});

  });

  it("Activates an existing device as a gateway", async function () {
    let account_one = accounts[0];
    let account_two = accounts[1];
    let token = await MyERC721.deployed();
    let cfact = await CrudFactory.deployed();
    const routersAddr = await cfact.getRouters.call();
    const gatewaysAddr = await cfact.getGateways.call();
    let routers = await Crud.at(routersAddr);
    let gateways = await Crud.at(gatewaysAddr);
    let exists = await gateways.exists.call(TestIP);
    assert.isFalse(exists, 'The new device is stored in the gateways struct without calling activateGateway');

    await token.activateGateway(TestIP, {
      from: account_two
    });
    exists = await gateways.exists.call(TestIP);
    assert.isTrue(exists, 'The new device is not stored in the gateways after calling activateGateway');

    let routersEntry = await routers.getByIP.call(TestIP);
    let gatewaysEntry = await gateways.getByIP.call(TestIP);
    assert.equal(web3.utils.toDecimal(routersEntry.uid), web3.utils.toDecimal(gatewaysEntry.uid),
      'The same device has different data in the routers and gateways structs ');
    assert.equal(routersEntry.addr, gatewaysEntry.addr,
      'The same device has different data in the routers and gateways structs ');
  });

});
