import hre, { ethers, web3 } from "hardhat";
import { bytecode as propertyTokenBytecode } from "../artifacts/contracts/propertyToken.sol/PropertyToken.json";
import { bytecode as identityBytecode } from "../artifacts/@onchain-id/solidity/contracts/Identity.sol/Identity.json";
import { bytecode as implementationAuthorityBytecode } from "../artifacts/@onchain-id/solidity/contracts/proxy/ImplementationAuthority.sol/ImplementationAuthority.json";
import { bytecode as identityProxyBytecode } from "../artifacts/@onchain-id/solidity/contracts/proxy/IdentityProxy.sol/IdentityProxy.json";

export async function finderConfig({
  finder,
  RShareInstance,
  priceFeed,
  vTRY,
  SBT,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];

  const RentshareInterface = ethers.utils.formatBytes32String("RentShare");
  const PriceFeedInterface = ethers.utils.formatBytes32String("PriceFeed");
  const PropertyTokenInterface =
    ethers.utils.formatBytes32String("PropertyToken");
  const IndentityInterface = ethers.utils.formatBytes32String("Identity");
  const ImplementationAuthorityInterface = ethers.utils.formatBytes32String(
    "ImplementationAuthority"
  );
  const IdentityProxyInterface =
    ethers.utils.formatBytes32String("IdentityProxy");
  const Maintainer = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("Maintainer")
  );
  const MarketplaceInterface = ethers.utils.formatBytes32String("Marketplace");
  const burnerRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Burner"));
  const RewardTokenInterface = ethers.utils.formatBytes32String("RewardToken");
  const SBTInterface = ethers.utils.formatBytes32String("SBT");

  let tx0000011 = await finder
    .connect(tokeny)
    .changeImplementationAddress(RentshareInterface, RShareInstance.address);
  await tx0000011.wait();
  let tx0000012 = await finder
    .connect(tokeny)
    .changeImplementationAddress(PriceFeedInterface, priceFeed.address);
  await tx0000012.wait();
  let tx0000013 = await finder
    .connect(tokeny)
    .changeImplementationBytecode(
      PropertyTokenInterface,
      propertyTokenBytecode
    );
  await tx0000013.wait();
  let tx0000014 = await finder
    .connect(tokeny)
    .changeImplementationBytecode(IndentityInterface, identityBytecode);
  await tx0000014.wait();
  let tx0000015 = await finder
    .connect(tokeny)
    .changeImplementationBytecode(
      ImplementationAuthorityInterface,
      implementationAuthorityBytecode
    );
  await tx0000015.wait();
  let tx0000016 = await finder
    .connect(tokeny)
    .changeImplementationBytecode(
      IdentityProxyInterface,
      identityProxyBytecode
    );
  await tx0000016.wait();
  let tx0000017 = await finder
    .connect(tokeny)
    .changeImplementationAddress(RewardTokenInterface, vTRY.address);
  await tx0000017.wait();
  let tx0000020 = await finder
    .connect(tokeny)
    .changeImplementationAddress(SBTInterface, SBT.address);
  await tx0000020.wait();
  console.log("Finder Configuration added!");

  return { Maintainer, MarketplaceInterface, burnerRole };
}
