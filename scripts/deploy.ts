// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { artifacts, ethers, network } from 'hardhat';

async function main() {
  const mcdJoinAddress = '0x9759A6Ac90977b93B58547b4A71c78317f391A28';
  const [signer] = await ethers.getSigners();
  const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f'; // ERC20 DAI Address
  const daiAbi = await artifacts.readArtifact('DAI');

  await network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [mcdJoinAddress],
  });

  const mcdJoinSigner = await ethers.getSigner(mcdJoinAddress);
  await network.provider.send('hardhat_setBalance', [
    mcdJoinAddress,
    ethers.utils.hexValue(ethers.utils.parseEther('1000')),
  ]);
  const daiContractImp = new ethers.Contract(
    daiAddress,
    daiAbi.abi,
    mcdJoinSigner
  );
  const mint = await daiContractImp.mint(
    signer.address,
    ethers.utils.parseEther('100')
  );
  await mint.wait();
  const balance = await daiContractImp.balanceOf(signer.address);
  console.log(
    `${ethers.utils.formatEther(balance)} DAI minted to ${signer.address}`
  );

  await network.provider.request({
    method: 'hardhat_stopImpersonatingAccount',
    params: ['0x9759A6Ac90977b93B58547b4A71c78317f391A28'],
  });
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const Aggregator = await ethers.getContractFactory('Aggregator');
  const aggregator = await Aggregator.deploy();

  await aggregator.deployed();

  console.log('Aggregator deployed to:', aggregator.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
