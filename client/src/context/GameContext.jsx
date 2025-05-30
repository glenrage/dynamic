import React, {
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
import {
  getDailyPuzzle,
  evaluateExpression,
  getTileColors,
} from '../lib/gameLogic';

const GameContext = createContext(undefined);

export const GameProvider = ({ children }) => {
  const [targetNumber, setTargetNumber] = useState(0);
  const [solution, setSolution] = useState('');
  const [solutionLength, setSolutionLength] = useState(0);
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState('playing');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyboardStates, setKeyboardStates] = useState({});

  const { user, primaryWallet } = useDynamicContext();
  const { updateUser } = useUserUpdateRequest();

  const MAX_GUESSES = 6;

  const updateGameEventMetadata = useCallback(
    async (status, currentFullGuesses, gameSolution) => {
      if (!updateUser || !user) {
        console.warn(
          'GameContext: updateUser or user not available for metadata update.'
        );
        return;
      }

      const todayDateString = new Date().toISOString().slice(0, 10);
      const currentSdkUserMetadata = user.metadata || {};
      const solvedKeyForToday = `solved_${todayDateString.replace(/-/g, '')}`;
      const todayHistoryEntry = {
        guesses: currentFullGuesses.map((g) => g.guess),
        status: status,
        ...((status === 'won' || status === 'lost') && {
          solution: gameSolution,
        }),
      };
      const metadataPayload = {
        ...currentSdkUserMetadata,
        [solvedKeyForToday]: status === 'won',
        mathlerHistory: {
          ...(currentSdkUserMetadata.mathlerHistory || {}),
          [todayDateString]: todayHistoryEntry,
        },
      };

      console.log(
        `GameContext: Attempting metadata update. Status: ${status}, UserID: ${user.userId}`
      );
      console.log('GameContext: Payload for updateUser:', {
        metadata: metadataPayload,
      });
      try {
        const result = await updateUser({ metadata: metadataPayload });
        console.log('GameContext: Metadata update SUCCESS. Response:', result);
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

  // Effect for game initialization and handling user/wallet changes
  useEffect(() => {
    if (primaryWallet && user && updateUser && isLoading) {
      setError(null);
      const puzzle = getDailyPuzzle();

      if (
        !puzzle ||
        typeof puzzle.solutionLength !== 'number' ||
        puzzle.solutionLength <= 0
      ) {
        setError('Could not load daily puzzle data.');
        setGameStatus('lost');
        setSolutionLength(0);
        setIsLoading(false);
        return;
      }

      setTargetNumber(puzzle.targetNumber);
      setSolution(puzzle.solution);
      setSolutionLength(puzzle.solutionLength);

      const today = new Date().toISOString().slice(0, 10);
      const userTodaysHistory = user.metadata?.mathlerHistory?.[today];

      if (
        userTodaysHistory &&
        Array.isArray(userTodaysHistory.guesses) &&
        userTodaysHistory.status
      ) {
        const restoredGuesses = userTodaysHistory.guesses.map((gStr) => {
          const colors = getTileColors(gStr, puzzle.solution);
          return {
            guess: gStr,
            result: gStr
              .split('')
              .map((char, index) => ({ value: char, state: colors[index] })),
          };
        });
        setGuesses(restoredGuesses);
        setGameStatus(userTodaysHistory.status);
      } else {
        setGuesses([]);
        setGameStatus('playing');
      }
      setCurrentGuess('');
      setKeyboardStates({});

      // Initialization complete
      setIsLoading(false);
    } else if (!primaryWallet || !user || !updateUser) {
      // If Dynamic SDK essentials are not ready (e.g., logged out, or initial SDK load)
      // Reset to a loading/default state.
      setIsLoading(true);
      setGuesses([]);
      setCurrentGuess('');
      setGameStatus('playing');
      setTargetNumber(0);
      setSolution('');
      setSolutionLength(0);
      setKeyboardStates({});
      setError(null);
    }
  }, [primaryWallet, user, updateUser, isLoading]);

  // Effect to update keyboard states based on past guesses
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
        !solution ||
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
        const evaluatedGuess = evaluateExpression(submittedGuess);
        if (evaluatedGuess === null || evaluatedGuess !== targetNumber) {
          setError(`Expression does not equal ${targetNumber} or is invalid.`);
          return;
        }
        setError(null);

        const tileColors = getTileColors(submittedGuess, solution);
        const newGuessResult = {
          guess: submittedGuess,
          result: submittedGuess.split('').map((char, index) => ({
            value: char,
            state: tileColors[index],
          })),
        };

        const updatedGuesses = [...guesses, newGuessResult];
        setGuesses(updatedGuesses);
        setCurrentGuess('');

        const isCorrect = tileColors.every((state) => state === 'correct');
        let finalGameStatus = 'playing';
        if (isCorrect) {
          finalGameStatus = 'won';
        } else if (updatedGuesses.length >= MAX_GUESSES) {
          finalGameStatus = 'lost';
        }
        setGameStatus(finalGameStatus);

        await updateGameEventMetadata(
          finalGameStatus,
          updatedGuesses,
          solution
        );
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
      solution,
      solutionLength,
      targetNumber,
      updateGameEventMetadata,
      setError,
      setGuesses,
      setCurrentGuess,
      setGameStatus,
    ]
  );

  const bypassPuzzle = useCallback(async () => {
    if (
      isLoading ||
      gameStatus !== 'playing' ||
      !solution ||
      solutionLength === 0
    )
      return;

    setError(null);
    const solvedGuessResult = {
      guess: solution,
      result: solution
        .split('')
        .map((char) => ({ value: char, state: 'correct' })),
    };
    const updatedGuesses = [...guesses, solvedGuessResult];

    setGuesses(updatedGuesses);
    setGameStatus('won');
    setCurrentGuess('');

    await updateGameEventMetadata('won', updatedGuesses, solution);
  }, [
    gameStatus,
    isLoading,
    solution,
    solutionLength,
    guesses,
    updateGameEventMetadata,
    setError,
    setGuesses,
    setGameStatus,
    setCurrentGuess,
  ]);

  const resetGame = useCallback(() => {
    setIsLoading(true);
  }, [setIsLoading]);

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
        solution,
        keyboardStates,
        bypassPuzzle,
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
