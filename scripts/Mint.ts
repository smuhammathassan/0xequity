import { Connections } from "aws-cdk-lib/aws-ec2";
import hre, { ethers } from "hardhat";

async function main() {
  const TOOOOKENN = await hre.ethers.getContractAt(
    "Token",
    "0xDb7C4C6cE85907F82550A5EC94dA4207A5ABEBeB"
  );
  const accounts = await hre.ethers.getSigners();
  const abiCoder = new ethers.utils.AbiCoder();

  console.log("accounts", accounts);
  const tokeny = accounts[0];
  const claimIssuer = accounts[1];
  const user1 = accounts[2];
  const user2 = accounts[3];
  const agent = accounts[4];
  await TOOOOKENN.connect(agent).mint(
    user2.address,
    ethers.utils.parseUnits("200", 8)
  ); // => total minted 1000 user2 = 1000
  console.log("Minting Done!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
