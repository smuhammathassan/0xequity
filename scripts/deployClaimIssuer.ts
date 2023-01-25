import { _deploy, _deployWithLibrary } from "./deployArtifacts";
import hre, { ethers, web3 } from "hardhat";

export const signer: any = web3.eth.accounts.privateKeyToAccount(
  "0x5b8ae7e0eb7b239874717a1887b4eca9f21c74eda2584919455cf78abb93e0a8"
);
export const signerKey = web3.utils.keccak256(
  web3.eth.abi.encodeParameter("address", signer.address)
);

export async function deployClaimIssuer() {
  const accounts = await hre.ethers.getSigners();
  const claimIssuer = accounts[1];

  const claimIssuerContract = await _deploy(
    "ClaimIssuer",
    [claimIssuer.address],
    claimIssuer
  );

  console.log("claim issuer is : ", claimIssuer.address);
  const addKey = await claimIssuerContract
    .connect(claimIssuer)
    .addKey(signerKey, 3, 1);
  await addKey.wait();

  return { claimIssuerContract };
}
