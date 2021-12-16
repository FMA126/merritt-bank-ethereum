/* eslint-disable prettier/prettier */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, ContractFactory, Signer, BigNumber } from "ethers";
import { artifacts, ethers, network } from "hardhat";
import { Artifact } from "hardhat/types";

const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f' // ERC20 DAI Address
const cDai = '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643' // Compound's cDAI Address
const aaveLendingPool = '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9' // Aave's Lending Pool Contract


const getCompoundAPY = async (CDAIContract: Contract): Promise<BigNumber> => {
    // Reference -> https://compound.finance/docs#protocol-math

    const ethMantissa = 1e18;
    const blocksPerDay = 6570; // 13.15 seconds per block
    const daysPerYear = 365;
    const supplyRatePerBlock = await CDAIContract.supplyRatePerBlock();

    return ethers.utils.parseUnits(((((Math.pow((supplyRatePerBlock / ethMantissa * blocksPerDay) + 1, daysPerYear))) - 1) * 100).toPrecision(3));
}

const getAaveAPY = async (AaveLendingPoolContract: Contract): Promise<BigNumber> => {
    const DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';
    const ray = 10 ** 27;
    const { currentLiquidityRate } = await AaveLendingPoolContract.getReserveData(DAI);
    const depositAPR = currentLiquidityRate / ray;
    const depositAPY = ethers.utils.parseUnits(((((1 + (depositAPR / (365 * 24 * 60 * 60))) ** (365 * 24 * 60 * 60)) - 1) * 100).toPrecision(3));
    return depositAPY;
    // return ethers.utils.parseUnits((currentLiquidityRate / 1e7).toPrecision(3));
}

