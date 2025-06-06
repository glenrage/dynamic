import { useGame } from '../context/GameContext';
import { GameGrid } from './GameGrid';
import { Keyboard } from './Keyboard';
import { GAME_STATUSES } from '../constants/gameStatus';

const BASE_SEPOLIA_TX_EXPLORER_PREFIX = 'https://sepolia.basescan.org/tx/';

export const MathlerGame = () => {
  const {
    targetNumber,
    guesses,
    currentGuess,
    gameStatus,
    handleKeyPress,
    isLoading,
    error,
    resetGame,
    solutionLength,
    solution,
    keyboardStates,
    bypassPuzzle,
    clearMathlerMetadataForTesting,
    lastNftMint,
  } = useGame();

  const MAX_GUESSES = 6;

  const renderGridRows = () => {
    // If solutionLength is 0, this will create empty rows array or rows with 0 tiles
    if (solutionLength === 0 && gameStatus === GAME_STATUSES.PLAYING) {
      console.warn(
        'MathlerGame: renderGridRows called with solutionLength 0. Grid might be empty.'
      );
    }

    const rows = [];
    guesses.forEach((guessResult) => {
      rows.push(guessResult.result);
    });

    if (gameStatus === GAME_STATUSES.PLAYING && rows.length < MAX_GUESSES) {
      const currentTypingTiles = [];
      const typedChars = currentGuess.split('');
      // Loop up to solutionLength. If solutionLength is 0, this loop doesn't run.
      for (let i = 0; i < solutionLength; i++) {
        if (typedChars[i] !== undefined) {
          currentTypingTiles.push({
            value: typedChars[i],
            state: 'current-typing',
          });
        } else {
          currentTypingTiles.push({ value: '', state: 'empty' });
        }
      }
      if (solutionLength > 0) {
        // Only push if there are actual tiles to show
        rows.push(currentTypingTiles);
      }
    }

    // Loop up to MAX_GUESSES. If solutionLength is 0, this creates rows of 0-length arrays.
    while (rows.length < MAX_GUESSES) {
      if (solutionLength > 0) {
        rows.push(Array(solutionLength).fill({ value: '', state: 'empty' }));
      } else {
        // If solutionLength is 0, perhaps push an empty row placeholder or break
        // For now, let's assume game won't be fully playable if solutionLength is 0
        rows.push([]); // This would render an empty div.game-row
      }
    }
    return rows;
  };

  // This is the first gate
  if (isLoading) {
    return <div className='message-text'>Loading daily puzzle...</div>;
  }

  // Second gate: If not loading, but solutionLength is still 0 (e.g. error in init)
  // and game is supposed to be playing
  if (solutionLength === 0 && gameStatus === GAME_STATUSES.PLAYING && !error) {
    // This case indicates something went wrong in initialization that didn't set an error
    // but also didn't set solutionLength.
    return (
      <div className='message-text'>
        Preparing game board... (Error Code: SL0)
      </div>
    );
  }

  if (error) {
    // Check if it's a critical error where resetting might be appropriate
    if (gameStatus === GAME_STATUSES.ERROR_FETCHING) {
      return (
        <div className='game-container'>
          <h2 className='target-number-display'>Mathler Game</h2>
          <div className='game-error-message'>Critical Error: {error}</div>
          <button onClick={resetGame} className='play-again-button'>
            Try Reloading Puzzle
          </button>
        </div>
      );
    }
  }

  const isBypassButtonDisabled = gameStatus !== GAME_STATUSES.PLAYING;

  return (
    <div className='game-container'>
      <h2 className='target-number-display'>
        Find the calculation that equals{' '}
        <span className='highlight-number'>
          {targetNumber > 0 ? targetNumber : '...'}
        </span>
      </h2>

      {error && gameStatus === GAME_STATUSES.PLAYING && (
        <div
          className='game-error-message'
          style={{ color: 'red', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      <div className='lizard-brain-section'>
        <button
          onClick={bypassPuzzle}
          className='lizard-brain-button'
          disabled={isBypassButtonDisabled || solutionLength === 0}>
          {gameStatus === GAME_STATUSES.PLAYING && solutionLength > 0
            ? 'Lizard Brain Takeover! (Bypass Puzzle)'
            : 'Puzzle Not Ready / Completed'}
        </button>
        {gameStatus === GAME_STATUSES.PLAYING && solutionLength > 0 && (
          <p className='lizard-brain-message'>
            Can't resist? My impulses demand crypto access now!
          </p>
        )}
      </div>

      {solutionLength > 0 && <GameGrid rows={renderGridRows()} />}
      {solutionLength === 0 && gameStatus === GAME_STATUSES.PLAYING && (
        <div className='message-text'>
          Waiting for puzzle data to draw grid...
        </div>
      )}

      {gameStatus !== GAME_STATUSES.PLAYING && (
        <div className='game-over-message'>
          {gameStatus === GAME_STATUSES.WON ? (
            <>
              <p className='game-win-text'>
                Congratulations! You solved it! <br />
              </p>
              {lastNftMint && lastNftMint.txHash && (
                <div className='nft-mint-info'>
                  <p>
                    <strong>First Win NFT Minted!</strong>
                  </p>
                  {lastNftMint.tokenId && lastNftMint.tokenId !== 'N/A' && (
                    <p>Token ID: {lastNftMint.tokenId}</p>
                  )}
                  <p>
                    Transaction Hash: <br />
                    <span className='nft-copy'>{lastNftMint.txHash}</span>
                  </p>
                  <p>
                    <a
                      href={`${BASE_SEPOLIA_TX_EXPLORER_PREFIX}${lastNftMint.txHash}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      style={{ color: 'blue', textDecoration: 'underline' }}>
                      View on Base Sepolia Explorer
                    </a>
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className='game-lost-text'>
              Game Over! {solution && `The solution was: `}
              <span className='highlight-number'>
                {solution || error || 'Please try again.'}
              </span>
            </p>
          )}
          <button onClick={resetGame} className='play-again-button'>
            Play Puzzle Again
          </button>

          <button
            onClick={clearMathlerMetadataForTesting}
            className='play-again-button'>
            Reset User history
          </button>
        </div>
      )}

      {solutionLength > 0 && (
        <Keyboard onKeyPress={handleKeyPress} keyboardStates={keyboardStates} />
      )}
    </div>
  );
};
