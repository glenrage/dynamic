const { ethers } = require('ethers');

const RPC_URL = process.env.RPC_URL;
const MINTER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY;
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;

const NFT_ABI = [
  'constructor(address initialOwner, string memory baseURI)',
  'event AchievementNftMinted(address indexed recipient, uint256 indexed tokenId)',
  'function mintAchievement(address recipient) public returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function owner() view returns (address)',
  'function setBaseTokenURI(string memory newBaseURI) public',
];

let provider;
let minterWallet;
let nftContract;

if (RPC_URL && MINTER_PRIVATE_KEY && NFT_CONTRACT_ADDRESS) {
  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    minterWallet = new ethers.Wallet(MINTER_PRIVATE_KEY, provider);
    nftContract = new ethers.Contract(
      NFT_CONTRACT_ADDRESS,
      NFT_ABI,
      minterWallet
    );
    console.log(
      'NFT Service: Initialized for SimpleMathlerSharedUriNft. Minter:',
      minterWallet.address
    );
  } catch (e) {
    console.error('NFT Service: Failed to initialize ethers objects.', e);
  }
} else {
  console.warn(
    'NFT Service: Missing RPC_URL, MINTER_PRIVATE_KEY, or NFT_CONTRACT_ADDRESS. NFT minting disabled.'
  );
}

const mintFirstWinNft = async (userWalletAddress, userId) => {
  if (!nftContract || !minterWallet) {
    throw new Error('NFT Service is not properly initialized.');
  }

  try {
    console.log(
      `NFT Service: Attempting to mint 'First Win NFT' to ${userWalletAddress} (User ID: ${userId})`
    );
    // The SimpleMathlerSharedUriNft contract's mintAchievement function only needs the recipient address.
    const tx = await nftContract.mintAchievement(userWalletAddress, {});

    console.log(`NFT Service: Mint transaction sent: ${tx.hash}`);
    const receipt = await tx.wait(1); // Wait for 1 confirmation
    console.log(`NFT Service: Mint transaction confirmed: ${tx.hash}`);

    let mintedTokenId = null;
    if (receipt.logs) {
      const iface = new ethers.Interface(NFT_ABI);
      for (const log of receipt.logs) {
        try {
          const parsedLog = iface.parseLog(log);
          if (parsedLog && parsedLog.name === 'AchievementNftMinted') {
            mintedTokenId = parsedLog.args.tokenId.toString();
            console.log(
              `NFT Service: Successfully minted Token ID: ${mintedTokenId} to ${parsedLog.args.recipient}`
            );
            break;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    return { success: true, transactionHash: tx.hash, tokenId: mintedTokenId };
  } catch (error) {
    console.error(
      'NFT Service: Error during mintAchievement transaction:',
      error
    );
    let message = `NFT minting failed: ${error.message}`;

    if (error.reason) message = `NFT minting failed: ${error.reason}`;
    else if (error.data?.message)
      message = `NFT minting failed: ${error.data.message}`;
    else if (
      error.message &&
      error.message.includes('Achievement already awarded')
    )
      message =
        'First Win NFT already awarded to this address (on-chain check).';

    throw new Error(message);
  }
};

module.exports = { mintFirstWinNft };
