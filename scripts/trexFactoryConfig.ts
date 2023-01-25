export async function trexFactoryConfig({
  implementationSC,
  tokeny,
  token,
  claimTopicsRegistry,
  trustedIssuersRegistry,
  identityRegistryStorage,
  identityRegistry,
  modularCompliance,
}: any) {
  const tx1 = await implementationSC
    .connect(tokeny)
    .setCTRImplementation(claimTopicsRegistry.address);
  console.log(":AFTER CTRY IMPLEMENTATION:");
  await tx1.wait();
  const tx2 = await implementationSC
    .connect(tokeny)
    .setTIRImplementation(trustedIssuersRegistry.address);
  await tx2.wait();
  const tx3 = await implementationSC
    .connect(tokeny)
    .setIRSImplementation(identityRegistryStorage.address);
  await tx3.wait();
  const tx4 = await implementationSC
    .connect(tokeny)
    .setIRImplementation(identityRegistry.address);
  await tx4.wait();
  const tx5 = await implementationSC
    .connect(tokeny)
    .setTokenImplementation(token.address);
  await tx5.wait();
  const tx6 = await implementationSC
    .connect(tokeny)
    .setMCImplementation(modularCompliance.address);
  await tx6.wait();
}
