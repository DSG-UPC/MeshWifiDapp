//const store = require('./store');
const DAO = artifacts.require("DAO");
const Forwarding = artifacts.require("Forwarding");

module.exports = async function(deployer) {
  const lookup = await DAO.deployed()
  await deployer.deploy(Forwarding, lookup.address)
  .then(function (instance) {
    console.log("Forwarding contract:"+ instance.address)
  })
};
