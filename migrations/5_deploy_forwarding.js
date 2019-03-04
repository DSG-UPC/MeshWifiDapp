//const store = require('./store');
const DAO = artifacts.require("DAO");
const Token = artifacts.require("EIP20");
const Forwarding = artifacts.require("Forwarding");

module.exports = async function(deployer, network, accounts) {
  let tokenContract = await Token.deployed()
  let lookup = await DAO.deployed()
  deployer.deploy(Forwarding, lookup.address, accounts[3])
  .then(function (instance) {
    console.log("Forwarding contract:"+ instance.address)
  })
};
