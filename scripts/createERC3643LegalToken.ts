import hre from "hardhat";
export async function createERC3643LegalToken({
  claimIssuerContract,
  factory,
  tokenSalt,
  tokenName,
  tokenSymbol,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];
  const agent = accounts[4];

  const tokenDetails = {
    owner: tokeny.address,
    name: tokenName,
    symbol: tokenSymbol,
    decimals: 18,
    irs: "0x0000000000000000000000000000000000000000",
    ONCHAINID: "0x0000000000000000000000000000000000000042",
    irAgents: [tokeny.address, agent.address],
    tokenAgents: [tokeny.address, agent.address],
    complianceModules: [],
    complianceSettings: [],
  };
  //TODO: WHAT 7 IS DOING?
  const claimDetails = {
    claimTopics: [7],
    issuers: [claimIssuerContract.address],
    issuerClaims: [[7]],
  };

  const tx15 = await factory
    .connect(tokeny)
    .deployTREXSuite(tokenSalt, tokenDetails, claimDetails);
  await tx15.wait();
  console.log("TREX SUIT DEPLOYED!");
}
