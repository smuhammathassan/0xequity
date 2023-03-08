import hre, { ethers, web3 } from "hardhat";

export async function setCurrencyToFeed({
  priceFeed,
  currency,
  mockAggregator,
  pairname,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];
  const tx = await priceFeed
    .connect(tokeny)
    .setCurrencyToFeed(pairname, currency.address, mockAggregator.address);
  await tx.wait();
}
