const { ethers, web3 } = require("hardhat");
const { signTypedData } = require("eth-sig-util");
import hre from "hardhat";

export async function rsvGen({
  Contract,
  Symbol,
  Owner,
  Spender,
  Value,
  Deadline,
}: any) {
  const encodedStr = {
    types: {
      EIP712Domain: [
        {
          name: "name",
          type: "string",
        },
        {
          name: "version",
          type: "string",
        },
        {
          name: "chainId",
          type: "uint256",
        },
        {
          name: "verifyingContract",
          type: "address",
        },
      ],
      Permit: [
        {
          name: "owner",
          type: "address",
        },
        {
          name: "spender",
          type: "address",
        },
        {
          name: "value",
          type: "uint256",
        },
        {
          name: "nonce",
          type: "uint256",
        },
        {
          name: "deadline",
          type: "uint256",
        },
      ],
    },
    primaryType: "Permit",
    domain: {
      name: Symbol,
      version: "1",
      chainId: hre.network.config.chainId,
      verifyingContract: Contract.address.toLowerCase(),
    },
    message: {
      owner: Owner,
      spender: Spender,
      value: Value,
      nonce: 0,
      deadline: Deadline,
    },
  };

  //const signTypedData = web3.eth.signTypedData(encodedStr);
  ("0x5b8ae7e0eb7b239874717a1887b4eca9f21c74eda2584919455cf78abb93e0a8");

  let signature = signTypedData(
    Buffer.from(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80".slice(
        2
      ),
      "hex"
    ),
    {
      data: encodedStr,
    }
  );

  // let signature = EthCrypto.sign(
  //   "0x5b8ae7e0eb7b239874717a1887b4eca9f21c74eda2584919455cf78abb93e0a8", //privateKey
  //   signTypedData
  // );
  console.log(signature);

  const decodeSignature = (signature: any) => {
    const r = signature.slice(0, 66);
    const s = "0x".concat(signature.slice(66, 130));
    let v: any = "0x".concat(signature.slice(130, 132));
    v = parseInt(signature.substring(130, 132), 16);
    if (![27, 28].includes(v)) v += 27;
    return { r, s, v };
  };

  const { r, s, v } = decodeSignature(signature);
  return { r, s, v };
  //const v_decimal = web3.toDecimal(v);
}
