require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config({ path: './.env.hardhat' });

const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
const accountsToUse = deployerPrivateKey ? [deployerPrivateKey] : [];

module.exports = {
  solidity: '0.8.20',
  networks: {
    base_sepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
      accounts: accountsToUse,
      chainId: 84532,
      gasPrice: 'auto',
    },
    hardhat: {
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || '',
    },
  },
};
