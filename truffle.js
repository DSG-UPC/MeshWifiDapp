const web3 = require('./web3');
const ganacheWeb3 = require('./ganache-web3')

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: "localhost",
      network_id: "7775",
      port: 8545,
      network_id: "*",
      from: '0xC79F7fE80B5676fe38D8187b79d55F7A61e702b2',
    },
    staging: {
      provider: ganacheWeb3.currentProvider,
      network_id: "7775",
      host: "localhost",
      port: 8545,
      //gas: 5876844,
      from: '0xC79F7fE80B5676fe38D8187b79d55F7A61e702b2',
      //from: "",
    },
    // meshdapp: {
    //   provider: web3.currentProvider,
    //   network_id: "7775",
    //   gas: 8076844,
    //   from: '0x28b17326d08992f16d382db2923d0d8b4ff8adb0',
    //   //from: "",
    // },
  },
  compilers: {
    solc: {
      //version: "./node_modules/solc",
      version: '0.4.25',
    }
  }
};
