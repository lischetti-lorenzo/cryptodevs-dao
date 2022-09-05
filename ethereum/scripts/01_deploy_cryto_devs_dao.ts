import {ethers} from "hardhat";
import {CRYPTO_DEVS_NFT_CONTRACT_ADDRESS} from '../constants';

async function main() {
  const FakeNFTMarketplace = await ethers.getContractFactory('FakeNFTMarketplace');
  const deployedFakeNFTMarketplace = await FakeNFTMarketplace.deploy();
  await deployedFakeNFTMarketplace.deployed();

  console.log("FakeNFTMarketplace deployed to: ", deployedFakeNFTMarketplace.address);

  const CryptoDevsDAO = await ethers.getContractFactory('CryptoDevDAO');
  const deployedCryptoDevsDAO = await CryptoDevsDAO.deploy(
    deployedFakeNFTMarketplace.address,
    CRYPTO_DEVS_NFT_CONTRACT_ADDRESS,
    {
      value: ethers.utils.parseEther('1')
    }
  );
  await deployedCryptoDevsDAO.deployed();

  console.log(`CryptoDevsDAO deployed to: ${deployedCryptoDevsDAO.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
