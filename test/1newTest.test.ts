/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-var-requires */
import { tracer } from "hardhat";
import "@nomiclabs/hardhat-web3";
import { expect, assert } from "chai";
import { Contract } from "ethers";
import hre, { ethers, web3 } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { main } from "./../scripts/0xEquityDeploy";

let FactoryInstance;
let tokenAddress: any;
let user1: any;
let user2: any;
let agent: any;
let claimTopicsRegistry: any;
let trustedIssuersRegistry: any;
let identityRegistryStorage: any;
let identityRegistry: any;
let modularCompliance: any;
let token: any;
let Implementation: any;
let implementationSC: Contract;
let factory: Contract;
let user1Contract: Contract;
let user2Contract: Contract;
let tokeny: any;
let accounts: any;
let Marketplace: Contract;
let StableCoin: Contract;
let RShareInstance: Contract;
let RTInstance: Contract;
let JEuro: Contract;
let jTry: Contract;
let tokenDetails: any;
let claimDetails: any;
let claimIssuer: any;
let MP: any;
let mock1: Contract;
let mock2: Contract;
let priceFeed: Contract;
const signer: any = web3.eth.accounts.create();
const signerKey = web3.utils.keccak256(
  web3.eth.abi.encodeParameter("address", signer.address)
);

let TOOOOKENN: Contract;
let initialized: any;
// => token => 6
// => Aggregator => 8, 6
// => priceFeed => 18
// => swap => 18, quoteprice 100, e18
// 100, e8

describe.only("OnlyTest", function () {
  initialized = false;
  beforeEach("NEWSETUP: Deploying factory ", async function () {});

  it("should test", async function () {
    await main();
  });
});
