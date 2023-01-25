import { addClaim } from "../scripts/addClaim";
import deployIdentityProxye from "../scripts/identityProxy";

export async function addUserClaim({ claimIssuerContract, user, signer }: any) {
  console.log("user => ", user.address);
  const userIdentity = await deployIdentityProxye(user);
  await addClaim(userIdentity, user, signer, claimIssuerContract);
  return { userIdentity };
}
