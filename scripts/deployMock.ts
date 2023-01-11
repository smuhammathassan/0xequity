// import { expect, assert } from "chai";
// import hre, { ethers } from "hardhat";
// import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
// import {deployIdentityProxy} from "./../scripts/deployIdentityProxy";


// var FactoryInstance;
// var tokenAddress: any;
// let user1: any;
// let agent: any;


// describe("ERC3643", function () {
//     beforeEach('SETUP: Deploying factory ', async function () {
       

//         const accounts = await ethers.getSigners();

//         const tokeny = accounts[0];
//         const claimIssuer = accounts[1];
//         const user1 = accounts[2];
//         const user2 = accounts[3];
//         const claimTopics = [7];
//         const agent = accounts[1];


//                 //----------------------DEPLOYING MockAggregatorV3 - 1  CONTRACTS-------------------

//         const MA1 = await hre.ethers.getContractFactory(
//             "MockAggrigatorV3Interface"
//         );
//         //mock 1inch
//         mock1 = await MA1.deploy();
//         await mock1.deployed();
//         await mock1.setDecimals(8);
//         await mock1.setPriceUpdate(ethers.utils.parseUnits("1", 8));
//         console.log("mock1 Address : ", mock1.address);
//         //----------------------DEPLOYING MockAggregatorV3 - 1  CONTRACTS-------------------

//         mock2 = await MA1.deploy();
//         await mock2.deployed();
//         await mock2.setDecimals(8);
//         await mock2.setPriceUpdate(ethers.utils.parseUnits("1", 8));
//         console.log("mock2 Address : ", mock2.address); 


//         await priceFeed.setCurrencyToFeed("", mock1.address);
//         await priceFeed.setCurrencyToFeed("", mock2.address);

//     });

// });
