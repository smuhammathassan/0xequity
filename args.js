// for SWAP.sol verification
const { ethers, upgrades } = require("hardhat");
const propertyTokenBytecode =
  require("./artifacts/contracts/propertyToken.sol/PropertyToken2.json").bytecode;
const identityBytecode =
  require("./artifacts/@onchain-id/solidity/contracts/Identity.sol/Identity.json").bytecode;
const implementationAuthorityBytecode =
  require("./artifacts/@onchain-id/solidity/contracts/proxy/ImplementationAuthority.sol/ImplementationAuthority.json").bytecode;
const identityProxyBytecode =
  require("./artifacts/@onchain-id/solidity/contracts/proxy/IdentityProxy.sol/IdentityProxy.json").bytecode;

module.exports = 
//stableCOinAddress, RentShareAddress, PriceFeedAddress
//sal, IA, IR, MC, name , decimal symbol, ochainID
// ["test", "0xeB6D2b4e342E0355C6acB96396232c939411EdBE", "0xbf01a8896D16b49e2B01DFaB55133422c6382805", "0x24CF0375494A212a4fa308B154829c99ae1730cD", "XEFR1", "XEFR1", 18, "0x0000000000000000000000000000000000000042"]
["0x7e3F4090DBe5B3fBAd9a6964bd667e7bD5a7d2C9", "0x33C44cE2b41e08F473aac453E088a127d9C88947", "0x52953150C2036fF5A7331dB6355dd2928783F446"]
// ["0xB6A620318b3c97a07f88Aec6638f5FA21890F454", "0x38fC4A53FC9f3863755F8314136C909Ce2a2F9b2", 0, "WXEFR1", "WXEFR1", 0]