const OracleTest = artifacts.require('./contracts/oracle/OracleTest.sol')
const argv = require('minimist')(process.argv.slice(2))
var jsonLookup = require('../build/contracts/DAO.json')
const Handler = require('../database/src/MongoHandler')

contract('Checks that oracle works properly', () => {
    var oracle, net_id, lookupAddress
    var accounts = []
    var network = argv['network']
    var device = {
        name: 'Initial',
        price: 50,
        ip: '127.0.0.1',
        deviceType: 'Router',
        owner: 'c71943425a898db276dd5771656e100d',
        wallet: 'd8d6ef110c36222bf4c6381161e1762e'
    }
    var user = {
        name: 'Sergio',
        age: 22,
        pubKey: '129837189478373yhd32y8371h837do2',
        devices: [],
        role: 'Client',
        wallet: 'c71943425a898db276dd5771656e100d'
    }

    before('setup contract and accounts for each test', async () => {

        // Here we get all the active accounts.

        await web3.eth.getAccounts().then(a => {
            a.map(e => accounts.push(e))
        })
        // Then we create the OracleTest contract.

        if (network == null || network == undefined) {
            network = "development"
            net_id = 7775
        }
        else if (network === "staging")
            net_id = 7775
        else if (network === "production")
            net_id = 1516

        lookupAddress = jsonLookup.networks[net_id].address

        await OracleTest.new(lookupAddress).then(instance => {
            oracle = instance
        })

        handler = new Handler()

        await handler.removeAllData()

        await wait(500, 'Cleaning database')

        handler.addUser(user, (result) => {
            assert(result, 'User was not correctly added')
            handler.mintDevice(device, result => {})
        })
    })
    it('is able to monitor a given node', async () => {

        // MONITORING A NODE

        await oracle.monitor('localhost:9000')

        await wait(500, 'Sending MONITOR request to oracle')

        await oracle.getTraffic().then(traffic => {
            assert(traffic > 0, 'Monitoring not working properly')
        })
    })
    it('is able to add a new user', async () => {
        let _user = {
            name: 'Mennan',
            age: 22,
            pubKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ',
            devices: [],
            role: 'Provider',
            wallet: '0xbce83eeb42c0b98f5bfb24a20b494bf6'
        }

        // ADDING A USER //

        await oracle.register(JSON.stringify(_user))

        await wait(500, 'Sending REGISTER request to oracle')

        await oracle.getRegister().then(result => {
            assert(result == _user.wallet, 'REGISTER failed')
        })
    })
    it('is able to activate a router as a gateway', async () => {

        // ACTIVATING A ROUTER AS A GATEWAY //

        await oracle.activateGW(device.wallet)

        await wait(500, 'Sending ACTIVATEGW request to oracle')

        await oracle.getDeviceType().then(deviceType => {
            assert(deviceType == 'Gateway',
                'ACTIVATE_GW failed at deviceType')
        })

        await oracle.getDeviceActivate().then(_device => {
            assert(JSON.parse(_device).wallet === device.wallet,
                'ACTIVATE_GW failed at wallet')
        })
    })
    it('is able to mint a new device', async () => {
        let _device = {
            name: 'AC1600',
            price: 119.99,
            ip: '127.0.0.1',
            deviceType: 'Router',
            owner: 'c71943425a898db276dd5771656e100d',
            wallet: '0x6e5981a73ad28051b6bd655c3a0b3160'
        }
        // MINTING A DEVICE //

        await oracle.mint(JSON.stringify(_device))

        await wait(500, 'Sending MINT request to oracle')

        await oracle.getMint().then(result => {
            assert(result == _device.wallet, 'MINT failed')
        })
    })
    it('is able to check for the existence of a device', async () => {

        // CHECKING FOR DEVICE EXISTENCE //

        await oracle.exists(device.wallet)

        await wait(500, 'Sending EXISTS request to oracle')

        await oracle.getExists().then(res => {
            assert(res, 'EXISTS failed')
        })

        await oracle.getDeviceExists().then(deviceExists => {
            assert(JSON.parse(deviceExists).wallet === device.wallet,
                'EXISTS failed')
        })
    })
})

async function wait(ms, text) {
    var testPromise = new Promise(function (resolve, reject) {
        setTimeout(function () {
            console.log(text);
            resolve(text);
        }, ms);
    });
    var result = await testPromise;
}