const { expect, assert } = require("chai");
const { defaultAccounts } = require("ethereum-waffle");
const { providers, BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("NFT and Marketplace", async function () {
  let mytoken, market, owner, addr1, addr2, addrs;
  // const [owner, account1, account2] = await ethers.getSigners();
  // console.log(owner.address)
  // console.log(account1.address)
  // console.log(account2.address)
  const NFT0_PRICE = ethers.utils.parseEther("1.0")
  const NFT1_PRICE = ethers.utils.parseEther("2.0")

  // const EXPECTED_NFT0_ROYALTY = ethers.utils.parseEther("0.00")
  const EXPECTED_NFT0_ROYALTY = ethers.utils.parseEther("0.05")
  const EXPECTED_NFT1_ROYALTY = ethers.utils.parseEther("0.10")


  before(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const MyToken = await ethers.getContractFactory("MyToken");
    mytoken = await MyToken.deploy();
    await mytoken.deployed();

    const MarketPlace = await ethers.getContractFactory("MarketPlace");
    market = await MarketPlace.deploy();
    await market.deployed();
  });

  describe("Right Sequence", async function () {

    it("Deployment", async function () {
      expect(await mytoken.name()).to.equal("MyToken");
      expect(await market.totalItems()).to.equal(0);
    });

    it("Mint an NFT", async function () {
      await mytoken.safeMint(addr1.address, 'uri1');
      expect(await mytoken.totalSupply()).to.equal(1);
      expect(await mytoken.balanceOf(addr1.address)).to.equal(1)
      expect(await mytoken.ownerOf(0)).to.equal(addr1.address)

      await mytoken.safeMint(addr1.address, 'uri2');
      expect(await mytoken.totalSupply()).to.equal(2);
      expect(await mytoken.balanceOf(addr1.address)).to.equal(2)
      expect(await mytoken.ownerOf(1)).to.equal(addr1.address)
    });

    it("Approve NFT", async function () {
      await mytoken.connect(addr1).setApprovalForAll(market.address, true);
      await mytoken.connect(addr2).setApprovalForAll(market.address, true);
    });

    it("List For Sale", async function () {
      expect(await mytoken.creatorOf(0)).to.equal(addr1.address)
      await mytoken.connect(addr1).setTokenRoyalty(0, owner.address, 500)
      await mytoken.connect(addr1).setTokenRoyalty(1, owner.address, 500)
      await market.connect(addr1).listForSale(0, NFT0_PRICE, mytoken.address, 'http://url1');
      await market.connect(addr1).listForSale(1, NFT1_PRICE, mytoken.address, 'http://url2');
      expect(await market.totalItems()).to.equal(2)
    });

    it("First Buy NFT", async function () {
      const provider = waffle.provider;
      let prevOwnerBalance = await provider.getBalance(owner.address)
      await market.connect(addr2).buyNFT(0, { value: ethers.utils.parseEther("1.0") })
      let laterOwnerBalance = await provider.getBalance(owner.address)
      expect(await market.totalItems()).to.equal(1)
      expect(await mytoken.totalSupply()).to.equal(2);
      expect(await mytoken.balanceOf(addr2.address)).to.equal(1)
      expect(await mytoken.ownerOf(0)).to.equal(addr2.address)

      expect(BigNumber.from(prevOwnerBalance).lt(BigNumber.from(laterOwnerBalance))).to.equal(true)
      expect(BigNumber.from(laterOwnerBalance).eq(BigNumber.from(prevOwnerBalance).add(BigNumber.from(EXPECTED_NFT0_ROYALTY)))).to.equal(true)
    });

    it("Second Buy NFT", async function () {
      const provider = waffle.provider;
      let prevOwnerBalance = await provider.getBalance(owner.address)

      await market.connect(addr2).buyNFT(0, { value: ethers.utils.parseEther("2.0") })

      let laterOwnerBalance = await provider.getBalance(owner.address)
      expect(await market.totalItems()).to.equal(0)
      expect(await mytoken.totalSupply()).to.equal(2);
      expect(await mytoken.balanceOf(addr2.address)).to.equal(2)
      expect(await mytoken.ownerOf(0)).to.equal(addr2.address)

      expect(BigNumber.from(prevOwnerBalance).lt(BigNumber.from(laterOwnerBalance))).to.equal(true)
      // expect(BigNumber.from(laterOwnerBalance).eq(BigNumber.from(prevOwnerBalance).add(BigNumber.from(EXPECTED_NFT0_ROYALTY)))).to.equal(true)
    });


    it("Relist NFT with new royaltyReceiver", async function () {
      await market.connect(addr2).listForSale(0, NFT0_PRICE, mytoken.address, 'http://url1');
      try {
        await mytoken.connect(addr2).setTokenRoyalty(0, owner.address, 500)
      }catch (e) {
        const expectedError = 'Only creator can set token royalty'
        expect(e.message.search(expectedError)).is.at.least(0)
      }
    });


  })

});
