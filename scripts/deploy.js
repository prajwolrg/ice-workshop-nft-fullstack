const hre = require("hardhat");
const fs = require('fs');

async function main() {
  [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
  console.log(`Deployed with ${owner.address}`)

  console.log(hre.network.name)

  const MyToken = await ethers.getContractFactory("MyToken");
  let mytoken = await MyToken.deploy();
  await mytoken.deployed();
  console.log(`Deployed NFT at ${mytoken.address}`)

  const MarketPlace = await ethers.getContractFactory("MarketPlace");
  let market = await MarketPlace.deploy();
  await market.deployed();
  console.log(`Deployed MarketPlace at ${market.address}`)

  fs.writeFileSync('./config.js', `export const NFTAddress = "${mytoken.address}"
  export const MarketPlaceAddress = "${market.address}"
  `)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

