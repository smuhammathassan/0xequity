import hre from "hardhat";
export async function marketplaceConfig({
  RShareInstance,
  Maintainer,
  Marketplace,
  finder,
  MarketplaceInterface,
  SBT,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];
  let tx000 = await RShareInstance.connect(tokeny).grantRole(
    Maintainer,
    Marketplace.address
  );
  await tx000.wait();
  let tx0000019 = await finder
    .connect(tokeny)
    .changeImplementationAddress(MarketplaceInterface, Marketplace.address);
  await tx0000019.wait();
  let MarketplaceSBT = await SBT.connect(tokeny).mint(
    Marketplace.address,
    "0xEquity"
  );
  await MarketplaceSBT.wait();
}
