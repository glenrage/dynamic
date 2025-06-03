import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { evaluateExpression } from '../lib/gameLogic';
import { fetchNewPuzzle, submitUserGuess } from '../services/api';
import { useUserGameData } from '../hooks/useUserGameData';
import { GAME_STATUSES } from '../constants/gameStatus';

const GameContext = createContext(undefined);

const MAX_GUESSES = 6;
const VALID_INPUT_CHARS = '0123456789+-*/';

export const GameProvider = ({ children }) => {
  const [currentPuzzleId, setCurrentPuzzleId] = useState(null);
  const [targetNumber, setTargetNumber] = useState(0);
  const [solutionLength, setSolutionLength] = useState(0);
  const [solutionRevealed, setSolutionRevealed] = useState('');

  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState(GAME_STATUSES.LOADING);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyboardStates, setKeyboardStates] = useState({});

  const { primaryWallet, showAuthFlow } = useDynamicContext();
  const { persistGameOutcome, clearMathlerMetadataForTesting, isDynamicReady } =
    useUserGameData();

  const startNewGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSolutionRevealed('');
    setGuesses([]);
    setCurrentGuess('');
    setKeyboardStates({});
    try {
      const puzzleData = await fetchNewPuzzle();
      if (!puzzleData || !puzzleData.puzzleId) {
        // Added check for puzzleData itself
        throw new Error('Puzzle data missing or invalid.');
      }
      setCurrentPuzzleId(puzzleData.puzzleId);
      setTargetNumber(puzzleData.targetNumber);
      setSolutionLength(puzzleData.solutionLength);
      setGameStatus(GAME_STATUSES.PLAYING);
    } catch (fetchError) {
      console.error('Error starting new game:', fetchError);
      setError(`Could not load new puzzle: ${fetchError.message}`);
      setGameStatus(GAME_STATUSES.ERROR_FETCHING);
      setSolutionLength(0); // Ensure solutionLength is reset on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect for initializing or resetting the game based on auth/puzzle state
  useEffect(() => {
    if (primaryWallet && isDynamicReady) {
      // If ready to play, but no puzzle is loaded and not in an error state from fetching
      if (
        !currentPuzzleId &&
        gameStatus !== GAME_STATUSES.ERROR_FETCHING &&
        !isLoading
      ) {
        startNewGame();
      } else if (
        isLoading &&
        !currentPuzzleId &&
        gameStatus !== GAME_STATUSES.ERROR_FETCHING
      ) {
        // Initial load case
        startNewGame();
      }
    } else {
      // Not ready to play (e.g., logged out)
      setIsLoading(true);
      setCurrentPuzzleId(null);
      setTargetNumber(0);
      setSolutionLength(0);
      setSolutionRevealed('');
      setGuesses([]);
      setCurrentGuess('');
      setKeyboardStates({});
      setError(null);
      setGameStatus(GAME_STATUSES.LOADING);
    }
  }, [
    primaryWallet,
    isDynamicReady,
    currentPuzzleId,
    gameStatus,
    isLoading,
    startNewGame,
  ]);

  // Effect to update keyboard character states based on guesses
  useEffect(() => {
    const newStates = {};
    guesses.forEach((g) => {
      if (g && g.result) {
        g.result.forEach((tile) => {
          const charState = newStates[tile.value];
          // Prioritize 'correct' > 'present' > 'absent'
          if (
            tile.state === 'correct' ||
            (tile.state === 'present' && charState !== 'correct') ||
            !charState
          ) {
            newStates[tile.value] = tile.state;
          }
        });
      }
    });
    setKeyboardStates(newStates);
  }, [guesses]);

  const handleKeyPress = useCallback(
    async (key) => {
      const isGamePlayable =
        gameStatus === GAME_STATUSES.PLAYING &&
        currentPuzzleId &&
        solutionLength > 0 &&
        !isLoading;
      if (!isGamePlayable && gameStatus !== GAME_STATUSES.SUBMITTING) {
        // Allow submitting state
        if (key === 'ENTER' && gameStatus === GAME_STATUSES.SUBMITTING) {
          // If already submitting, don't process another Enter.
          // This could happen with rapid clicks/presses.
          return;
        }
        if (!isGamePlayable) return; // General guard for non-playable states
      }

      if (key === 'ENTER') {
        const submittedGuess = currentGuess;

        if (submittedGuess.length !== solutionLength) {
          setError(`Equation must be ${solutionLength} characters.`);
          return;
        }

        const localEvalResult = evaluateExpression(submittedGuess);

        if (localEvalResult === null || typeof localEvalResult !== 'number') {
          setError(
            'Your equation is not a valid mathematical format. Please check for errors like hanging operators or typos.'
          );
          return;
        }

        if (localEvalResult !== targetNumber) {
          setError(
            `Your equation (${submittedGuess}) evaluates to ${localEvalResult}, not the target ${targetNumber}. Try again!`
          );
          return;
        }

        setError(null);
        setGameStatus(GAME_STATUSES.SUBMITTING);
        try {
          const serverResult = await submitUserGuess(
            currentPuzzleId,
            submittedGuess
          );

          if (!serverResult || !serverResult.tileColors) {
            // Basic validation of server response
            throw new Error('Received invalid response from server.');
          }

          const newGuessDisplay = {
            guess: submittedGuess,
            result: serverResult.tileColors.map((state, index) => ({
              value: submittedGuess[index],
              state: state,
            })),
          };
          const updatedGuesses = [...guesses, newGuessDisplay];
          setGuesses(updatedGuesses);
          setCurrentGuess('');

          if (
            serverResult.error &&
            serverResult.gameStatus === GAME_STATUSES.PLAYING
          ) {
            setError(serverResult.error);
          } else if (!serverResult.error) {
            // Only clear error if server confirms no error
            setError(null);
          }

          let finalStatus = serverResult.gameStatus;
          if (
            finalStatus === GAME_STATUSES.PLAYING &&
            updatedGuesses.length >= MAX_GUESSES
          ) {
            finalStatus = GAME_STATUSES.LOST;
          }
          setGameStatus(finalStatus);

          if (serverResult.solution) {
            setSolutionRevealed(serverResult.solution);
          }

          if (
            finalStatus === GAME_STATUSES.WON ||
            finalStatus === GAME_STATUSES.LOST
          ) {
            await persistGameOutcome(
              finalStatus === GAME_STATUSES.WON,
              updatedGuesses.map((g) => g.guess),
              serverResult.solution || solutionRevealed
            );
          }
        } catch (submitError) {
          console.error('Error submitting guess:', submitError);
          setError(
            `Submission failed: ${submitError.message}. Please try again.`
          );
          setGameStatus(GAME_STATUSES.PLAYING);
        }
      } else if (key === 'BACKSPACE') {
        setError(null);
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (
        VALID_INPUT_CHARS.includes(key) &&
        currentGuess.length < solutionLength
      ) {
        setError(null);
        setCurrentGuess((prev) => prev + key);
      }
    },
    [
      guesses,
      currentGuess,
      gameStatus,
      isLoading,
      currentPuzzleId,
      solutionLength,
      targetNumber,
      persistGameOutcome,
      solutionRevealed,
    ]
  );

  const bypassPuzzle = useCallback(async () => {
    const isGamePlayable =
      gameStatus === GAME_STATUSES.PLAYING &&
      currentPuzzleId &&
      solutionLength > 0 &&
      !isLoading;
    if (!isGamePlayable) return;

    setError(null);
    const dummySolvedGuessDisplay = {
      guess: 'BYPASSED',
      result: Array(solutionLength).fill({ value: '✓', state: 'correct' }),
    };
    setGuesses([dummySolvedGuessDisplay]);
    setCurrentGuess('');
    setSolutionRevealed('Puzzle Bypassed');
    setGameStatus(GAME_STATUSES.WON);

    await persistGameOutcome(true, ['BYPASSED'], 'BYPASSED - Solution N/A');
  }, [
    gameStatus,
    isLoading,
    currentPuzzleId,
    solutionLength,
    persistGameOutcome,
  ]);

  const resetGame = useCallback(() => {
    startNewGame();
  }, [startNewGame]);

  // Effect for global keyboard listener
  useEffect(() => {
    // Only add the global keydown listener if no Dynamic login modal is showing
    if (showAuthFlow) {
      return;
    }

    const handleKeyDown = (event) => {
      const keyFromEvent = event.key.toUpperCase();
      let keyToPass = null;

      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return; // Don't interfere with text inputs
      }

      if (keyFromEvent === 'ENTER') {
        keyToPass = 'ENTER';
      } else if (keyFromEvent === 'BACKSPACE') {
        keyToPass = 'BACKSPACE';
      } else if (
        VALID_INPUT_CHARS.includes(event.key) &&
        event.key.length === 1
      ) {
        // ensure it's a single char
        keyToPass = event.key;
      }

      if (keyToPass) {
        event.preventDefault();
        handleKeyPress(keyToPass);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
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
        solution: solutionRevealed,
        keyboardStates,
        bypassPuzzle,
        clearMathlerMetadataForTesting,
        GAME_STATUSES,
      }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
