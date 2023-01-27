import { deploySBT } from "./deploySBT";
import { SBTConfig } from "./SBTConfig";

async function main() {
  const { SBT } = await deploySBT();
  console.log("Before SBT Config");
  await SBTConfig({ SBT });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
