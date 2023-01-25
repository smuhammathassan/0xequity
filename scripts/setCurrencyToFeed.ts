import hre, { ethers, web3 } from "hardhat";

export async function setCurrencyToFeed({
  priceFeed,
  currency,
  mockAggregator,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];
  await priceFeed
    .connect(tokeny)
    .setCurrencyToFeed("TRYUSD", currency.address, mockAggregator.address);
}