describe("Aggregator", function () {
    let Aggregator: ContractFactory;
    let aggregator: Contract;
    let DaiContractUsr: Contract;
    let CDaiContractUsr: Contract;
    let AaveContractUsr: Contract;
    let daiAbi: Artifact;
    let cDaiAbi: Artifact;
    let AaveAbi: Artifact;
    let signer: SignerWithAddress;
    let mcdJoinSigner: Signer; // impersonate mcd join contract
    let daiContractImp: Contract;
    before(async () => {
        daiAbi = await artifacts.readArtifact('DAI');
        cDaiAbi = await artifacts.readArtifact('cDAI');
        AaveAbi = await artifacts.readArtifact('AaveLendingPool');
        const [signer0] = await ethers.getSigners();
        signer = signer0;
        DaiContractUsr = new Contract(daiAddress, daiAbi.abi, signer);
        CDaiContractUsr = new Contract(cDai, cDaiAbi.abi, signer);
        AaveContractUsr = new Contract(aaveLendingPool, AaveAbi.abi, signer);
    })
    describe("DAI", function () {
        before(async () => {
            await network.provider.request({
                method: "hardhat_impersonateAccount",
                params: ["0x9759A6Ac90977b93B58547b4A71c78317f391A28"],
            });
            mcdJoinSigner = await ethers.getSigner('0x9759A6Ac90977b93B58547b4A71c78317f391A28');
            await network.provider.send('hardhat_setBalance', ['0x9759A6Ac90977b93B58547b4A71c78317f391A28', ethers.utils.hexValue(ethers.utils.parseEther('100'))]);
            daiContractImp = new ethers.Contract(daiAddress, daiAbi.abi, mcdJoinSigner);

        })
        after(async () => {
            //     await network.provider.request({
            //         method: "hardhat_stopImpersonatingAccount",
            //         params: ['0x9759A6Ac90977b93B58547b4A71c78317f391A28'],
            //     });
            // });
            it('mint DAI', async () => {
                await daiContractImp.mint(signer.address, ethers.utils.parseEther('99'));
                const balance = await daiContractImp.balanceOf(signer.address)
                expect(balance).to.equal(ethers.utils.parseEther('99'));
            })
        });

        describe('Yield Aggregator Features', function () {
            beforeEach(async () => {
                Aggregator = await ethers.getContractFactory("Aggregator");
                aggregator = await Aggregator.deploy();
                await aggregator.deployed();
            })
            it('passes the smoke test', async () => {
                const result = await aggregator.name()
                expect(result).to.equal("Yield Aggregator")
            })
            it('calculates compound apy', async () => {
                const apy = await getCompoundAPY(CDaiContractUsr);
                expect(apy.isZero()).to.equal(false);
            })
            it('calculates aave apy', async () => {
                const apy: BigNumber = await getAaveAPY(AaveContractUsr)
                expect(apy.isZero()).to.equal(false);
            })
        })

        describe('deposits', async () => {

            const amount = 10;
            const amountInWei = ethers.utils.parseEther(amount.toString())
            let compAPY: BigNumber;
            let aaveAPY: BigNumber;
            let AggregatorImp: Contract;
            // let AggregatorUsr: Contract;
            let result: any;

            describe('success', async () => {
                beforeEach(async () => {
                    AggregatorImp = aggregator.connect(mcdJoinSigner);
                    // Fetch Compound APY
                    compAPY = await getCompoundAPY(CDaiContractUsr)

                    // Fetch Aave APY
                    aaveAPY = await getAaveAPY(AaveContractUsr)

                    // Approve
                    await daiContractImp.approve(AggregatorImp.address, amountInWei);

                    // Initiate deposit
                    result = await AggregatorImp.deposit(amountInWei, compAPY, aaveAPY)
                })

                it('tracks the dai amount', async () => {
                    // Check dai balance in smart contract
                    const balance = await aggregator.amountDeposited()
                    balance.toString().should.equal(amountInWei.toString())
                })

                it('tracks where dai is stored', async () => {
                    result = await aggregator.balanceWhere()
                    console.log(result)
                })

                it('emits deposit event', async () => {
                    const log = result.logs[0]
                    log.event.should.equal('Deposit')
                })
            })
        })
    })

    //     describe('failure', async () => {

    //         it('fails when transfer is not approved', async () => {
    //             await aggregator.deposit(amountInWei, compAPY, aaveAPY, { from: deployer }).should.be.rejectedWith(EVM_REVERT)
    //         })

    //         it('fails when amount is 0', async () => {
    //             await aggregator.deposit(0, compAPY, aaveAPY, { from: deployer }).should.be.rejectedWith(EVM_REVERT)
    //         })

    //     })

    // })

    // describe('withdraws', async () => {

    //     let amount = 10
    //     let amountInWei = web3.utils.toWei(amount.toString(), 'ether')
    //     let compAPY, aaveAPY
    //     let result

    //     describe('success', async () => {
    //         beforeEach(async () => {
    //             // Fetch Compound APY
    //             compAPY = await getAPY.getCompoundAPY(cDAI_contract)

    //             // Fetch Aave APY
    //             aaveAPY = await getAPY.getAaveAPY(aaveLendingPool_contract)

    //             // Approve
    //             await daiContract.methods.approve(aggregator.address, amountInWei).send({ from: deployer })

    //             // Initiate deposit
    //             await aggregator.deposit(amountInWei, compAPY, aaveAPY, { from: deployer })
    //         })

    //         it('emits withdraw event', async () => {
    //             result = await aggregator.withdraw({ from: deployer })
    //             const log = result.logs[0]
    //             log.event.should.equal('Withdraw')
    //         })

    //         it('updates the user contract balance', async () => {
    //             await aggregator.withdraw({ from: deployer })
    //             result = await aggregator.amountDeposited.call()
    //             result.toString().should.equal("0")
    //         })

    //     })

    //     describe('failure', async () => {

    //         it('fails if user has no balance', async () => {
    //             await aggregator.withdraw({ from: deployer }).should.be.rejectedWith(EVM_REVERT)
    //         })

    //         it('fails if a different user attempts to withdraw', async () => {
    //             await aggregator.withdraw({ from: user2 }).should.be.rejectedWith(EVM_REVERT)
    //         })

    //     })

    // })

    // describe('rebalance', async () => {

    //     let compAPY, aaveAPY

    //     describe('failure', async () => {
    //         beforeEach(async () => {
    //             // Fetch Compound APY
    //             compAPY = await getAPY.getCompoundAPY(cDAI_contract)

    //             // Fetch Aave APY
    //             aaveAPY = await getAPY.getAaveAPY(aaveLendingPool_contract)
    //         })

    //         it('fails if user has no balance', async () => {
    //             await aggregator.rebalance(compAPY, aaveAPY, { from: deployer }).should.be.rejectedWith(EVM_REVERT)
    //         })

    //     })

    // })

});