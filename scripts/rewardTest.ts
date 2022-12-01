import { Connections } from "aws-cdk-lib/aws-ec2";
import hre, { ethers } from "hardhat";
import {mine, time} from "@nomicfoundation/hardhat-network-helpers";



async function main() {

  const accounts = await ethers.getSigners();
  console.log("Address of Account[1] :", accounts[1].address);


  //----------------------DEPLOYING REWARD TOKEN----------------------
  var RT = await hre.ethers.getContractFactory("RewardToken");
  var RTInstance = await RT.deploy();
  await RTInstance.deployed();
  console.log("Reward Token Address : ", RTInstance.address);

  //----------------------DEPLOYING STAKING CONTRACTS-------------------
  var RShare = await hre.ethers.getContractFactory("StakingManager");
  var RShareInstance = await RShare.deploy(RTInstance.address);
  await RShareInstance.deployed();
  console.log("Staking Manger Address : ", RShareInstance.address);
 
  //---------------DEPLOYING STABLE COIN---------------------------------
  var SC = await hre.ethers.getContractFactory("ANERC20");
  var StableCoin = await SC.deploy();
  await StableCoin.deployed();
  await StableCoin.mint(accounts[1].address, 10000);
  console.log("Stable Coin Address : ", StableCoin.address);

  //-----------------DEPLOYING MARKETPLACE ------------------------------
  var MP = await hre.ethers.getContractFactory("Marketplace");
  var Marketplace = await MP.deploy(StableCoin.address);
  await Marketplace.deployed();
  await StableCoin.mint(Marketplace.address, 10000);
  console.log("MarketPlace Address : ", Marketplace.address);

  
  //----------------------DEPLOYING POOL TOKEN CONTRACTS-----------------
   var PT = await hre.ethers.getContractFactory("PropertyToken2");
   var PTInstance = await PT.deploy(Marketplace.address, RShareInstance.address);
   await PTInstance.deployed();
   await PTInstance.mint(Marketplace.address, 10000);
   console.log("Pool Token Address : ", PTInstance.address);

  //---------------------------------------------------------------------------


  await Marketplace.addTesting(RShareInstance.address, PTInstance.address, 2, 1000);

  let Poolid = await Marketplace.viewWLegalToPoolId(PTInstance.address);
  console.log("Poolid is: ", Poolid);

  await PTInstance.setPoolId(0);
  
  await StableCoin.connect(accounts[1]).approve(Marketplace.address, 200);
  await Marketplace.connect(accounts[1]).buy(PTInstance.address, 100);
  let PoolTokenBalanceBefore = await PTInstance.balanceOf(accounts[1].address)
  console.log("Pool token balance of Account 1 :", PoolTokenBalanceBefore);

  //await mine(100);
  await time.increase(604800);

  await PTInstance.connect(accounts[1]).approve(Marketplace.address, 100);
  await await Marketplace.connect(accounts[1]).sell(PTInstance.address, 100);

  let PoolTokenBalanceAfter = await PTInstance.balanceOf(accounts[1].address)
  console.log("Pool token balance of Account 1 :", PoolTokenBalanceAfter);

  let RewardTokenBalanceAfter = await RTInstance.balanceOf(accounts[1].address)
  console.log("Reward token balance of Account 1 :", RewardTokenBalanceAfter / 1e18);


}

main().catch((error) => {
      console.error(error);
      process.exitCode = 1;
});