const ERC20 = artifacts.require("EIP20");
const MyERC721 = artifacts.require("MyERC721");
const DAO = artifacts.require("DAO");
const CRUD = artifacts.require("CRUD");
const CRUDFactory = artifacts.require("CRUDFactory");
//const EIP20Interface = artifacts.require("EIP20Interface");
//const Ownable = artifacts.require("Ownable");

module.exports = function (deployer) {
  deployer.deploy(ERC20, 1000000, 'Guificoin', 0, 'GCN');
  console.log("DAO: " + DAO.address);
  deployer.deploy(CRUDFactory)
    .then(async function (crudfactory) {
      const crudrouter = await crudfactory.getRouters.call();
      console.log(crudrouter);
      const crudgateway = await crudfactory.getGateways.call();
      console.log("crudgateway: " + crudgateway);
      const erc721 = await deployer.deploy(MyERC721, 'GuifiDeviceToken', 'GDT',
        DAO.address, crudrouter, crudgateway);
      console.log('ERC721: '+erc721.address);
      //return crudrouter, crudgateway
    })
  //deployer.deploy(CRUD,'gateway')
  //  .then(function (crudrouter, crudgateway){
  //    deployer.deploy(ERC721, 'GuifiDeviceToken', 'GDT',
  //      DAO.address, crudrouter, crudgateway);
  //  })
};
