// src/context/GameContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { evaluateExpression } from '../lib/gameLogic';
import { fetchNewPuzzle, submitUserGuess } from '../services/api';
import { useUserGameData } from '../hooks/useUserGameData'; // Corrected hook name

// Define constants for game statuses
export const GAME_STATUSES = {
  LOADING: 'loading',
  PLAYING: 'playing',
  SUBMITTING: 'submitting',
  WON: 'won',
  LOST: 'lost',
  ERROR_FETCHING: 'error_fetching',
};

const GameContext = createContext(undefined);

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

  const { primaryWallet } = useDynamicContext();
  // `user` object is now also available from useUserGameData if needed here,
  // but primaryWallet and isDynamicReady are the main checks for initialization.
  const { persistGameOutcome, clearMathlerMetadataForTesting, isDynamicReady } =
    useUserGameData();

  const MAX_GUESSES = 6;

  const startNewGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSolutionRevealed('');
    setGuesses([]);
    setCurrentGuess('');
    setKeyboardStates({});
    try {
      const puzzleData = await fetchNewPuzzle();
      if (!puzzleData.puzzleId)
        throw new Error('Puzzle data missing puzzleId.');
      setCurrentPuzzleId(puzzleData.puzzleId);
      setTargetNumber(puzzleData.targetNumber);
      setSolutionLength(puzzleData.solutionLength);
      setGameStatus(GAME_STATUSES.PLAYING);
    } catch (fetchError) {
      setError(`Could not load new puzzle: ${fetchError.message}`);
      setGameStatus(GAME_STATUSES.ERROR_FETCHING);
      setSolutionLength(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (primaryWallet && isDynamicReady) {
      if (
        isLoading &&
        !currentPuzzleId &&
        gameStatus !== GAME_STATUSES.ERROR_FETCHING
      ) {
        startNewGame();
      } else if (
        !isLoading &&
        !currentPuzzleId &&
        gameStatus !== GAME_STATUSES.ERROR_FETCHING
      ) {
        startNewGame();
      }
    } else {
      setIsLoading(true);
      setCurrentPuzzleId(null);
      setTargetNumber(0);
      setSolutionLength(0);
      setSolutionRevealed('');
      setGuesses([]);
      setCurrentGuess('');
      setGameStatus(GAME_STATUSES.PLAYING);
      setKeyboardStates({});
      setError(null);
    }
  }, [
    primaryWallet,
    isDynamicReady,
    isLoading,
    currentPuzzleId,
    startNewGame,
    gameStatus,
  ]);

  useEffect(() => {
    const newStates = {};
    guesses.forEach((g) => {
      if (g && g.result) {
        g.result.forEach((tile) => {
          if (
            !newStates[tile.value] ||
            newStates[tile.value] === 'absent' ||
            (newStates[tile.value] === 'present' && tile.state === 'correct')
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
      if (
        isLoading ||
        gameStatus === GAME_STATUSES.SUBMITTING ||
        (gameStatus !== GAME_STATUSES.PLAYING &&
          gameStatus !== GAME_STATUSES.SUBMITTING) ||
        !currentPuzzleId ||
        solutionLength === 0
      )
        return;
      if (gameStatus !== GAME_STATUSES.PLAYING) return; // Extra guard

      if (key === 'ENTER') {
        const submittedGuess = currentGuess;
        if (submittedGuess.length !== solutionLength) {
          setError(`Equation must be ${solutionLength} characters.`);
          return;
        }
        const localEval = evaluateExpression(submittedGuess);
        if (localEval === null) {
          setError('Invalid math expression format.');
          return;
        }

        setError(null);
        setGameStatus(GAME_STATUSES.SUBMITTING);
        try {
          const serverResult = await submitUserGuess(
            currentPuzzleId,
            submittedGuess
          );
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
          }

          let finalStatus = serverResult.gameStatus; // 'won' or 'playing'
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
            // Pass the array of guess strings for history
            await persistGameOutcome(
              finalStatus === GAME_STATUSES.WON,
              updatedGuesses.map((g) => g.guess),
              serverResult.solution || solutionRevealed
            );
          }
        } catch (submitError) {
          setError(`Submission failed: ${submitError.message}`);
          setGameStatus(GAME_STATUSES.PLAYING);
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
      targetNumber,
      persistGameOutcome,
      MAX_GUESSES,
      solutionRevealed,
      setError,
      setGuesses,
      setCurrentGuess,
      setGameStatus,
      setSolutionRevealed,
    ]
  );

  const bypassPuzzle = useCallback(async () => {
    if (
      isLoading ||
      gameStatus === GAME_STATUSES.SUBMITTING ||
      (gameStatus !== GAME_STATUSES.PLAYING &&
        gameStatus !== GAME_STATUSES.SUBMITTING) ||
      !currentPuzzleId ||
      solutionLength === 0
    )
      return;
    setError(null);
    // No need to set to SUBMITTING if we are not calling the server for guess validation

    const dummySolvedGuessDisplay = {
      guess: 'BYPASSED',
      result: Array(solutionLength).fill({ value: '✓', state: 'correct' }),
    };
    const finalGuessesForMeta = [dummySolvedGuessDisplay]; // Represents the "winning" state

    setGuesses(finalGuessesForMeta); // Show this on the board
    setCurrentGuess('');
    setSolutionRevealed('Puzzle Bypassed'); // Or fetch actual solution if you had an endpoint for it
    setGameStatus(GAME_STATUSES.WON); // Set to won locally

    // Persist this win, passing the "bypassed" guess string array and a placeholder solution
    await persistGameOutcome(
      true,
      finalGuessesForMeta.map((g) => g.guess),
      'BYPASSED - Solution N/A'
    );
  }, [
    gameStatus,
    isLoading,
    currentPuzzleId,
    solutionLength,
    persistGameOutcome,
    MAX_GUESSES,
    setError,
    setGuesses,
    setCurrentGuess,
    setGameStatus,
    setSolutionRevealed,
  ]);

  const resetGame = useCallback(() => {
    startNewGame();
  }, [startNewGame]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toUpperCase();
      if (
        (key === 'ENTER' ||
          key === 'BACKSPACE' ||
          '0123456789+-*/'.includes(event.key)) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        event.preventDefault();
        handleKeyPress(key === 'BACKSPACE' ? 'BACKSPACE' : event.key);
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
  if (context === undefined)
    throw new Error('useGame must be used within a GameProvider');
  return context;
};
