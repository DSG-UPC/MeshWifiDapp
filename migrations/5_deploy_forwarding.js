//const store = require('./store');
const DAO = artifacts.require("DAO");
const ERC20 = artifacts.require("EIP20");
const Forwarding = artifacts.require("Forwarding");

module.exports = async function (deployer) {
  const lookup = await DAO.deployed();
  const erc20 = await ERC20.deployed();
  await deployer.deploy(Forwarding, lookup.address)
    .then(async function (instance) {
      console.log("Forwarding contract:" + instance.address);
      await lookup.setReserveAccount(instance.address);
      await erc20.transfer(instance.address, 100000000);
    })
};
