// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// This is just a fake nft marketplace that exposes some basic functions
// that we will be using from the DAO contract to purchase NFTs if a proposal is passed.
contract FakeNFTMarketplace {
  mapping(uint256 => address) public nfts;
  uint256 nftPrice = 0.1 ether;

  function purchase(uint256 _nftId) external payable {
    require(msg.value == nftPrice, "This NFT costs 0.1 ether");
    nfts[_nftId] = msg.sender;
  }

  function getPrice() external view returns (uint256) {
    return nftPrice;
  }

  function available(uint256 _nftId) external view returns (bool) {
    if (nfts[_nftId] == address(0)) {
      return true;
    }
    return false;
  }
}