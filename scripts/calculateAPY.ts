/* eslint-disable */
import { BigNumber, BigNumberish, Contract } from "ethers";
import { ethers } from "hardhat";

export const getCompoundAPY = async (cDAIContract: Contract) => {
  // Reference -> https://compound.finance/docs#protocol-math

  const ethMantissa = 1e18;
  const blocksPerDay = 6570; // 13.15 seconds per block
  const daysPerYear = 365;

  const contract = await cDAIContract
  const result = await contract.functions.supplyRatePerBlock()
  const supplyRatePerBlock = result.call();
  const compAPY = ethers.utils.formatEther(
    (Math.pow(
      (supplyRatePerBlock / ethMantissa) * blocksPerDay + 1,
      daysPerYear
    ) -
      1) *
    100 *
    ethMantissa
  );

  return compAPY;
};

export const getAaveAPY = async (aaveLendingPoolContract: Contract) => {
  const DAI = "0x6b175474e89094c44da98b954eedeac495271d0f";

  const { currentLiquidityRate } = await aaveLendingPoolContract.methods
    .getReserveData(DAI)
    .call();
  const aaveAPY = BigNumber.from(currentLiquidityRate / 1e7);

  return aaveAPY;
};
