//const store = require('./store');
const InetFactory = artifacts.require("SimpleInternetAccessFactory");
const DAO = artifacts.require("DAO");

module.exports = async function(deployer) {
  const daoInstance = await DAO.deployed();
  deployer.deploy(InetFactory, daoInstance.address)
  .then(function (instance) {
    console.log("InetFactory " +  instance.address);
  })
};
