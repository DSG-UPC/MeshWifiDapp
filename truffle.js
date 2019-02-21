/*
 * NB: since truffle-hdwallet-provider 0.0.5 you must wrap HDWallet providers in a
 * function when declaring them. Failure to do so will cause commands to hang. ex:
 * ```
 * mainnet: {
 *     provider: function() {
 *       return new HDWalletProvider(mnemonic, 'https://mainnet.infura.io/<infura-key>')
 *     },
 *     network_id: '1',
 *     gas: 4500000,
 *     gasPrice: 10000000000,
 *   },
 */
const web3 = require('./web3');
const ganacheWeb3 = require('./ganache-web3')

//console.log(web3.currentProvider);


module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*"
    },
    staging: {
      provider: ganacheWeb3.currentProvider,
      network_id: "7775",
      //from: "",
    },
    test: {
      provider: web3.currentProvider,
      network_id: "7775",
      //from: "",
    },
    production: {
      provider: web3.currentProvider,
      network_id: "1516",
      //from: "",
    }
  },
  compilers: {
    solc: {
      version: "./node_modules/solc",  
    }
  }
};
