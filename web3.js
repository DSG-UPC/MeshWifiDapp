const Web3 = require('web3');

let web3;

if (typeof window !== 'undefined' && typeof window.web3 !== 'undefined') {
  // We are in the browser and metamask is running.
  //web3 = new Web3(window.web3.currentProvider);
  // Override this and set the same provider
  //const provider = new Web3.providers.WebsocketProvider(
  //  'ws://10.1.24.69:8503'
  //);
  //web3 = new Web3(provider);
  web3 = new Web3(window.web3.currentProvider);
} else {
  // We are on the server *OR* the user is not running metamask
  ///*
  let url = process.env.ETH_NET || 'ws://localhost:8545';
  const provider = new Web3(
    url
  );
  //*/
  /* HTTP for deploying and WS for the rest of the process (oracle needs WS)
  const provider = new Web3.providers.HttpProvider('http://10.1.26.10:8502');
  */
  web3 = new Web3(provider);
}

module.exports = web3;