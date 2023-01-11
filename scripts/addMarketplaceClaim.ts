const onchainid = require("@onchain-id/solidity");
const { ethers, web3 } = require("hardhat");

const addMarketplaceClaim = async (
  Marketplace: any,
  deployer: any,
  signer: any,
  claimIssuerContract: any
) => {
  const abiCoder = new ethers.utils.AbiCoder();
  const MarketplaceTx = await Marketplace.connect(deployer).createIdentity();
  const events = await MarketplaceTx.wait();
  console.log(events.events[1].args[0]);
  const MarketPlaceIdentity = events.events[1].args[0];
  const kycApproved = await ethers.utils.formatBytes32String("kyc approved");
  const hashedDataToSign3 = ethers.utils.keccak256(
    abiCoder.encode(
      ["address", "uint256", "bytes"],
      [MarketPlaceIdentity, 7, kycApproved]
    )
  );
  // //signature of singer key and this signature singer should be same.
  const signature3 = await signer.sign(hashedDataToSign3).signature;

  //const Maaaark = await ethers.getContractFactory("Marketplace");
  const Maaaark = await ethers.getContractFactory("Identity");

  const txion = await Marketplace.connect(deployer).callIdentity(
    MarketPlaceIdentity,
    Maaaark.interface.encodeFunctionData(
      "addClaim(uint256,uint256,address,bytes,bytes,string)",
      [7, 1, claimIssuerContract.address, signature3, kycApproved, ""]
    )
  );
  await txion.wait();
  return MarketPlaceIdentity;
};

// eslint-disable-next-line no-undef
export default addMarketplaceClaim;
