import { Connections } from "aws-cdk-lib/aws-ec2";
import hre, { ethers } from "hardhat";
import {mine, time} from "@nomicfoundation/hardhat-network-helpers";



async function main() {

  const accounts = await ethers.getSigners();

  var RT = await hre.ethers.getContractFactory("RewardToken");
  var RTInstance = await RT.deploy();
  await RTInstance.deployed();


  var RShare = await hre.ethers.getContractFactory("StakingManager2");
  var RShareInstance = await RShare.deploy(RTInstance.address, 1);
  await RShareInstance.deployed();

  //pool token
  var PT = await hre.ethers.getContractFactory("RewardToken");
  var PTInstance = await PT.deploy();
  await PTInstance.deployed();

  await PTInstance.mint(accounts[1].address, 200);
  await PTInstance.mint(accounts[2].address, 200);
  await PTInstance.mint(accounts[3].address, 200);


  await RShareInstance.createPool(PTInstance.address);

  await PTInstance.connect(accounts[1]).approve(RShareInstance.address, 200);
  //await PTInstance.connect(accounts[2]).approve(RShareInstance.address, 100);


  var BlockNumberBefore = await time.latestBlock();
  console.log("block number before deposit", BlockNumberBefore);
  console.log("-------------First Deposit----------------")
  await RShareInstance.connect(accounts[1]).deposit(0, 100);
  
  console.log("-------------Mining 100 blocks----------------")
  await mine(100);
  console.log("-------------Harvesting Rewards----------------")

  var blockNumber2 = await time.latestBlock();
  console.log("Block Number", blockNumber2);
  await RShareInstance.connect(accounts[1]).harvestRewards(0, "ME");
  console.log("-------------Second Deposit----------------")
  var blockNumber3 = await time.latestBlock();
  console.log("Block Number", blockNumber3);
  await RShareInstance.connect(accounts[1]).deposit(0, 100);

  //await RShareInstance.connect(accounts[2]).deposit(0, 100);
  console.log("-------------Mining 100 blocks----------------")

  await mine(100);


  var blockNumber4 = await time.latestBlock();
  console.log("Block Number", blockNumber4);
  console.log("-------------Withdraw Deposit----------------")

  await RShareInstance.connect(accounts[1]).withdraw(0);
  //await RShareInstance.connect(accounts[2]).withdraw(0);

  var BlockNumberAfter = await time.latestBlock();
  console.log("Block number after ", BlockNumberAfter);



  var balance = await RTInstance.balanceOf(accounts[1].address);
  //var balance2 = await RTInstance.balanceOf(accounts[2].address);

  console.log("rewards accumulated for user 1: ", balance / 1e18);
  //console.log("rewards accumulated for user 2: ", balance2 / 1e18);

























  console.log("Harvest");

}

main().catch((error) => {
      console.error(error);
      process.exitCode = 1;
});