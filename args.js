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
  //IA, IR, MC, name , symbol, decimal , ochainID
  ["0x8Fb556C6dc7f9F988c73603F59AcA261De2C132d", "0x3c32e7e22eda3f23daaaa31fa37af9bba8ed1ffc", "0x88A094b33331718521a8D54c64a93821212487f7", "XEFR6", "XEFR6", 18, "0x0000000000000000000000000000000000000042"]
//["0x7e3F4090DBe5B3fBAd9a6964bd667e7bD5a7d2C9", "0x33C44cE2b41e08F473aac453E088a127d9C88947", "0x52953150C2036fF5A7331dB6355dd2928783F446"]
  // ["0xB6A620318b3c97a07f88Aec6638f5FA21890F454", "0x38fC4A53FC9f3863755F8314136C909Ce2a2F9b2", 0, "WXEFR1", "WXEFR1", 0]
  //[[7], ['0x496D24A056F48066227cE424103889E74a7c3F2A'], [[7]]]
//["0x06d1eC299f7511C3df5000f51Fe2f651bb8D9F94", "XEFR2", "XEFR2", 18, "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000042", ["0x06d1eC299f7511C3df5000f51Fe2f651bb8D9F94", "0xc4Eed2ccC5665931D1e11853EAEDB2c6e75Cec4D"], ["0x06d1eC299f7511C3df5000f51Fe2f651bb8D9F94", "0xc4Eed2ccC5665931D1e11853EAEDB2c6e75Cec4D"], [], []]