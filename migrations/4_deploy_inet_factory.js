//const store = require('./store');
const InetFactory = artifacts.require("SimpleInternetAccessFactory");
const DAO = artifacts.require("DAO");

module.exports = async function(deployer) {
  const daoInstance = await DAO.deployed();
  console.log(daoInstance.address);
  await deployer.deploy(InetFactory, daoInstance.address);

};
