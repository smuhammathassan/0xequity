import hre, { ethers } from "hardhat";

export async function addPropertyToMarketplace({
  LegalToken,
  Marketplace,
  RShareInstance,
  Maintainer,
  jTry,
  mock1,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];
  const user1 = accounts[2];
  const agent = accounts[4];

  const tx1199 = await LegalToken.connect(agent).unpause();
  await tx1199.wait();
  const tx1221 = await LegalToken.connect(agent).mint(
    user1.address,
    ethers.utils.parseUnits("100", 18)
  );
  await tx1221.wait();
  console.log("Minting Done!");
  console.log("Marketplace Address => ", Marketplace.address);
  let hasMaintainerROle = await RShareInstance.connect(tokeny).hasRole(
    Maintainer,
    Marketplace.address
  );
  console.log("hasMaintainerROle? : ", hasMaintainerROle);
  console.log("RShareInstance => ", RShareInstance.address);

  const tx1222 = await LegalToken.connect(user1).approve(
    Marketplace.address,
    ethers.utils.parseUnits("100", 18)
  );
  await tx1222.wait();
  const tx111 = await Marketplace.connect(user1).addProperty(
    [
      LegalToken.address, //address of legal token address
      100, //shares to lock and issue wrapped tokens
      20, //raito of legal to wrapped legal 1:100
      ethers.utils.parseUnits("100", 18), // total number of legal toens
      [ethers.utils.parseUnits("1050", 18), jTry.address, mock1.address],
    ] //price in dai/usdt/usdc, *jTry* currency in property details
    // ethers.utils.parseUnits("100", 18) //reward per token.
  );
  await tx111.wait();
  console.log("Property Added");
}
