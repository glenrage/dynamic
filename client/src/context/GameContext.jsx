import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  useUserUpdateRequest,
  useDynamicContext,
} from '@dynamic-labs/sdk-react-core';
import { evaluateExpression } from '../lib/gameLogic';

const GameContext = createContext(undefined);
const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL;

export const GameProvider = ({ children }) => {
  const [currentPuzzleId, setCurrentPuzzleId] = useState(null);
  const [targetNumber, setTargetNumber] = useState(0);
  const [solutionLength, setSolutionLength] = useState(0);
  const [solutionRevealed, setSolutionRevealed] = useState('');

  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState('playing'); // 'playing', 'won', 'lost', 'error_fetching'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyboardStates, setKeyboardStates] = useState({});

  const { user, primaryWallet } = useDynamicContext();
  const { updateUser } = useUserUpdateRequest();

  const MAX_GUESSES = 6;

  const persistGameOutcome = useCallback(
    async (isWin) => {
      if (!updateUser || !user) {
        console.warn(
          'GameContext: updateUser or user not available for metadata update.'
        );
        return;
      }
      const currentSdkUserMetadata = user.metadata || {};
      let newTotalWins = currentSdkUserMetadata.totalWins || 0;
      let newHasEverSolved =
        currentSdkUserMetadata.hasEverSolvedAMathler || false;
      if (isWin) {
        newTotalWins += 1;
        newHasEverSolved = true;
      }
      const metadataPayload = {
        ...currentSdkUserMetadata,
        hasEverSolvedAMathler: newHasEverSolved,
        totalWins: newTotalWins,
      };
      console.log(
        `GameContext: Attempting to update metadata. Win: ${isWin}, UserID: ${user.userId}`
      );
      console.log('GameContext: Payload for updateUser:', {
        metadata: metadataPayload,
      });
      try {
        const result = await updateUser({ metadata: metadataPayload });
        console.log(
          'GameContext: Metadata update API call SUCCESS. Response:',
          result
        );
        if (result?.updateUserProfileResponse?.user) {
          console.log(
            'Updated user from API response:',
            result.updateUserProfileResponse.user
          );
        }
      } catch (e) {
        console.error('GameContext: Error calling updateUser:', e);
      }
    },
    [updateUser, user]
  );
  const clearMathlerMetadataForTesting = useCallback(async () => {
    if (!updateUser || !user) {
      console.warn(
        'GameContext: updateUser or user not available to clear metadata.'
      );
      alert(
        'User not ready to clear metadata. Please ensure you are logged in.'
      );
      return;
    }

    const currentSdkUserMetadata = user.metadata || {};

    // Create a new metadata object, explicitly setting game-specific keys to default/cleared values
    // while preserving any other unrelated metadata.
    const clearedMetadataPayload = {
      ...currentSdkUserMetadata,
      hasEverSolvedAMathler: false,
      totalWins: 0,
    };

    console.log('GameContext: Attempting to CLEAR Mathler metadata.');
    console.log('GameContext: Payload for clearing metadata:', {
      metadata: clearedMetadataPayload,
    });

    try {
      const result = await updateUser({ metadata: clearedMetadataPayload });
      console.log(
        'GameContext: Metadata CLEAR API call SUCCESS. Response:',
        result
      );
      alert(
        'Mathler game metadata (hasEverSolvedAMathler, totalWins) has been reset for testing. You might need to refresh the page or re-login to see UI changes reflect immediately if SDK auto-refresh is delayed.'
      );
    } catch (e) {
      console.error('GameContext: Error clearing Mathler metadata:', e);
      alert(`Error clearing metadata: ${e.message}`);
    }
  }, [updateUser, user]);

  const startNewPuzzle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSolutionRevealed('');
    try {
      const response = await fetch(`${API_BASE_URL}/puzzle/new`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to fetch puzzle: ${response.statusText} - ${
            errData.message || ''
          }`
        );
      }
      const puzzleData = await response.json();

      setCurrentPuzzleId(puzzleData.puzzleId);
      setTargetNumber(puzzleData.targetNumber);
      setSolutionLength(puzzleData.solutionLength);
      setGuesses([]);
      setCurrentGuess('');
      setGameStatus('playing');
      setKeyboardStates({});
    } catch (fetchError) {
      console.error('Error fetching new puzzle:', fetchError);
      setError(`Could not load new puzzle: ${fetchError.message}`);
      setGameStatus('error_fetching');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (primaryWallet && user && updateUser) {
      if (isLoading && !currentPuzzleId) {
        startNewPuzzle();
      } else if (
        !isLoading &&
        !currentPuzzleId &&
        gameStatus !== 'error_fetching'
      ) {
        startNewPuzzle();
      }
    } else {
      setIsLoading(true);
      setCurrentPuzzleId(null);
      setGuesses([]);
      setCurrentGuess('');
      setGameStatus('playing');
      setTargetNumber(0);
      setSolutionLength(0);
      setKeyboardStates({});
      setError(null);
    }
  }, [
    primaryWallet,
    user,
    updateUser,
    isLoading,
    currentPuzzleId,
    startNewPuzzle,
    gameStatus,
  ]);

  useEffect(() => {
    const newKeyboardStates = {};
    guesses.forEach((guessResult) => {
      if (guessResult && Array.isArray(guessResult.result)) {
        guessResult.result.forEach((charData) => {
          const char = charData.value;
          const state = charData.state;
          if (
            !newKeyboardStates[char] ||
            newKeyboardStates[char] === 'absent' ||
            (newKeyboardStates[char] === 'present' && state === 'correct')
          ) {
            newKeyboardStates[char] = state;
          }
        });
      }
    });
    setKeyboardStates(newKeyboardStates);
  }, [guesses]);

  const handleKeyPress = useCallback(
    async (key) => {
      if (
        isLoading ||
        gameStatus !== 'playing' ||
        !currentPuzzleId ||
        solutionLength === 0
      )
        return;

      if (key === 'ENTER') {
        const submittedGuess = currentGuess;
        if (submittedGuess.length !== solutionLength) {
          setError(
            `Equation must be exactly ${solutionLength} characters long.`
          );
          return;
        }

        const localEval = evaluateExpression(submittedGuess);
        if (localEval === null) {
          setError(`Invalid mathematical expression format.`);
          return;
        }

        setError(null);

        setIsLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/puzzle/submit-guess`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              puzzleId: currentPuzzleId,
              guessString: submittedGuess,
            }),
          });

          const serverResult = await response.json();

          if (!response.ok) {
            throw new Error(
              serverResult.message || `Server error: ${response.statusText}`
            );
          }

          // serverResult: { guess, matchesTarget, evaluatedValue, tileColors, gameStatus, solution?, error? }
          if (serverResult.error && serverResult.gameStatus === 'playing') {
            // Non-critical error from server (e.g. wrong value)
            setError(serverResult.error);
          } else {
            setError(null);
          }

          const newGuessResult = {
            guess: submittedGuess,
            result: serverResult.tileColors.map((state, index) => ({
              value: submittedGuess[index],
              state: state,
            })),
          };

          const updatedGuesses = [...guesses, newGuessResult];
          setGuesses(updatedGuesses);
          setCurrentGuess('');
          setGameStatus(serverResult.gameStatus);

          if (serverResult.solution) {
            // If server sent back solution (on win/loss)
            setSolutionRevealed(serverResult.solution);
          }

          if (
            serverResult.gameStatus === 'won' ||
            serverResult.gameStatus === 'lost' ||
            (serverResult.gameStatus === 'playing' &&
              updatedGuesses.length >= MAX_GUESSES)
          ) {
            let finalStatus = serverResult.gameStatus;
            if (
              serverResult.gameStatus === 'playing' &&
              updatedGuesses.length >= MAX_GUESSES
            ) {
              finalStatus = 'lost';
              setGameStatus('lost'); // Update local status
              // Fetch solution if lost and server didn't send it (or re-request with a 'reveal' flag)
              // For now, assume server sends solution if it sets status to lost/won.
              // If serverResult.solution is not available for 'lost', you might need another call or logic.
              if (!serverResult.solution) {
                // This part is tricky. If server doesn't send solution on max guesses loss,
                // you might need to make another call or the client just knows it's lost.
                // For now, assume `solutionRevealed` is set if `serverResult.solution` was present.
              }
            }
            await persistGameOutcome(finalStatus === 'won');
          }
        } catch (submitError) {
          console.error('Error submitting guess:', submitError);
          setError(`Failed to submit guess: ${submitError.message}`);
        } finally {
          setIsLoading(false);
        }
      } else if (key === 'BACKSPACE') {
        setCurrentGuess((prev) => prev.slice(0, -1));
        setError(null);
      } else if (
        currentGuess.length < solutionLength &&
        '0123456789+-*/'.includes(key)
      ) {
        setCurrentGuess((prev) => prev + key);
        setError(null);
      }
    },
    [
      guesses,
      currentGuess,
      gameStatus,
      isLoading,
      currentPuzzleId,
      solutionLength,
      persistGameOutcome,
      setError,
      setGuesses,
      setCurrentGuess,
      setGameStatus,
      setIsLoading,
      setSolutionRevealed,
    ]
  );

  const bypassPuzzle = useCallback(async () => {
    if (
      isLoading ||
      gameStatus !== 'playing' ||
      !currentPuzzleId ||
      solutionLength === 0
    )
      return;
    setError(null);
    setIsLoading(true);
    try {
      // To truly bypass with server validation, we'd need an endpoint that accepts a bypass command
      // or we fetch the solution first, then submit it.
      // For simplicity, let's assume the bypass button on client directly calls persistGameOutcome
      // and sets local state to 'won'. Client reveals a known solution if needed.
      // This is less secure but simpler than adding a server bypass endpoint for this example.

      // Fetch the solution from an endpoint IF NEEDED FOR DISPLAY.
      // For now, let's just simulate the win and persist.
      // The server *should* have the solution if we were to query by puzzleId.
      // For demo, we can just make up the display if needed locally or fetch separately.
      // This `solutionRevealed` would ideally come from server upon win.
      // Since this is a client-side "bypass", we don't have the server's solution string easily
      // unless we made another call or the initial /puzzle/new sent it (which we stopped).

      // Let's assume the bypass implies we know the solution or don't need to display it via this path.
      // Or, for a true bypass that interacts with server:
      // 1. Fetch solution for currentPuzzleId (new endpoint needed: GET /api/puzzle/:puzzleId/solution)
      // 2. Then call POST /api/puzzle/submit-guess with that solution.

      // Simpler client-side bypass for now:
      setGameStatus('won');
      setCurrentGuess('');
      // We don't have the solution string locally anymore.
      // So, the MathlerGame component will need to handle displaying a generic win
      // or fetch the solution if it needs to show it.
      // For now, just mark as won.
      const dummySolvedGuess = {
        guess: 'BYPASS', // Placeholder
        result: Array(solutionLength).fill({ value: '✓', state: 'correct' }),
      };
      setGuesses([dummySolvedGuess]);

      await persistGameOutcome(true);
    } catch (e) {
      setError('Bypass failed.');
    } finally {
      setIsLoading(false);
    }
  }, [
    gameStatus,
    isLoading,
    currentPuzzleId,
    solutionLength,
    persistGameOutcome,
    setError,
    setGameStatus,
    setCurrentGuess,
    setGuesses,
    setIsLoading,
  ]);

  const resetGame = useCallback(() => {
    setCurrentPuzzleId(null);
    setIsLoading(true);
  }, [setCurrentPuzzleId, setIsLoading]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toUpperCase();
      if (
        key === 'ENTER' ||
        key === 'BACKSPACE' ||
        '0123456789+-*/'.includes(event.key)
      ) {
        event.preventDefault();
        handleKeyPress(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress]);

  return (
    <GameContext.Provider
      value={{
        targetNumber,
        guesses,
        currentGuess,
        gameStatus,
        handleKeyPress,
        isLoading,
        error,
        resetGame,
        solutionLength,
        solution: solutionRevealed, // Provide the revealed solution for UI
        keyboardStates,
        bypassPuzzle,
        clearMathlerMetadataForTesting,
      }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined)
    throw new Error('useGame must be used within a GameProvider');
  return context;
};
