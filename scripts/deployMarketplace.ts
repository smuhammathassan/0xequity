import hre from "hardhat";
import { _deploy, _deployWithLibrary } from "../scripts/deployArtifacts";

export async function deployMarketplace({ finder }: any) {
  const accounts = await hre.ethers.getSigners();
  const buyFeeReceiver = accounts[0].address;
  const user1 = accounts[2];
  const buyFeePercentage = 25; // 5 percentage  (500 / 10000 * 100) = 5%

  const MarketplaceLib = await _deploy("MarketplaceLib", []);

  const MP = await hre.ethers.getContractFactory("Marketplace", {
    libraries: {
      MarketplaceLib: MarketplaceLib.address,
    },
  });
  console.log("User1 address is :", user1.address);

  const Marketplace = await _deployWithLibrary(
    "Marketplace",
    MP,
    [[finder.address, buyFeePercentage, buyFeeReceiver]],
    user1
  );

  return { Marketplace };
}
