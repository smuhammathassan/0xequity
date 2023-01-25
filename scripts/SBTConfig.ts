import hre from "hardhat";

export async function SBTConfig({ SBT }: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];

  let txAddCommunity1 = await SBT.connect(tokeny).addCommunity("0xEquity", 1);
  await txAddCommunity1.wait();

  console.log("Community Added!");

  let approvedCommunity1 = await SBT.connect(tokeny).addApprovedCommunity(
    "WXEFR1",
    "0xEquity"
  );
  await approvedCommunity1.wait();

  console.log("Community Approved!");
}
