import hre, { ethers } from "hardhat";

  
async function deployIdentityProxy(identityIssuer : any) {

  var Identity = await hre.ethers.getContractFactory("Identity");
  var IdentityImplementation = await hre.ethers.getContractFactory("ImplementationAuthority");
  var idProxy = await hre.ethers.getContractFactory("IdentityProxy");
    
  var identityImplementation = await Identity.deploy(identityIssuer.address, true);
  var implementation = await IdentityImplementation.deploy(identityImplementation.address);
  var identityProxy = await idProxy.connect(identityIssuer).deploy(implementation.address, identityIssuer.address);
  return identityProxy;
  
}

module.exports = {
  deployIdentityProxy,
};