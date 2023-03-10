import hre, { ethers } from "hardhat";

export const getInstances = async () => {
  const finder = await ethers.getContractAt(
    "Finder",
    "0xc4327fb2726a3E84ef27d8Ea9753dfEc04d569A9"
  );
  const claimIssuerContract = await ethers.getContractAt(
    "ClaimIssuer",
    "0x7A5D65b51E1ce8C9778c6d5927BCD522EF2Bde3F"
  );
  const factory = await ethers.getContractAt(
    "TREXFactory",
    "0x49e53B95D62E78D4e7857f9d7344549aDdd9EF32"
  );
  const RShareInstance = await ethers.getContractAt(
    "RentShare",
    "0x21f1f488E4ADb54B0754e4B8d6D45eDAb935265A"
  );
  const SBT = await ethers.getContractAt(
    "SBT",
    "0xF606c8E3826D1E1Aa7D3790Cc1a7a97d0F5b74dc"
  );
  const jTry = await ethers.getContractAt(
    "MintableBurnableSyntheticTokenPermit",
    "0x30BDfFc75bE96C15ddE75e529709F0349038305A"
  );
  const mock1 = await ethers.getContractAt(
    "MockRandomAggregator",
    "0x4B59dC4fB3BfBff7F9e520569a200ee2C557bDd1"
  );

  const Marketplace = await ethers.getContractAt(
    "Marketplace",
    "0x1B4619e9De901e742E5639f23Ae117899cAD4803"
  );
  return {
    finder,
    claimIssuerContract,
    factory,
    RShareInstance,
    SBT,
    jTry,
    mock1,
    Marketplace,
  };
};

// export default getInstances;
