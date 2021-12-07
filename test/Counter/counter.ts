/* eslint-disable prettier/prettier */
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Counter", function () {
    it("Should return the new count once it's changed", async function () {
        const Counter = await ethers.getContractFactory("Counter");
        const counter = await Counter.deploy();
        await counter.deployed();

        expect(await counter.count()).to.equal(0);

        const setCountTx = await counter.increment();

        // wait until the transaction is mined
        await setCountTx.wait();

        expect(await counter.getCount()).to.equal(1);
    });
});
