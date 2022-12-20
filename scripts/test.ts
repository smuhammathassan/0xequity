import { Connections } from "aws-cdk-lib/aws-ec2";
import hre, { ethers } from "hardhat";


async function main() {

        const accounts = await ethers.getSigners();
        console.log("Address 0 is : ", accounts[0].address);
        const Factory = await ethers.getContractFactory("FactoryMaker");
        var identityRegistry = await ethers.getContractFactory("IdentityRegistry");
        let trustedRegistry =  await ethers.getContractFactory("TrustedIssuersRegistry");
        let claimTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry");
        let IdentityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage");
        let compilienceRegistry = await ethers.getContractFactory("DefaultCompliance");
        let AgentRole = await ethers.getContractFactory("AgentRoleUpgradeable");
        let implementationAuthority = await ethers.getContractFactory("ImplementationAuthority");
        let ERC3643 = await ethers.getContractFactory("ERC3643");

        const ERC3643Bytecode = require("../artifacts/contracts/ERC3643/contracts/proxy/TokenProxy.sol/TokenProxy.json").bytecode;
        const propetyBytecode = require("../artifacts/contracts/propertyToken.sol/PropertyToken.json").bytecode;
        let FactoryInstance = await Factory.deploy(ERC3643Bytecode, propetyBytecode);
        console.log("Factory contract address is ", FactoryInstance.address);
        let TIRegistryInstance = await trustedRegistry.deploy();
        let CTRegistryInsstance = await claimTopicsRegistry.deploy();
        let ISRegistry = await IdentityRegistryStorage.deploy();
        let IdentitiyInstance = await identityRegistry.deploy(TIRegistryInstance.address, CTRegistryInsstance.address, ISRegistry.address);
        
        let CRInstance = await compilienceRegistry.deploy();
        await CRInstance.deployed();

        let ERC3643pointer = await ERC3643.deploy();
        console.log("ERC3643 standalble, ", ERC3643pointer.address);
        let IAInstance = await implementationAuthority.deploy(ERC3643pointer.address);
        
        
        
        let address = await FactoryInstance.createLegalToken(IAInstance.address, IdentitiyInstance.address, CRInstance.address, "Texas Benglos", "TB", 18, accounts[10].address);
        let newADDR = await address.wait();
        let LegalTokenAddr = newADDR.events[5].args[0];
        console.log("ERC3643 address is ", newADDR.events[5].args[0]);

        let ERC3643Instance = await ethers.getContractAt("ERC3643", LegalTokenAddr);
        //addAgentOnTokenContract

        console.log("Implementation Authority Address is ", IAInstance.address);
        let owner = await ERC3643Instance.owner();
        console.log("ERC3643 owner is ", owner);
        
        //await ERC3643Instance.addAgentOnTokenContract(accounts[0].address);
        await ERC3643Instance.mint(accounts[0].address, ethers.utils.parseUnits("450", 18));

        
        // let isFactoryAgent = await ERC3643Instance.isAgent(FactoryInstance.address);
        // console.log("is factory an agent ?  ", isFactoryAgent);

        // let isAddressAgent = await ERC3643Instance.isAgent(accounts[0].address);
        // console.log("is deployer an agent ?  ", isAddressAgent);

        // let isSelf = await ERC3643Instance.isAgent(ERC3643Instance.address);
        // console.log("is ERC3643 an agent ?  ", isSelf);




        //let AgentRoleInstance = await AgentRole.deploy();
        // let owner = await ERC3643Instance.owner();
        // console.log("ERC3643 owner is ", owner);
        // await ERC3643Instance.connect(accounts[0]).addAgentOnTokenContract(accounts[0].address);
        //await ERC3643Instance.mint(accounts[0].address, ethers.utils.parseUnits("450", 18));
        //await ERC3643Instance.approve(FactoryInstance.address, ethers.utils.parseUnits("100", 18));

        console.log("done!");

    }

main().catch((error) => {
      console.error(error);
      process.exitCode = 1;
});