import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { GameProvider } from './context/GameContext';
import { MathlerGame } from './components/MathlerGame';
import { DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { RealTimeBtcPrice } from './components/RealTimeBtcPrice';

function App() {
  const { primaryWallet, user, setShowAuthFlow } = useDynamicContext();
  const hasSolvedMathler = user?.metadata?.hasEverSolvedAMathler || false;

  console.log({ user });

  const handleWalletButtonClick = () => {
    if (hasSolvedMathler) {
      setShowAuthFlow(true);
    }
  };

  return (
    <div className='app-container'>
      <h1 className='title'>Mathler</h1>

      <div className='blurb-section'>
        <h2>Unlock Your Prefrontal Cortex, Block Impulse Buys and scams!</h2>
        <p>
          Our brains are wired for immediate gratification. The emotional limbic
          system often overrides the rational prefrontal cortex, leading to
          impulse decisions, including in crypto!
        </p>
        <p>
          Solving Mathler puzzles rigorously activates your prefrontal cortex,
          enhancing advanced reasoning and self-control. Train your brain to
          think logically before acting emotionally. That unknown text message
          asking you to invest in her crypto platform with guaranteed 30% daily
          returns? Probably a scam.
        </p>
        <p>
          <strong>
            Complete today's Mathler puzzle to unlock your crypto wallet and
            make mindful financial decisions!
          </strong>
        </p>
      </div>

      <div className='login-button-container'>
        {primaryWallet ? (
          <button
            onClick={handleWalletButtonClick}
            className='login-button connected-button'>
            Connected: {primaryWallet.address.slice(0, 6)}...
          </button>
        ) : (
          <button
            onClick={() => setShowAuthFlow(true)}
            className='login-button'>
            Login / Connect Wallet
          </button>
        )}
      </div>

      {!primaryWallet && (
        <div className='message-text'>
          Please login or connect your wallet to play Mathler and unlock crypto
          features.
        </div>
      )}

      {primaryWallet && (
        <GameProvider>
          <MathlerGame />
          {hasSolvedMathler && (
            <div className='crypto-dashboard-container'>
              <h2 className='crypto-heading'>Wallet Unlocked!</h2>
              <DynamicWidget />
              <RealTimeBtcPrice />
            </div>
          )}
        </GameProvider>
      )}
    </div>
  );
}

export default App;
