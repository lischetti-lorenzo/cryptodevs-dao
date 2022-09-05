// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IFakeNFTMarketplace {
  function purchase(uint256 _nftId) external payable;

  function getPrice() external view returns (uint256);

  function available(uint256 _nftId) external view returns (bool);
}

interface ICryptoDevsNFT {
  function balanceOf(address owner) external view returns (uint256);

  function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
}

contract CryptoDevDAO is Ownable {
  enum Vote {
    Yes,
    No
  }

  struct Proposal {
    uint256 nftTokenId;
    uint256 deadline;
    uint256 positiveVotes;
    uint256 negativeVotes;
    bool executed;
    mapping(uint256 => bool) voters;
  }

  mapping(uint256 => Proposal) public proposals;
  uint256 public numProposals;

  IFakeNFTMarketplace fakeNftMarketplace;
  ICryptoDevsNFT cryptoDevsNFT;

  constructor(address _fakeNftMarketplace, address _cryptoDevsNFT) payable {
    fakeNftMarketplace = IFakeNFTMarketplace(_fakeNftMarketplace);
    cryptoDevsNFT = ICryptoDevsNFT(_cryptoDevsNFT);
  }

  modifier nftHolderOnly () {
    require(cryptoDevsNFT.balanceOf(msg.sender) > 0, "NOT_DAO_MEMBER");
    _;
  }

  modifier activeProposalOnly(uint256 proposalIndex) {
    require(
      proposals[proposalIndex].deadline > block.timestamp,
      "DEADLINE_EXCEEDED"
    );
    _;
  }

  modifier inactiveProposalOnly(uint256 proposalIndex) {
    require(
      proposals[proposalIndex].deadline < block.timestamp,
      "DEADLINE_NOT_EXCEEDED"
    );

    require(
      !proposals[proposalIndex].executed,
      "PROPOSAL_ALREADY_EXECUTED"
    );

    _;
  }

  function createProposal(uint256 _nftTokenId) external nftHolderOnly returns (uint256) {
    require(fakeNftMarketplace.available(_nftTokenId), "NFT_NOT_FOR_SALE");
    Proposal storage proposal = proposals[numProposals];
    proposal.nftTokenId = _nftTokenId;
    proposal.deadline = block.timestamp + 10 minutes;
    numProposals++;
    return numProposals - 1;
  }

  function voteProposal(uint256 proposalIndex, Vote vote)
    external
    nftHolderOnly
    activeProposalOnly(proposalIndex)
  {
    Proposal storage proposal = proposals[proposalIndex];

    uint256 voterNFTBalance = cryptoDevsNFT.balanceOf(msg.sender);
    uint256 numVotes = 0;

    for (uint256 i = 0; i < voterNFTBalance; i++) {
      uint256 nftTokenId = cryptoDevsNFT.tokenOfOwnerByIndex(msg.sender, i);
      if (!proposal.voters[nftTokenId]) {
        numVotes++;
        proposal.voters[nftTokenId] = true;
      }
    }

    require(numVotes > 0, "ALREADY_VOTED");

    if (vote == Vote.Yes) {
      proposal.positiveVotes = numVotes;
    } else {
      proposal.negativeVotes = numVotes;
    }
  }

  function executeProposal(uint256 proposalIndex)
    external
    nftHolderOnly
    inactiveProposalOnly(proposalIndex)
  {
    Proposal storage proposal = proposals[proposalIndex];
    if (proposal.positiveVotes > proposal.negativeVotes) {
      uint256 nftPrice = fakeNftMarketplace.getPrice();
      require(address(this).balance >= nftPrice, "NOT_ENOUGH_FUNDS");
      fakeNftMarketplace.purchase{value: nftPrice}(proposal.nftTokenId);
    }

    proposal.executed = true;
  }

  function withdrawAll() external onlyOwner {
    address _owner = owner();
    uint256 amount = address(this).balance;
    (bool sent, ) = _owner.call{value: amount}('');
    require(sent, 'Failed to send Ether');
  }

  receive() external payable {}
  fallback() external payable {}
}