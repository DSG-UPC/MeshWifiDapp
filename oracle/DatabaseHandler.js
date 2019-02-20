const Handler = require('../database/src/MongoHandler')
const Manager = require('./database_handlers/DBHandlerManager')
const OracleHandler = require('./OracleHandler')

class DatabaseHandler extends OracleHandler {

    constructor(_account, _network) {
        super()
        this.account = _account
        this.handler = new Handler(_network)
        this.manager = new Manager()
        this.command = ''
    }

    handle(_id, _recipient, _originator, _data, callback) {
        let _this = this
        switch (this.command) {
            case 'mint':
                _this.handler.mintDevice(JSON.parse(_data), _device => {
                    _this.manager.getMint().getTransaction(_this.account, _recipient,
                        _device, callback)
                })
                break
            case 'register':
                _this.handler.addUser(JSON.parse(_data), (_user) => {
                    _this.manager.getRegister().getTransaction(_this.account, _recipient,
                        _user, callback)
                })
                break
            case 'exists':
                _this.handler.findDeviceByWallet(_data, (_device) => {
                    _this.manager.getExists().getTransaction(_this.account, _recipient,
                        _device, callback)
                })
                break
            case 'activateGW':
                _this.handler.findDeviceByWallet(_data, (result) => {
                    if (result) {
                        let res = result
                        res['deviceType'] = 'Gateway'
                        _this.handler.updateDevice(res.wallet, res, (_newDevice) => {
                            _this.manager.getActivate().getTransaction(_this.account,
                                _recipient, _newDevice, callback)
                        })
                    }
                })
                break
            default:
                throw TypeError
        }
    }

    getDatabase() {
        return this.handler
    }

    setCommand(_command) {
        this.command = _command
    }
}

module.exports = DatabaseHandler