const { expect } = require("chai");
const { ethers } = require("hardhat");

// helper function to make code more readable
async function deploy(name: string, ...params: any[]) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f: any) => f.deployed());
}

// see https://eips.ethereum.org/EIPS/eip-712 for more info
const EIP712Domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

const ForwardRequest = [
  { name: "from", type: "address" },
  { name: "to", type: "address" },
  { name: "value", type: "uint256" },
  { name: "gas", type: "uint256" },
  { name: "nonce", type: "uint256" },
  { name: "data", type: "bytes" },
];

function getMetaTxTypeData(chainId: number, verifyingContract: string) {
  return {
    types: {
      EIP712Domain,
      ForwardRequest,
    },
    domain: {
      name: "MinimalForwarder",
      version: "0.0.1",
      chainId,
      verifyingContract,
    },
    primaryType: "ForwardRequest",
  };
}

async function signTypedData(signer: any, from: string, data: any) {
  // Send the signTypedData RPC call
  const [method, argData] = ["eth_signTypedData_v4", JSON.stringify(data)];
  return await signer.send(method, [from, argData]);
}

async function buildRequest(forwarder: any, input: any) {
  const nonce = await forwarder
    .getNonce(input.from)
    .then((nonce: number) => nonce.toString());
  return { value: 0, gas: 1e6, nonce, ...input };
}

async function buildTypedData(forwarder: any, request: any) {
  const chainId = await forwarder.provider
    .getNetwork()
    .then((n: any) => n.chainId);
  const typeData = getMetaTxTypeData(chainId, forwarder.address);
  return { ...typeData, message: request };
}

export async function signMetaTxRequest(
  signer: any,
  forwarder: any,
  input: any
) {
  console.log("before buildRequest");
  const request = await buildRequest(forwarder, input);
  const toSign = await buildTypedData(forwarder, request);
  const signature = await signTypedData(signer, input.from, toSign);
  return { signature, request };
}
