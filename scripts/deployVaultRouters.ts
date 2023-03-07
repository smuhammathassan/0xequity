import hre, { ethers } from "hardhat";
import { _deploy, _deployWithLibrary } from "../scripts/deployArtifacts";
import { deployTREXFactory } from "./deployTREXFactory";
import { deployMocksTokens } from "./deployMocksTokens";
import { MockTokensConfig } from "./MockTokensConfig";
import { deployRentShare } from "./deployRentShare";
import { deployPriceFeed } from "./deployPriceFeed";
import { deployFeeManager } from "./deployFeeManager";
import { deployOCLRouter } from "./deployOCLRouter";
import { deployMockAggregator } from "./deployMockAggregator";
import { setCurrencyToFeed } from "./setCurrencyToFeed";
import { deployFinder } from "./deployFinder";
import { deploySwapController } from "./deploySwapController";
import { finderConfig } from "./finderConfig";
import { signMetaTxRequest } from "./MetaTx";
import { deployXEQPlatform } from "./0xXeqPlatformdeploy";
import { any } from "hardhat/internal/core/params/argumentTypes";

export async function deployVaultRouter() {
  const accounts = await hre.ethers.getSigners();

  const vaultRouterUSDC = await _deploy("VaultRouter", [
    "0xdD34D1F9bf3AB9E05537D81dCF0Bb93B49C132F7",
    "0x682915B8fF90600Ff3D3a184628ba552F72B93DE",//custom
    "0xd1fAAa2303d6AC46Cf36dDB912434ea23c413EF4",//main
    "0xA6B39F812A99A71296495Db5df8AEc9FbE27FaE0",// x
    "0x798fe91d2cce9638a49570ed14d1d467e91605fb", // gauge
  ]);

  console.log("usdc vault router deployed at", vaultRouterUSDC.address);

  const vaultRouterJtry = await _deploy("VaultRouter", [
    "0xEC01655267Bc72C385F0D2059B60d88B357a949A", // stake token
    "0x78587987dB0BB3963924462d3463641F67198Cb0", // custom vault
    "0xBc6DD17E4682f244c130F8E40E1E14Ff495a345b", // main vault
    "0xFEbF78598C99D9e317e49F4dD6d7A7459DcC9eE9", // xtoken
    "0x7517f35c79299fb7f167fd78a33fc536794fa16a", // gauge
  ]);

  console.log("jtry vault router deployed at", vaultRouterJtry.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deployVaultRouter().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
