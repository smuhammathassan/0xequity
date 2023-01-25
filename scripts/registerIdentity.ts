import hre from "hardhat";

export async function registerIdentity({
  factory,
  user,
  userIdentity,
  tokenSymbol,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];
  const agent = accounts[4];

  const tokenAddress = await factory.connect(tokeny).getToken(tokenSymbol);
  console.log("tokenAddress", tokenAddress);

  const LegalToken = await hre.ethers.getContractAt("Token", tokenAddress);
  const identityRegistryAddress = await LegalToken.connect(
    tokeny
  ).identityRegistry();

  console.log("identityRegistryAddress", identityRegistryAddress);

  const identityRegistry = await hre.ethers.getContractAt(
    "IdentityRegistry",
    identityRegistryAddress
  );

  const tx16 = await identityRegistry
    .connect(agent)
    .registerIdentity(user, userIdentity, 91);
  await tx16.wait();
  console.log("Identity Registerd!");

  return { LegalToken };
}
