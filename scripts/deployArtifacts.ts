import hre, { ethers } from "hardhat";
import * as tdr from "truffle-deploy-registry";
import {createHash} from 'crypto';
const network = hre.hardhatArguments.network;


async function internal(Contract:any, contractName: any, args:any, from: any) {

  let contract
  console.log("args", args);
  if(from === null){
    if (args.length === 0 ) {
      console.log("New Deployment without Args >", contractName)
      contract = await Contract.deploy();
    } else {
      console.log("New Deployment wtith Args >", contractName,args)
      contract = await Contract.deploy(...args);
      
    }
    await contract.deployed();
  } else {
    if (args.length === 0 ) {
      console.log("New Deployment without Args >", contractName)
      console.log("From ==============================", from.address);
      contract = await Contract.connect(from).deploy();
    } else {
      console.log("New Deployment wtith Args >", contractName,args)
      contract = await Contract.connect(from).deploy(...args);
      
    }
    await contract.deployed();
  }
  
  if(network && network !== 'hardhat'){
    console.log("Verifiying Contract >", contractName)
    console.log("Contract params>", args)
    if (args.length === 0) {
      await verifyContract(contract.address,[]);
    } else {
      await verifyContract(contract.address, args);
    }
  }
  await tdr.append(contract.deployTransaction.chainId, {
    contractName: contractName,
    address: contract.address,
    transactionHash: contract.deployTransaction.hash,
    byteCodeMd5: createHash('md5').update(Contract.bytecode).digest("hex"),
    args,
  });
  return contract;
  
}

async function verifyContract(contractsAddress : any, constructorArgs : any) {
  try {
    await hre.run("verify:verify", {
      address: contractsAddress,
      constructorArguments: constructorArgs,
    });
  } catch (e) {
    console.log("Error in verifying ", contractsAddress, " contract");
  }
}

async function getExistingContract(contractName : any) {
  const Contract = await ethers.getContractFactory(contractName);
  
  const entry = await tdr.findLastByContractName(hre.network.config.chainId, contractName);
  if (entry) {
    const hash = entry.byteCodeMd5;
    if(hash === createHash('md5').update(Contract.bytecode).digest("hex")){
      return new ethers.Contract(entry.address, Contract.interface)
    }
    return null
    
  }
}

async function getExistingContractWithInstance(contractName : any, instance: any) {
  
  const entry = await tdr.findLastByContractName(hre.network.config.chainId, contractName);
  if (entry) {
    const hash = entry.byteCodeMd5;
    if(hash === createHash('md5').update(instance.bytecode).digest("hex")){
      return new ethers.Contract(entry.address, instance.interface)
    }
    return null
    
  }
}
async function _deploy(contractName : any, args : any = [],from :any = null) {


  const Contract = await ethers.getContractFactory(contractName);
  
  if (network && network !== '') {
    const existingContract = await getExistingContract(contractName)
    if(existingContract){
      console.log("Deployment Already Exist. Skipping deployment >", contractName)
      return existingContract;
    }
    
  }
  return internal(Contract,contractName,args,from)  
}


async function _deployWithLibrary(contractName : any,Contract: any,args : any = [],from :any = null) {

  if (network && network !== '') {
    const existingContract = await getExistingContractWithInstance(contractName,Contract)
    if(existingContract){
      console.log("Deployment Already Exist. Skipping deployment >", contractName)
      return existingContract;
    }
    
  }
  return internal(Contract,contractName,args,from)  
}

const deployArtifacts = async (
  tokeny: any,
  ClaimTopicsRegistry: any,
  TrustedIssuersRegistry: any,
  IdentityRegistryStorage: any,
  IdentityRegistry: any,
  ModularCompliance: any,
  Token: any
) => {
  const claimTopicsRegistry = await ClaimTopicsRegistry.connect(
    tokeny
  ).deploy();
  await claimTopicsRegistry.deployed();
  const trustedIssuersRegistry = await TrustedIssuersRegistry.connect(
    tokeny
  ).deploy();
  await trustedIssuersRegistry.deployed();
  const identityRegistryStorage = await IdentityRegistryStorage.connect(
    tokeny
  ).deploy();
  await identityRegistryStorage.deployed();
  const identityRegistry = await IdentityRegistry.connect(tokeny).deploy();
  await identityRegistry.deployed();
  const modularCompliance = await ModularCompliance.connect(tokeny).deploy();
  await modularCompliance.deployed();
  const token = await Token.connect(tokeny).deploy();
  await token.deployed();

  console.log("claimTopicsRegistry : ", claimTopicsRegistry.address);
  console.log("trustedIssuersRegistry : ", trustedIssuersRegistry.address);
  console.log("identityRegistryStorage : ", identityRegistryStorage.address);
  console.log("identityRegistry : ", identityRegistry.address);
  console.log("modularCompliance : ", modularCompliance.address);
  console.log("token : ", token.address);

  return {
    claimTopicsRegistry,
    trustedIssuersRegistry,
    identityRegistryStorage,
    identityRegistry,
    modularCompliance,
    token
  };
};

export {deployArtifacts, _deploy,_deployWithLibrary};
