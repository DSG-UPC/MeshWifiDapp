const MyERC721 = artifacts.require("MyERC721");
const Crud = artifacts.require('CRUD');
const CrudFactory = artifacts.require('CRUDFactory');
const OracleDispatch = artifacts.require('OracleDispatch');
const MongoHandler = require('../database/src/MongoHandler');
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
  'cwd': parentDir+'/oracle/' //+'/ethereum/'
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
    console.log('OracleDispatch for Oracle !!! '+OracleDispatch.address);
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

  it("mint a new ROUTER and store it in routers CRUD struct", async function () {
    const ReserveAccount = accounts[0];
    const ClientAccount = accounts[1];
    const ProviderAccount = accounts[2];
    let token = await MyERC721.deployed();
    let cfact = await CrudFactory.deployed();
    const routersAddr = await cfact.getRouters.call();
    let routers = await Crud.at(routersAddr);
    await token.requestRouterMint(TestIP, {
      from: ProviderAccount,
      gas: web3.utils.numberToHex(5000000)
    });
    console.log('Waiting for mint...')
    await wait(3000, 'Minted');
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
    assert.equal(tokenEntry, ProviderAccount,
      'The owner of the token is  not registered correctly in the ERC721');
    console.log(tokenEntry);
    //});

  });

  it("mint a new CLIENT and store it in routers CRUD struct", async function () {
    const ReserveAccount = accounts[0];
    const ClientAccount = accounts[1];
    const ProviderAccount = accounts[2];
    let token = await MyERC721.deployed();
    let cfact = await CrudFactory.deployed();
    const clientsAddr = await cfact.getClients.call();
    let clients = await Crud.at(clientsAddr);
    await token.requestClientMint(TestIP, {
      from: ProviderAccount,
      gas: web3.utils.numberToHex(5000000)
    });
    console.log('Waiting for mint...')
    await wait(2000, 'Minted');
    //process.stdin.once('data', async function () {
    const count = await clients.getCount.call();
    console.log(count);
    const exists = await clients.exists.call(TestIP);
    console.log(exists);
    //assert.isTrue(exists, 'The new IP is not stored in the clients struct');
    let clientsEntry = await clients.getByIP.call(TestIP);
    console.log(clientsEntry);
    //console.log(clientsEntry.uid);
    let tokenEntry = await token.ownerOf(clientsEntry.uid);
    assert.equal(tokenEntry, ProviderAccount,
      'The owner of the token is  not registered correctly in the ERC721');
    console.log(tokenEntry);
    //});

  });

  it("Activates an existing device as a gateway", async function () {
    const ReserveAccount = accounts[0];
    const ClientAccount = accounts[1];
    const ProviderAccount = accounts[2];
    let token = await MyERC721.deployed();
    let cfact = await CrudFactory.deployed();
    const routersAddr = await cfact.getRouters.call();
    const gatewaysAddr = await cfact.getGateways.call();
    let routers = await Crud.at(routersAddr);
    let gateways = await Crud.at(gatewaysAddr);
    let exists = await gateways.exists.call(TestIP);
    assert.isFalse(exists, 'The new device is stored in the gateways struct without calling activateGateway');

    await token.activateGateway(TestIP, {
      from: ProviderAccount
    });
    exists = await gateways.exists.call(TestIP);
    assert.isTrue(exists, 'The new device is not stored in the gateways after calling activateGateway');

    let routersEntry = await routers.getByIP.call(TestIP);
    let gatewaysEntry = await gateways.getByIP.call(TestIP);
    assert.equal(web3.utils.toHex(routersEntry.uid), web3.utils.toHex(gatewaysEntry.uid),
      'The same device has different data in the routers and gateways structs ');
    assert.equal(routersEntry.addr, gatewaysEntry.addr,
      'The same device has different data in the routers and gateways structs ');
  });

});
