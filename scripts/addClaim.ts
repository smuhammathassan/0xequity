const onchainid = require("@onchain-id/solidity");
const { ethers, web3 } = require("hardhat");

export const addClaim = async (
  userContract: any,
  deployer: any,
  signer: any,
  claimIssuerContract: any
) => {
  const kycApproved = await ethers.utils.formatBytes32String("kyc approved");
  const hashedDataToSign1 = web3.utils.keccak256(
    web3.eth.abi.encodeParameters(
      ["address", "uint256", "bytes"],
      [userContract.address, 7, kycApproved]
    )
  );
  const signature1 = (await signer.sign(hashedDataToSign1)).signature;
  console.log("Before Adding Claim");

  await userContract
    .connect(deployer)
    .addClaim(7, 1, claimIssuerContract.address, signature1, kycApproved, "");
};
