/*
Based on https://github.com/robinagist/EthereumWeatherOracle
*/

//const web3 = require('./oracleWeb3')
const MonitorHandler = require('./MonitorHandler')
const ForwardingHandler = require('./ForwardingHandler')
const DatabaseHandler = require('./DatabaseHandler')
const PriceCalculatorHandler = require('./PriceCalculatorHandler')
const PricePerProviderCalculatorHandler = require('./PricePerProviderCalculatorHandler')
const ProportionalCalculatorHandler = require('./ProportionalCalculatorHandler')
var monitorHandler, forwardingHandler, databaseHandler,
    priceCalculatorHandler, pricePerProviderCalculatorHandler, proportionalCalculatorHandler, handler

const Contract = require('../contract')
const minimist = require('minimist'),
    argv = minimist(process.argv.slice(2), {
        string: ['network', 'address']
    })
const testAddress = argv['address']
const oracleNetwork = argv['network']
let web3
if (oracleNetwork == 'meshdapp') {
    web3 = require('./oracleWeb3')
} else {
    web3 = require('../ganache-web3')
}
const oracleContract = new Contract('OracleDispatch', oracleNetwork)
var account

const getAccount = async () => {
    //console.log(oracleContract.artifact.updatedAt)
    //console.log(oracleContract.provider);
    //web3.setProvider(oracleContract.provider);
    const accounts = await web3.eth.getAccounts();
    if (oracleNetwork == 'staging') {
        account = accounts[0];
    } else {
        account = accounts[3];
    }
    //console.log(account);
    //web3.setProvider(web.provider)
    console.log(web3.currentProvider);
    databaseHandler = new DatabaseHandler(account);
    monitorHandler = new MonitorHandler(account);
    forwardingHandler = new ForwardingHandler(account, databaseHandler.getDatabase(), monitorHandler);
    priceCalculatorHandler = new PriceCalculatorHandler(account);
    pricePerProviderCalculatorHandler = new PricePerProviderCalculatorHandler(account);
    proportionalCalculatorHandler = new ProportionalCalculatorHandler(account);
    console.log('Working from account ', account);
}

let c = getAccount().then(() => {
    console.log("contract address: " + oracleContract.address);
    if (testAddress) {
        startListener(oracleContract.abi, testAddress);
    } else {
        startListener(oracleContract.abi, oracleContract.address);
    }
}, (err) => {
    console.log("shit didn't work.  here's why: " + err)
})


// starts the event listener
async function startListener(abi, address) {
    console.log("starting event monitoring on contract: " + address)
    // console.log("the abi is:" + JSON.stringify(abi, null, 2))
    const myContract = await new web3.eth.Contract(jsonInterface = abi, address = address)
    //myContract.events.Incoming({fromBlock: 537025, toBlock: 'latest'
    myContract.events.Incoming({
            fromBlock: 'latest',
        }, (error, event) => {
            console.log(">>> " + event)
        })
        .on('data', (log) => {
            logData = log.returnValues;
            query = logData.queryType;
            const [server, command] = query.split('^');
            switch (server) {
                case 'monitor':
                    setHandler(monitorHandler)
                    break;
                case 'nodedb':
                    databaseHandler.setCommand(command)
                    setHandler(databaseHandler)
                    break;
                case 'forwarding':
                    setHandler(forwardingHandler)
                    break;
                case 'forwarding_fake':
                    setHandler(forwardingHandler)
                    break;
                case 'recalculate_max_price':
                    setHandler(priceCalculatorHandler)
                    logData.query = [logData.owed, logData.funds, logData.pricePerMB]
                    break;
            }
            handler.handle(logData.id, logData.recipient, logData.originator, logData.query,
                (transaction) => {
                    web3.eth.sendTransaction(transaction)
                        .then((result) => {
                            console.log(`EVM call result:\n ${result}`)
                        }, (error) => {
                            console.log(`Error:\n ${error}`)
                        })
                })
            //handler(abi, address)
        })
        .on('changed', (log) => {
            console.log(`Changed: ${log}`)
        })
        .on('error', (log) => {
            console.log(`error:  ${log}`)
        })


    //// Another event because event overloading fails :_( ////


    myContract.events._Incoming({
            fromBlock: 'latest',
        }, (error, event) => {
            console.log(">>> " + event)
        })
        .on('data', (log) => {
            console.log("event data: " + JSON.stringify(log, undefined, 2))
            logData = log.returnValues;
            query = logData.queryType;
            const [server, command] = query.split('^');
            switch (server) {
                case 'recalculate_max_price':
                    setHandler(priceCalculatorHandler)
                    logData.query = [logData.owed, logData.funds, logData.pricePerMB]
                    break;
                case 'calculate_proportional':
                    setHandler(proportionalCalculatorHandler)
                    logData.query = [logData.owed, logData.funds, logData.pricePerMB]
                    break;
                case 'calculate_price_per_provider':
                    setHandler(pricePerProviderCalculatorHandler)
                    logData.query = [logData.owed, logData.funds, logData.pricePerMB]
                    break;

            }
            handler.handle(logData.id, logData.recipient, logData.originator, logData.query,
                (transaction) => {
                    web3.eth.sendTransaction(transaction)
                        .then((result) => {
                            console.log(`EVM call result:\n ${JSON.stringify(result, null, 2)}`)
                        }, (error) => {
                            console.log(`Error:\n ${error}`)
                        }) //.on('receipt', (trx) => {
                    //     console.log(`Transaction:\n\n ${trx}\n\n`);
                    //     console.log(`Gas used: ${trx.receipt.gasUsed}`);
                    // });
                })
            //handler(abi, address)
        })
        .on('changed', (log) => {
            console.log(`Changed: ${log}`)
        })
        .on('error', (log) => {
            console.log(`error:  ${log}`)
        })
}

function setHandler(_handler) {
    handler = _handler
}
