import hre, { ethers } from "hardhat";

let TREXFactory;

const deployIa = async () => {

    TREXFactory = await ethers.getContractFactory("TREXFactory");
  
}

module.exports = { deployIa };
