import {Contract, providers} from 'ethers';
import {formatEther} from 'ethers/lib/utils';
import Head from 'next/head';
import Image from 'next/image';
import {useEffect, useRef, useState} from 'react';
import styles from '../styles/Home.module.css';
import Web3Modal from 'web3modal';
import {
  CRYPTODEVS_DAO_ABI,
  CRYPTODEVS_DAO_CONTRACT_ADDRESS,
  CRYPTODEVS_NFT_ABI,
  CRYPTODEVS_NFT_CONTRACT_ADDRESS
} from '../constants';

const VOTE = {
  Yes: 'YES',
  No: 'NO'
}

const TABS = {
  CREATE_PROPOSAL: 'Create Proposal',
  VIEW_PROPOSALS: 'View Proposals'
}

export default function Home() {
  const [treasuryBalance, setTreasuryBalance] = useState('0');
  const [numProposals, setNumProposals] = useState('0');
  const [proposals, setProposals] = useState([]);
  const [nftBalance, setNftBalance] = useState('0');
  const [fakeNftTokenId, setFakeNftTokenId] = useState('');
  const [selectedTab, setSelectedTab] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const web3ModalRef = useRef();

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: 'rinkeby',
        providerOptions: {},
        disableInjectedProvider: false
      });

      connectWallet().then(() => {
        getDAOTreasuryBalance();
        getUserNFTBalance();
        getNumProposals();
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletConnected]);

  useEffect(() => {
    if (selectedTab === TABS.VIEW_PROPOSALS) {
      fetchAllProposals();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab]);

  const getProviderOrSigner = async (needSigner = false) => {
    try {
      const provider = await web3ModalRef.current.connect();
      const web3Provider = new providers.Web3Provider(provider);

      const {chainId} = await web3Provider.getNetwork();
      if (chainId !== 4) {
        window.alert("Change the network to Rinkeby");
        throw new Error("Change network to Rinkeby");
      }

      if (needSigner) {
        const signer = web3Provider.getSigner();
        return signer;
      }

      return web3Provider;
    } catch (error) {
      console.error(error);
    }
  };

  const getDaoContractInstance = (providerOrSigner) => {
    return new Contract(
      CRYPTODEVS_DAO_CONTRACT_ADDRESS,
      CRYPTODEVS_DAO_ABI,
      providerOrSigner
    );
  };

  const getNFTContractInstance = (providerOrSigner) => {
    return new Contract(
      CRYPTODEVS_NFT_CONTRACT_ADDRESS,
      CRYPTODEVS_NFT_ABI,
      providerOrSigner
    );
  };

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.error(error);
    }
  };

  const getDAOTreasuryBalance = async () => {
    try {
      const provider = await getProviderOrSigner();
      const balance = await provider.getBalance(CRYPTODEVS_DAO_CONTRACT_ADDRESS);
      setTreasuryBalance(balance.toString());
    } catch (error) {
      console.error(error);
    }
  };

  const getNumProposals = async () => {
    try {
      const provider = await getProviderOrSigner();
      const daoContract = getDaoContractInstance(provider);
      const daoNumProposals = await daoContract.numProposals();
      setNumProposals(daoNumProposals.toString());
    } catch (error) {
      console.error(error);
    }
  };

  const getUserNFTBalance = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = getNFTContractInstance(signer);
      const balance = await nftContract.balanceOf(signer.getAddress());
      setNftBalance(balance.toString());
    } catch (error) {
      console.error(error);
    }
  };

  const createProposal = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const tx = await daoContract.createProposal(fakeNftTokenId);
      setLoading(true);
      await tx.wait();
      await getNumProposals();
      setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProposalById = async (proposalId) => {
    try {
      const provider = await getProviderOrSigner();
      const daoContract = getDaoContractInstance(provider);
      const proposal = await daoContract.proposals(proposalId);
      const parsedProposal = {
        proposalId,
        nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
        positiveVotes: proposal.positiveVotes.toString(),
        negativeVotes: proposal.negativeVotes.toString(),
        executed: proposal.executed
      };
      return parsedProposal;
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAllProposals = async () => {
    try {
      const proposals = [];
      for (let i = 0; i < numProposals; i++) {
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }
      setProposals(proposals);
      return proposals;
    } catch (error) {
      console.error(error);
    }
  };
  
  const voteProposal = async (proposalId, _vote) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);

      let vote = _vote === VOTE.Yes ? 0 : 1;
      const tx = await daoContract.voteProposal(proposalId, vote);
      setLoading(true);
      await tx.wait();
      setLoading(false);
      await fetchAllProposals();
    } catch (error) {
      console.error(error);
      window.alert(error.data.message);
    }
  };

  const executeProposal = async (proposalId) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const tx = await daoContract.executeProposal(proposalId);
      setLoading(true);
      await tx.wait();
      setLoading(false);
      await fetchAllProposals();
    } catch (error) {
      console.error(error);
      window.alert(error.data.message);
    }
  };

  function renderLoadingSection() {
    return (
      <div className={styles.description}>
        Loading... Waiting for transaction...
      </div>
    );
  }

  function renderTabs() {
    if (selectedTab === TABS.CREATE_PROPOSAL) {
      return renderCreateProposalTab();
    } else if (selectedTab === TABS.VIEW_PROPOSALS) {
      return renderViewProposalsTab();
    } else {
      return null;
    }
  }

  function renderCreateProposalTab() {
    if (loading) {
      return renderLoadingSection();
    } else if (nftBalance === 0) {
      return (
        <div className={styles.description}>
          You do not own any CryptoDevs NFTs. <br />
          <b>You cannot create or vote on proposals</b>
        </div>
      );
    } else {
      return (
        <div className={styles.container}>
          <label>Fake NFT Token ID to Purchase: </label>
          <input
            placeholder="0"
            type="number"
            onChange={e => setFakeNftTokenId(e.target.value)}
          />
          <button className={styles.button2} onClick={createProposal}>
            Create
          </button>
        </div>
      );
    }
  }

  function renderViewProposalsTab() {
    if (loading) {
      return renderLoadingSection();
    } else if (proposals.length === 0) {
      return (
        <div className={styles.description}>
          No proposals have been created.
        </div>
      );
    } else {
      return (
        <div>
          {proposals.map((p, index) => (
            <div key={index} className={styles.proposalCard}>
              <p>Proposal ID: {p.proposalId}</p>
              <p>Fake NFT to Purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Positive Votes: {p.positiveVotes}</p>
              <p>Negative Votes: {p.negativeVotes}</p>
              <p>Executed?: {p.executed}</p>
              {p.deadline.getTime() > Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={() => voteProposal(p.proposalId, VOTE.Yes)}
                  >
                    Vote YES
                  </button>

                  <button
                    className={styles.button2}
                    onClick={() => voteProposal(p.proposalId, VOTE.No)}
                  >
                    Vote NO
                  </button>
                </div>
              ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={() => executeProposal(p.proposalId)}
                  >
                    Execute Proposal{' '}
                    {p.positiveVotes > p.negativeVotes ? `(${VOTE.Yes})` : `(${VOTE.No})`}
                  </button>
                </div>
              ) : (
                <div className={styles.description}>Proposal Executed</div>
              )}
            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <div>
      <Head>
        <title>CryptoDevs DAO</title>
        <meta name="description" content="CryptoDevs DAO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcom to Crypto Devs!</h1>
          <div className={styles.description}>Welcome to the DAO!</div>
          <div className={styles.description}>
            Your CryptoDevs NFT Balance: {nftBalance}
            <br />
            Treasury Balance: {formatEther(treasuryBalance)} ETH
            <br />
            Total Number of Proposals: {numProposals}
          </div>
          <div className={styles.flex}>
            <button
              className={styles.button}
              onClick={() => setSelectedTab(TABS.CREATE_PROPOSAL)}
            >
              {TABS.CREATE_PROPOSAL}
            </button>
            <button
              className={styles.button}
              onClick={() => setSelectedTab(TABS.VIEW_PROPOSALS)}
            >
              {TABS.VIEW_PROPOSALS}
            </button>
          </div>
          {renderTabs()}
        </div>
        <div>
        <Image 
            width="500"
            height="500"
            src="/cryptodevs/0.svg"
            alt="crypto devs logo"
          />
        </div>
      </div>

      <footer className={styles.footer}>
        Made by 0x736d3dABA2810df11729CB51a4fa938749F9a457
      </footer>
    </div>
  );
}
