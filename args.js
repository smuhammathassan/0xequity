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
// ["0xEf5c59D03B05821C586009c6830A52aBbE2920bF", "0x692fDCe223c4bdB4a967041A5f602a3fAb54D752", "0x30C5503Cb7DDF103465A62AA04C39D0eCB3b82c1"]
["0xF538F9f8462773AE5b2742d56bA6f638e068Fd45", "0x6d55D74a976635722b9c6C573DBf614ac9Ab6f2C", 0, "WXEFR1", "WXEFR1"]