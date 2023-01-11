import { Connections } from "aws-cdk-lib/aws-ec2";
import hre, { ethers } from "hardhat";
const propertyTokenBytecode =
  require("./../artifacts/contracts/propertyToken.sol/PropertyToken2.json").bytecode;
const identityBytecode =
  require("./../artifacts/@onchain-id/solidity/contracts/Identity.sol/Identity.json").bytecode;
const implementationAuthorityBytecode =
  require("./../artifacts/@onchain-id/solidity/contracts/proxy/ImplementationAuthority.sol/ImplementationAuthority.json").bytecode;
const identityProxyBytecode =
  require("./../artifacts/@onchain-id/solidity/contracts/proxy/IdentityProxy.sol/IdentityProxy.json").bytecode;

async function main() {
  await hre.run("verify:verify", {
    address: "0x546DE62b9b34e28c80DA66bb4DAfc4323aeCe76c",
    constructorArguments: [
      "0xdfFa384dd445759D39aBF34212f55714c1E6a68A",
      "0xC622cf9fa6a030619007cb949E8C6E3275AAA896",
      "0x7ADF3482c2453D89990FcD967fCd41C7e7cEb82F",
      propertyTokenBytecode,
      identityBytecode,
      implementationAuthorityBytecode,
      identityProxyBytecode
    ]
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
