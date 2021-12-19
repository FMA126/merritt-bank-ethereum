# Defi Yield Aggregator (Back End)

This project is an implementation of [dappuniversity](https://github.com/dappuniversity/yield-aggregator)'s project using a different techstack.

This project is a simple decentrialized app where a user can deposit DAI into our smart contract. Once funds are deposited, the contract compares the interest rate of Compound & Aave, and deposits funds to whichever has the highest interest rate. The user can rebalance his/her funds to ensure that the funds are still currently in the higher interest rate protocol, and can also withdraw at any time.

## Technology Stack & Tools

- Solidity (Writing Smart Contract)
- Javascript (React & Testing)
- [Ethers](https://docs.ethers.io/v5/) (BlockChain Interaction)
- [Hardhat](https://hardhat.org/) (Development Framework)
- [Alchemy](https://www.alchemy.com/) (Forking Ethereum Mainnet)
- [https://metamask.io/](https://metamask.io/) (Ethereum Wallet)
- Openzeppelin (Solidity Math)

## Setting Up
1. Install
>$ npm install
2. Start Local BlockChain
    - > $ npx hardhat compile
    - > $ npx hardhat node
    - > $ npx hardhat run --network localhost scripts/deploy.ts

## Testing
> $ npx hardhat test

# Details
This hardhat project is configured to fork the Ethereum mainnet.  The code to do this is in the hardhat.config file.  When the deploy script is run, the mcd join account is impersonated to be able to mint dai for the first account.  Do not use any of the hardhat generated accounts for anything but testing as these accounts the same for all hardhat users. 


