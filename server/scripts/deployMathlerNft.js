const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(
    'Deploying MathlerFirstWinNft with the account:',
    deployer.address
  );

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', hre.ethers.formatEther(balance), 'ETH');

  if (balance < hre.ethers.parseEther('0.001')) {
    console.warn(
      'Warning: Deployer account balance might be too low for deployment gas fees.'
    );
  }

  const baseMetadataURI =
    'https://api.jsonbin.io/v3/b/683e34f18960c979a5a481d8';

  const MathlerNftFactory = await hre.ethers.getContractFactory(
    'SimpleMathlerSharedUriNft'
  );
  console.log('Deploying SimpleMathlerSharedUriNft...');
  const mathlerNft = await MathlerNftFactory.deploy(
    deployer.address,
    baseMetadataURI
  );

  await mathlerNft.waitForDeployment();
  const contractAddress = await mathlerNft.getAddress();
  console.log('SimpleMathlerSharedUriNft deployed to:', contractAddress);
  console.log('Constructor arguments (for verification):');
  console.log('  Initial Owner:', deployer.address);
  console.log('  Base URI:', baseMetadataURI);

  console.log('\nTo verify on Basescan (Sepolia), run:');
  console.log(
    `npx hardhat verify --network base_sepolia ${contractAddress} "${deployer.address}" "${baseMetadataURI}"`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
