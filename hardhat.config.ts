import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-etherscan";
import "@nomicfoundation/hardhat-network-helpers";
import "@typechain/hardhat";
import "xdeployer";
// import "hardhat-gas-reporter";
import "solidity-coverage";
// import "hardhat-contract-sizer";
// import * as tdly from "@tenderly/hardhat-tenderly";
import "hardhat-abi-exporter";
import "hardhat-tracer";
import "@nomiclabs/hardhat-web3";
import * as dotenv from "dotenv";
// import { AutoScalingAction } from "aws-cdk-lib/aws-cloudwatch-actions";
// import "@tenderly/hardhat-tenderly";

dotenv.config();

// Turning off the automatic Tenderly verification
// tdly.setup({ automaticVerifications: false });

task("accounts", "Prints the list of accounts", async (_, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task(
  "balances",
  "Prints the list of accounts and their balances",
  async (_, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
      console.log(
        account.address +
          " " +
          (await hre.ethers.provider.getBalance(account.address))
      );
    }
  }
);

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  mocha: {
    timeout: 100000000,
  },
  networks: {
    hardhat: {
      gas: "auto",
      blockGasLimit: 100000000429720,
      initialBaseFeePerGas: 0,
      chainId: 31337,
      hardfork: "merge",
      forking: {
        url: process.env.ETH_MAINNET_URL || "",
        // The Hardhat network will by default fork from the latest mainnet block
        // To pin the block number, specify it below
        // You will need access to a node with archival data for this to work!
        // blockNumber: 14743877,
        // If you want to do some forking, set `enabled` to true
        enabled: false,
      },
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      gas: 3500000,
      gasPrice: 35000000000,
    },
    // "truffle-dashboard": {
    //   url: "http://localhost:24012/rpc",
    // },
    // tenderly: {
    //   url: `https://rpc.tenderly.co/fork/${process.env.TENDERLY_FORK_ID}`,
    // },
    // rinkeby: {
    //   chainId: 4,
    //   url: process.env.ETH_RINKEBY_TESTNET_URL || "",
    //   accounts:
    //     process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    // },
    // kovan: {
    //   chainId: 42,
    //   url: process.env.ETH_KOVAN_TESTNET_URL || "",
    //   accounts:
    //     process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    // },
    // ropsten: {
    //   chainId: 3,
    //   url: process.env.ETH_ROPSTEN_TESTNET_URL || "",
    //   accounts:
    //     process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    // },
    goerli: {
      chainId: 5,
      url: process.env.ETH_GOERLI_TESTNET_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    bscTestnet: {
      chainId: 97,
      url: process.env.BSC_TESTNET_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    bscMain: {
      chainId: 56,
      url: process.env.BSC_MAINNET_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    optimismTestnet: {
      chainId: 420,
      url: process.env.OPTIMISM_TESTNET_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    mumbai: {
      chainId: 80001,
      url: process.env.POLYGON_TESTNET_URL || "",
      accounts: [
        `${process.env.PRIVATE_KEY0}`,
        `${process.env.PRIVATE_KEY1}`,
        `${process.env.PRIVATE_KEY2}`,
        `${process.env.PRIVATE_KEY3}`,
        `${process.env.PRIVATE_KEY4}`,
        `${process.env.PRIVATE_KEY5}`,
        `${process.env.PRIVATE_KEY6}`,
      ],
      gasPrice: 20000000000, // 20 GWEI
      gas: "auto",
    },

    // polygon: {
    //   chainId: 137,
    //   url: process.env.POLYGON_MAINNET_URL || "",
    //   accounts:
    //     process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    // },

    fuji: {
      chainId: 43113,
      gasPrice: 50000000000,
      url: process.env.AVALANCHE_TESTNET_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined
          ? [
              `${process.env.PRIVATE_KEY1}`,
              `${process.env.PRIVATE_KEY2}`,
              `${process.env.PRIVATE_KEY3}`,
              `${process.env.PRIVATE_KEY4}`,
            ]
          : [],
    },
  },
  xdeploy: {
    // Change this name to the name of your main contract
    // Does not necessarily have to match the contract file name
    contract: "Greeter",

    // Change to `undefined` if your constructor does not have any input arguments
    constructorArgsPath: "./deploy-args.ts",

    // The salt must be the same for each EVM chain for which you want to have a single contract address
    // Change the salt if you are doing a re-deployment with the same codebase
    salt: process.env.SALT,

    // This is your wallet's private key
    signer: process.env.PRIVATE_KEY,

    // Use the network names specified here: https://github.com/pcaversaccio/xdeployer#configuration
    // Use `localhost` or `hardhat` for local testing
    networks: ["hardhat", "rinkeby", "bscTestnet"],

    // Use the matching env URL with your chosen RPC in the `.env` file
    rpcUrls: [
      "hardhat",
      process.env.ETH_RINKEBY_TESTNET_URL,
      process.env.BSC_TESTNET_URL,
    ],

    // Maximum limit is 15 * 10 ** 6 or 15,000,000. If the deployments are failing, try increasing this number
    // However, keep in mind that this costs money in a production environment!
    gasLimit: 1.2 * 10 ** 6,
  },
  // gasReporter: {
  //   enabled: process.env.REPORT_GAS !== undefined,
  //   currency: "USD",
  // },

  abiExporter: {
    path: "./abis",
    runOnCompile: true,
    clear: true,
    flat: false,
    only: [],
    spacing: 2,
  },
  etherscan: {
    apiKey: {
      // For Mainnet, Ropsten, Rinkeby, Goerli, Kovan, Sepolia
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGON_API_KEY || "",
      polygonMumbai: process.env.POLYGON_API_KEY || "",
    },
  },
  tenderly: {
    username: "MyAwesomeUsername",
    project: "super-awesome-project",
    forkNetwork: "",
    privateVerification: false,
    deploymentsDir: "deployments_tenderly",
  },
  // contractSizer: {
  //   alphaSort: true,
  //   runOnCompile: true,
  //   disambiguatePaths: false,
  //   strict: true,
  //   only: [],
  //   except: [],
  // },
};

export default config;
