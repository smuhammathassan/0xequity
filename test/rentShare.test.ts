/* eslint-disable prefer-const */
import { tracer } from "hardhat";
import { expect, assert } from "chai";
import hre, { ethers, web3 } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";

let tokeny: any;
let claimIssuer;
let user1: any;
let user2: any;
let agent: any;
let rentShare: Contract;
let rewardToken: Contract;
let stakingToken: Contract;
let RS: any;

describe.only("ERC3643", function () {
    before("NEWSETUP: Deploying factory ", async function () {

        //---------------FETCHING ACCOUNTS---------------------------------

        const accounts = await hre.ethers.getSigners();
        const abiCoder = new ethers.utils.AbiCoder();

        // console.log("accounts", accounts);
        tokeny = accounts[0];
        claimIssuer = accounts[1];
        user1 = accounts[2];
        user2 = accounts[3];
        agent = accounts[4];
        const claimTopics = [7];

        //-----------------***STAKING TOKEN***----------------------------

        let RT = await hre.ethers.getContractFactory("RewardToken");
        stakingToken = await RT.deploy();


        //-----------------***REWARD TOKEN***----------------------------

        rewardToken = await RT.deploy();

        //-------------------***STAKING MANAGER***-------------------------

        RS = await hre.ethers.getContractFactory("StakingManager");

        rentShare = await RS.deploy(rewardToken.address);

        //-----------------------------------------------------------------




    });

    it("Creating Pool", async function () {
        await rentShare.createPool(stakingToken.address);
    });
    it("Trying to Unpause Rewards without setting => REVERT ", async function () {
        await expect(rentShare.unpauseRewards(0)).to.be.revertedWithCustomError(RS, "SetRentFirst");
    });

    it("Setting rewards then calling unpauseRewards", async function () {
        await rentShare.updateRewardPerMonth(0, ethers.utils.parseUnits("700", 18));
        await rentShare.unpauseRewards(0);
    });

    it("Normally calling the reward function", async function () {
        const latestTime = await time.latest();
        console.log("TimeStamp Before Deposit is => ", latestTime);
        await rentShare.deposit(0, user1.address, ethers.utils.parseUnits("1000", 18));
        await time.increase(86400);
        const latestTime1 = await time.latest();
        console.log("Time stamp afer 1 day => ", latestTime1);
        await rentShare.harvestRewards(0, user1.address);
        let user1Balance = await rewardToken.balanceOf(user1.address);
        console.log("user1Balance =>  ", ethers.utils.formatUnits(user1Balance, 18));
    });

    it("Pausing and then increasing time rewards should be same", async function () {
        const latestTime1 = await time.latest();
        console.log("Time stamp before pause => ", latestTime1);
        await rentShare.pauseRewards(0);
        await time.increase(86400);
        const latestTime2 = await time.latest();
        console.log("Time after increasing time 1 more day => ", latestTime2);
        await rentShare.harvestRewards(0, user1.address);
        let user1Balance = await rewardToken.balanceOf(user1.address);
        console.log("user1Balance =>  ", ethers.utils.formatUnits(user1Balance, 18));
    });

    it("unPausing and reward should be same", async function () {
        const latestTime1 = await time.latest();
        console.log("Time stamp before pause => ", latestTime1);
        await rentShare.unpauseRewards(0);
        await rentShare.harvestRewards(0, user1.address);
        let user1Balance = await rewardToken.balanceOf(user1.address);
        console.log("user1Balance =>  ", ethers.utils.formatUnits(user1Balance, 18));
    });







});
