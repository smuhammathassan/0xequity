import { Connections } from "aws-cdk-lib/aws-ec2";
import hre, { ethers } from "hardhat";


async function main() {

        const accounts = await ethers.getSigners();
        console.log("Address 0 is : ", accounts[0].address);
        const Factory = await ethers.getContractFactory("TREXFactory");
        // var identityRegistry = await ethers.getContractFactory("IdentityRegistry");
        // let trustedRegistry =  await ethers.getContractFactory("TrustedIssuersRegistry");
        // let claimTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry");
        // let IdentityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage");
        // let compilienceRegistry = await ethers.getContractFactory("DefaultCompliance");
        // let AgentRole = await ethers.getContractFactory("AgentRoleUpgradeable");


        //implementationAuthority => setTokenImplementation => setCTRImplementation => 

        let implementationAuthority = await ethers.getContractFactory("TREXImplementationAuthority");
        let IAInstance = await implementationAuthority.deploy();
        await IAInstance.deployed();

        let ERC3643Implementation = await ethers.getContractFactory("Token");
        let ERC3643ImplementationPointer = await ERC3643Implementation.deploy();
        await ERC3643ImplementationPointer.deployed();

        let tx1 = await IAInstance.setTokenImplementation(ERC3643ImplementationPointer.address);
        await tx1.wait();


        let ClaimTopicsRegistryProxy = await ethers.getContractFactory("ClaimTopicsRegistryProxy");
        let CTRPInstance = await ClaimTopicsRegistryProxy.deploy(IAInstance.address);
        await CTRPInstance.deployed();

        let tx2 = await IAInstance.setCTRImplementation(CTRPInstance.address);
        await tx2.wait();

        let TrustedIssuersRegistryProxy = await ethers.getContractFactory("TrustedIssuersRegistryProxy");
        let TIRInstance = await TrustedIssuersRegistryProxy.deploy(IAInstance.address);
        await TIRInstance.deployed();

        let IdentityRegistryStorageProxy = await ethers.getContractFactory("IdentityRegistryStorageProxy");
        let IRSPInstance = await IdentityRegistryStorageProxy.deploy(IAInstance.address);
        await IRSPInstance.deployed();

        let IdentityRegistryProxy = await ethers.getContractFactory("IdentityRegistryProxy");
        let IRPInstance = await IdentityRegistryProxy.deploy(IAInstance.address, TIRInstance.address, CTRPInstance.address, IRSPInstance.address);
        await IRPInstance.deployed();

        let tx3 = await IAInstance.setIRImplementation(IRPInstance.address);
        await tx3.wait();

        let tx4 = await IAInstance.setIRSImplementation(IRSPInstance.address);
        await tx4.wait();
        let tx5 = await IAInstance.setTIRImplementation(TIRInstance.address);
        await tx5.wait();
        let ModularComplianceProxy = await ethers.getContractFactory("ModularComplianceProxy");
        let MCPInstance = await ModularComplianceProxy.deploy(IAInstance.address);
        await MCPInstance.deployed();

        let tx6 = await IAInstance.setMCImplementation(MCPInstance.address);
        await tx6.wait();


        let ClaimIssuer = await ethers.getContractFactory("ClaimIssuer");
        let ClaimIssuerInstance = await ClaimIssuer.deploy(accounts[0].address);
        await ClaimIssuerInstance.deployed();



       
        // //const ERC3643Bytecode = require("../artifacts/contracts/ERC3643/contracts/proxy/TokenProxy.sol/TokenProxy.json").bytecode;

        // //console.log(aaaa);
        // //const propetyBytecode = require("../artifacts/contracts/propertyToken.sol/PropertyToken.json").bytecode;
        let FactoryInstance = await Factory.deploy(IAInstance.address, {gasLimit: 30000000});
        await FactoryInstance.deployed();

        console.log("Factory contract address is ", FactoryInstance.address);
         
        
        // let TIRegistryInstance = await trustedRegistry.deploy();
        // let CTRegistryInsstance = await claimTopicsRegistry.deploy();
        // let ISRegistry = await IdentityRegistryStorage.deploy();
        // let IdentitiyInstance = await identityRegistry.deploy(TIRegistryInstance.address, CTRegistryInsstance.address, ISRegistry.address);
        
        // // let CRInstance = await compilienceRegistry.deploy();
        // // await CRInstance.deployed();

        
        // // console.log("ERC3643 standalble, ", ERC3643pointer.address);
        //let dataTypes = ["address", "string", "string", "uint8", "address", "address", "address[]", "address[]", "address[]", "bytes[]"];

        let tokenDetails = {
            owner: accounts[0].address,
            name: 'TREXDINO',
            symbol: 'TREX',
            decimals: 0,
            irs: '0x0000000000000000000000000000000000000000',
            ONCHAINID: '0x0000000000000000000000000000000000000042',
            irAgents: [accounts[0].address, FactoryInstance.address],
            tokenAgents: [accounts[0].address, FactoryInstance.address],
            complianceModules: [],
            complianceSettings: [],
          };
        let zeroAddress = '0x0000000000000000000000000000000000000000';

        let TokenDetails = [accounts[0].address, "Texas Benglos", "TB", 0, zeroAddress, zeroAddress, [accounts[0].address, FactoryInstance.address], [], [], '0x00'];

        let claimDetails = { claimTopics: [7], issuers: [accounts[0].address], issuerClaims: [7] };

        let address = await FactoryInstance.deployTREXSuite("saletteee", tokenDetails, [[7], [], []]);

        



        // let tokenDetailz  = ethers.utils.solidityPack(dataTypes, TokenDetails);
        // console.log("token details ", tokenDetailz);
        
        //let address = await FactoryInstance.createLegalToken("saletteee", TokenDetails, '0x00');

        // let newADDR = await address.wait();
        // let LegalTokenAddr = newADDR.events[5].args[0];
        // console.log("ERC3643 address is ", newADDR.events[5].args[0]);

        // let ERC3643Instance = await ethers.getContractAt("ERC3643", LegalTokenAddr);
        //addAgentOnTokenContract

        // console.log("Implementation Authority Address is ", IAInstance.address);
        // let owner = await ERC3643Instance.owner();
        // console.log("ERC3643 owner is ", owner);
        
        //await ERC3643Instance.addAgentOnTokenContract(accounts[0].address);
        //await ERC3643Instance.mint(accounts[0].address, ethers.utils.parseUnits("450", 18));

        
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