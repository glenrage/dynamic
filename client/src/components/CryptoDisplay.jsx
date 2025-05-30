import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

export const CryptoDisplay = () => {
  const { user, primaryWallet, setShowAuthFlow } = useDynamicContext();

  const walletAddress = primaryWallet?.address;
  const username = user?.username || user?.email || 'User';

  const handleUnlockFunds = () => {
    // This will open the Dynamic wallet modal
    setShowAuthFlow(true);
  };

  return (
    <div className='crypto-display-card'>
      <h3>Welcome, {username}!</h3>
      {walletAddress && (
        <p>
          Your connected wallet: <br />
          <code>
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </code>
        </p>
      )}

      <div className='crypto-info'>
        <p>
          By solving Mathler, you've trained your prefrontal cortex! Now, make
          your crypto decisions with clarity.
        </p>
        {/* The "Unlock Funds" button */}
        <button className='unlock-funds-button' onClick={handleUnlockFunds}>
          Unlock Your Funds (View Wallet)
        </button>
      </div>

      {/* You could add more crypto-related elements here later */}
      {/* For example, a simple placeholder for balance */}
      <div className='wallet-balance-placeholder'>
        <p>Current Balance: Loading...</p>
        <p>Your mindful decisions await!</p>
      </div>
    </div>
  );
};
