import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});
/*eslint-disable*/
task("mint-dai", "Use mcd join address in order to mint dai", async (taskArgs, hre) => {
  const mcdJoinAddress = '0x9759A6Ac90977b93B58547b4A71c78317f391A28';
  const [signer] = await hre.ethers.getSigners();
  const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f' // ERC20 DAI Address
  const daiAbi = await hre.artifacts.readArtifact('DAI');
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [mcdJoinAddress],
  });
  const mcdJoinSigner = await hre.ethers.getSigner(mcdJoinAddress);
  await hre.network.provider.send('hardhat_setBalance', [mcdJoinAddress, hre.ethers.utils.hexValue(hre.ethers.utils.parseEther('1000'))]);
  const daiContractImp = new hre.ethers.Contract(daiAddress, daiAbi.abi, mcdJoinSigner);

  await daiContractImp.mint(signer.address, hre.ethers.utils.parseEther('100'));
  const balance = await daiContractImp.balanceOf(signer.address)
  console.log(`${hre.ethers.utils.formatEther(balance)} DAI minted to ${signer.address}`)
  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: ['0x9759A6Ac90977b93B58547b4A71c78317f391A28'],
  });
})

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: "0.8.4",
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-mainnet.alchemyapi.io/v2/VtXD9VCcBb7Z8AfnWfcINFAgoIrwwbYZ",
        blockNumber: 13780385,
      },
      // mining: {
      //   auto: false,
      //   interval: 5000,
      //   mempool: {
      //     order: "fifo",
      //   },
      // },
    },
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
