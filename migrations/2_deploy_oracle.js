//const store = require('./store');
const OracleDispatch = artifacts.require("OracleDispatch");
const DAO = artifacts.require("DAO");
//const OracleTest = artifacts.require("OracleTest");


module.exports = function (deployer, network, accounts) {
  deployer.deploy(OracleDispatch).then(function (instance) {
    //store.storeArtifact(OracleDispatch);
    console.log('Dispatch address: ' + instance.address);
    return instance.address;
  }).then(function (dispatch) {
    //The "return" in the following line is necessary
    return deployer.deploy(DAO, 1, dispatch).then(function (instance) {
      console.log('DAO address :' + instance.address);
      /*
      //await store.storeArtifact(OracleLookup);
      store.artifactor.save(store.getData(OracleLookup)).then(function(result){
        const json = requireNoCache(expected_filepath);
        console.log('In store');
        console.log(contract(json));
      })
      */
      //instance.setOracleQueryAddress(dispatch);
      // /instance.setOracleResponseAddress(accounts[0]);
      /*
      return deployer.deploy(OracleTest, instance.address)
        .then(function (instance) {
          console.log('Test address :'+instance.address);
        })
      */
    })
  })
};