const assert = require('assert');
const Handler = require('../src/MongoHandler')
var uDao, dDao, handler

describe('Trying the DAOs methods', () => {
    before(async () => {

        // WE INITIALIZE THE HANDLER AND THE DAOs

        handler = new Handler()
        uDao = handler.getUserDAO()
        dDao = handler.getDeviceDAO()

        handler.removeAllData()

        // WE POPULATE THE DB

        createUsers()
        createDevices()
    })

    it('Shows all users and devices', () => {

        // LOOKING FOR THE USERS

        uDao.find((err, doc) => {
            assert(!err)
            assert.equal(doc.length, 2)
        })


        // LOOKING FOR THE DEVICES

        dDao.find((err, doc) => {
            assert(!err)
            assert.equal(doc.length, 2)
        })
    })

    it('Finds a concrete user and device', async () => {

        // LOOKING FOR A CONCRETE USER

        uDao.findOne({
            name: 'Sergio'
        }, (err, doc) => {
            assert(!err)
            assert(doc, "There is no user with that name")
        })


        // LOOKING FOR A CONCRETE DEVICE

        dDao.findOne({
            ip: '127.0.0.1'
        }, (err, doc) => {
            assert(!err)
            assert(doc, "There is no device with that ip")
        })
    })

    it('Removes correctly a user and a device', async () => {

        // LOOKING FOR THE USERS 

        uDao.findOne({
            name: 'Mennan'
        }, (err, doc) => {
            assert(!err)
            assert(doc, 'There is no user with that name')
        })

        // WE DELETE A USER

        uDao.deleteByQuery({
            name: 'Mennan'
        }, (err, result) => {
            assert(!err)
            assert(result, 'The user was not deleted')
        })

        // WE CHECK WHETHER THE USER IS STILL THERE

        uDao.findOne({
            name: 'Mennan'
        }, (err, doc) => {
            assert(!err)
            assert(!doc, "There is still a user with name Mennan")
        })


        // LOOKING FOR THE DEVICES

        dDao.findOne({
            deviceType: 'Router'
        }, (err, doc) => {
            assert(!err)
            assert(doc, "There is no device with that type")
        })

        // WE DELETE A DEVICE

        dDao.deleteByQuery({
            deviceType: 'Router'
        }, (err, result) => {
            assert(!err)
            assert(doc, 'The device was not delete')
        })

        // WE CHECK WHETHER THE DEVICE IS STILL THERE

        dDao.findOne({
            deviceType: 'Router'
        }, (err, doc) => {
            assert(!err)
            assert(!doc, "There is still a device of that type")
        })
    })

    it('Updates correctly a user and a device', async () => {

        // UPDATING THE USERS 

        uDao.findOne({
            name: 'Sergio'
        }, (err, doc) => {
            assert(!err)
            assert(doc, 'There is no user with name Sergio')
        })


        uDao.update('0xbce83eeb42c0b98f5bfb24a20b494bf6', {
            name: 'Pepito'
        }, (err, result) => {
            assert(!err)
            assert(result, 'There is no user with name Pepito')
        })

        uDao.findOne({
            name: 'Sergio'
        }, (err, doc) => {
            assert(!err)
            assert(!doc, 'There is still some user with name Sergio')
        })


        // NOW FOR THE DEVICES 

        dDao.findOne({
            ip: '127.0.0.1'
        }, (err, doc) => {
            assert(!err)
            assert(doc, 'There is no device with ip 127.0.0.1')
        })


        dDao.update('0x6e5981a73ad28051b6bd655c3a0b3160', {
            ip: '1.1.1.1'
        }, (err, result) => {
            assert(!err)
            assert(result, 'There is no device with ip 1.1.1.1')
        })


        dDao.findOne({
            ip: '127.0.0.1'
        }, (err, doc) => {
            assert(!err)
            assert(!doc, 'There is still a device with ip 127.0.0.1')
        })

    })
})

function createDevices() {

    dDao.create({
        name: 'AC1600',
        price: 119.99,
        ip: '127.0.0.1',
        deviceType: 'Gateway',
        owner: '0xbce83eeb42c0b98f5bfb24a20b494bf6',
        wallet: '0x6e5981a73ad28051b6bd655c3a0b3160'
    }, (err, device) => {
        assert(!err)
        assert(device._id, 'DB not retrieving results correctly')
    })



    dDao.create({
        name: 'GT-AC5300',
        price: 27.95,
        ip: '127.0.0.2',
        deviceType: 'Router',
        owner: '0x802fd2f7dafd152c6d321b26d8924a5d',
        wallet: '0x2b7ee6791f89a9014aa53a9bef86bfe2'
    }, (err, device) => {
        assert(!err)
        assert(device.ip == '127.0.0.2', 'DB not retrieving results correctly')
    })

}

function createUsers() {

    uDao.create({
        name: 'Sergio',
        age: 22,
        pubKey: '129837189478373yhd32y8371h837do2',
        role: 'Client',
        wallet: '0xbce83eeb42c0b98f5bfb24a20b494bf6'
    }, (err, result) => {
        assert(!err)
        assert(result._id, 'DB not retrieving results correctly')
    })

    uDao.create({
        name: 'Mennan',
        age: 26,
        pubKey: 'B1rnH8D4PIzM9hAqXD5ICwDH0ptk1krwC3',
        role: 'Provider',
        wallet: '0x802fd2f7dafd152c6d321b26d8924a5d'
    }, (err, result) => {
        assert(!err)
        assert(result.name == 'Mennan', 'DB not retrieving results correctly')
    })
}