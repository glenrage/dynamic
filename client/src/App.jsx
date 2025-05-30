import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { GameProvider } from './context/GameContext';
import { MathlerGame } from './components/MathlerGame';
import { CryptoDisplay } from './components/CryptoDisplay';

function App() {
  const { primaryWallet, user, setShowAuthFlow } = useDynamicContext();
  const hasSolvedMathler = user?.metadata?.hasSolvedMathler || false;

  console.log({ user });
  return (
    <div className='app-container'>
      <h1 className='title'>Mathler</h1>

      <div className='blurb-section'>
        <h2>Unlock Your Prefrontal Cortex, Block Impulse Buys!</h2>
        <p>
          Our brains are wired for immediate gratification. The emotional limbic
          system often overrides the rational prefrontal cortex, leading to
          impulse decisions – including in crypto!
        </p>
        <p>
          Solving Mathler puzzles rigorously activates your prefrontal cortex,
          enhancing advanced reasoning and self-control. Train your brain to
          think logically before acting emotionally.
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
            onClick={() => setShowAuthFlow(true)}
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
              <h2 className='crypto-heading'>Crypto Features Unlocked!</h2>
              <CryptoDisplay />
            </div>
          )}
        </GameProvider>
      )}

      <CryptoDisplay />

      <footer className='message-text' style={{ marginTop: '3rem' }}>
        Built for Dynamic Labs Take Home Assignment
      </footer>
    </div>
  );
}

export default App;
