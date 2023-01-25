import hre from "hardhat";
import addMarketplaceClaim from "../scripts/addMarketplaceClaim";

export async function addingMarketplaceClaim({
  Marketplace,
  claimIssuerContract,
  signer,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const user1 = accounts[2];
  console.log("Marketplace => ", Marketplace.address);
  console.log("ClaimIssuerContract => ", claimIssuerContract.address);
  const MarketPlaceIdentity = await addMarketplaceClaim(
    Marketplace,
    user1,
    signer,
    claimIssuerContract
  );

  return { MarketPlaceIdentity };
}
