//const store = require('./store');
const OracleDispatch = artifacts.require("OracleDispatch");
const OracleLookup = artifacts.require("OracleLookup");
const OracleTest = artifacts.require("OracleTest");


module.exports = function(deployer, network, accounts) {
  deployer.deploy(OracleDispatch)
    .then(function (instance) {
      //store.storeArtifact(OracleDispatch);
      console.log('Dispatch address :'+instance.address);
      return instance.address;
    })
    .then(function (dispatch) {
      //The "return" in the following line is necessary
      return deployer.deploy(OracleLookup)
        .then(function (instance) {
          console.log('Lookup address :'+instance.address);
          /*
          //await store.storeArtifact(OracleLookup);
          store.artifactor.save(store.getData(OracleLookup)).then(function(result){
            const json = requireNoCache(expected_filepath);
            console.log('In store');
            console.log(contract(json));
          })
          */
          instance.setQueryAddress(dispatch);
          instance.setResponseAddress(accounts[0]);
          /*
          return deployer.deploy(OracleTest, instance.address)
            .then(function (instance) {
              console.log('Test address :'+instance.address);
            })
          */
        })



    })
};
