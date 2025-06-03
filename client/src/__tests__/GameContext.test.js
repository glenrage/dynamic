import { useEffect } from 'react';
import {
  render,
  screen,
  act,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { GameProvider, useGame } from '../context/GameContext';
import { GAME_STATUSES } from '../constants/gameStatus';

// Mock API Service
jest.mock('../services/api', () => ({
  fetchNewPuzzle: jest.fn(),
  submitUserGuess: jest.fn(),
}));

// Mock Custom Hook: useUserGameData
const mockPersistGameOutcome = jest.fn(async () => ({ success: true }));
const mockClearMathlerMetadata = jest.fn(async () => ({ success: true }));
let mockIsDynamicReady = true;
let mockUserFromHook = { userId: 'hook-user-id', metadata: {} };

jest.mock('../hooks/useUserGameData', () => ({
  useUserGameData: jest.fn(() => ({
    persistGameOutcome: mockPersistGameOutcome,
    clearMathlerMetadataForTesting: mockClearMathlerMetadata,
    isDynamicReady: mockIsDynamicReady,
    user: mockUserFromHook,
  })),
}));

// Mock Dynamic SDK Hook (useDynamicContext)
jest.mock('@dynamic-labs/sdk-react-core', () => ({
  ...jest.requireActual('@dynamic-labs/sdk-react-core'),
  useDynamicContext: jest.fn(),
}));

// Test Consumer
const TestGameConsumer = ({ onUpdate }) => {
  const game = useGame();
  useEffect(() => {
    if (onUpdate && game) {
      // Add null check for game
      onUpdate(game);
    }
  }, [game, onUpdate]);

  if (!game) return null; // Handle case where game context might not be ready

  return (
    <div>
      <div data-testid='target-number'>{game.targetNumber}</div>
      <div data-testid='current-guess'>{game.currentGuess}</div>
      <div data-testid='game-status'>{game.gameStatus}</div>
      <div data-testid='solution-length'>{game.solutionLength}</div>
      <div data-testid='error-message'>{game.error || ''}</div>{' '}
      {/* Ensure error is not null */}
      <div data-testid='loading-state'>{String(game.isLoading)}</div>
      <button onClick={() => game.handleKeyPress('1')}>Press 1</button>
      <button onClick={() => game.handleKeyPress('ENTER')}>Press ENTER</button>
      <button onClick={game.bypassPuzzle}>Bypass</button>
      <button onClick={game.resetGame}>Reset Game</button>
    </div>
  );
};

describe('GameContext', () => {
  let capturedGameState;
  const onUpdateHandler = (gameState) => {
    capturedGameState = gameState;
  };

  const mockPuzzleData = {
    puzzleId: 'puzzle-123',
    targetNumber: 10,
    solutionLength: 5,
  };
  const mockGuessSuccessResponse = {
    tileColors: ['correct', 'correct', 'correct', 'correct', 'correct'],
    gameStatus: GAME_STATUSES.WON,
    solution: '5*2+0',
    error: null,
  };
  const mockGuessPlayingResponse = {
    tileColors: ['absent', 'present', 'absent', 'present', 'absent'],
    gameStatus: GAME_STATUSES.PLAYING,
    solution: null,
    error: 'Expression evaluates to 5, not 10',
  };

  const fetchNewPuzzleMock = require('../services/api').fetchNewPuzzle;
  const submitUserGuessMock = require('../services/api').submitUserGuess;
  const useDynamicContextMock =
    require('@dynamic-labs/sdk-react-core').useDynamicContext;
  const useUserGameDataMock =
    require('../hooks/useUserGameData').useUserGameData;

  beforeEach(() => {
    useDynamicContextMock.mockReturnValue({
      primaryWallet: { address: '0xTestWallet' },
      user: { userId: 'game-context-user', metadata: {} },
    });

    fetchNewPuzzleMock.mockResolvedValue(mockPuzzleData);
    submitUserGuessMock.mockResolvedValue(mockGuessSuccessResponse);

    mockPersistGameOutcome.mockClear();
    mockClearMathlerMetadata.mockClear();

    // Reset these for each test if they can be changed by tests
    mockIsDynamicReady = true;
    mockUserFromHook = { userId: 'hook-user-id', metadata: {} };
    useUserGameDataMock.mockImplementation(() => ({
      persistGameOutcome: mockPersistGameOutcome,
      clearMathlerMetadataForTesting: mockClearMathlerMetadata,
      isDynamicReady: mockIsDynamicReady,
      user: mockUserFromHook,
    }));

    capturedGameState = null;
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear all mocks to ensure test isolation
  });

  it('initializes by fetching a new puzzle when SDK is ready', async () => {
    await act(async () => {
      render(
        <GameProvider>
          <TestGameConsumer onUpdate={onUpdateHandler} />
        </GameProvider>
      );
    });
    // Wait for async operations in useEffect to complete
    await waitFor(() => expect(fetchNewPuzzleMock).toHaveBeenCalledTimes(1));

    expect(screen.getByTestId('target-number').textContent).toBe(
      mockPuzzleData.targetNumber.toString()
    );
    expect(screen.getByTestId('solution-length').textContent).toBe(
      mockPuzzleData.solutionLength.toString()
    );
    expect(screen.getByTestId('game-status').textContent).toBe(
      GAME_STATUSES.PLAYING
    );
    expect(screen.getByTestId('loading-state').textContent).toBe('false');
  });

  it('handles key press for numbers and updates currentGuess', async () => {
    await act(async () => {
      render(
        <GameProvider>
          <TestGameConsumer onUpdate={onUpdateHandler} />
        </GameProvider>
      );
    });
    await waitFor(() => expect(capturedGameState).not.toBeNull()); // Ensure context is ready

    await act(async () => {
      fireEvent.click(screen.getByText('Press 1'));
    });
    expect(screen.getByTestId('current-guess').textContent).toBe('1');
  });

  it('submits a guess on ENTER, updates state from server, and persists outcome on win', async () => {
    await act(async () => {
      render(
        <GameProvider>
          <TestGameConsumer onUpdate={onUpdateHandler} />
        </GameProvider>
      );
    });
    await waitFor(() => expect(capturedGameState).not.toBeNull());

    // Simulate typing
    await act(async () => {
      capturedGameState.handleKeyPress('5');
    });
    expect(screen.getByTestId('current-guess').textContent).toBe('5');
    await act(async () => {
      capturedGameState.handleKeyPress('*');
    });
    expect(screen.getByTestId('current-guess').textContent).toBe('5*');
    await act(async () => {
      capturedGameState.handleKeyPress('2');
    });
    expect(screen.getByTestId('current-guess').textContent).toBe('5*2');
    await act(async () => {
      capturedGameState.handleKeyPress('+');
    });
    expect(screen.getByTestId('current-guess').textContent).toBe('5*2+');
    await act(async () => {
      capturedGameState.handleKeyPress('0');
    });
    expect(screen.getByTestId('current-guess').textContent).toBe('5*2+0');

    await act(async () => {
      // Using capturedGameState.handleKeyPress for ENTER as the button might not be always visible/best for this
      await capturedGameState.handleKeyPress('ENTER');
    });

    expect(submitUserGuessMock).toHaveBeenCalledWith('puzzle-123', '5*2+0');
    expect(screen.getByTestId('game-status').textContent).toBe(
      GAME_STATUSES.WON
    );
    expect(capturedGameState.guesses.length).toBe(1);
    expect(capturedGameState.guesses[0].guess).toBe('5*2+0');
    expect(capturedGameState.guesses[0].result[0].state).toBe('correct');
    expect(mockPersistGameOutcome).toHaveBeenCalledWith(
      true,
      ['5*2+0'],
      '5*2+0'
    );
  });

  it('handles an incorrect guess (wrong value) submission client-side', async () => {
    // mockPuzzleData from beforeEach provides targetNumber: 10, solutionLength: 5
    await act(async () => {
      render(
        <GameProvider>
          <TestGameConsumer onUpdate={onUpdateHandler} />
        </GameProvider>
      );
    });
    await waitFor(() => expect(capturedGameState).not.toBeNull());

    // Guess: "1+1+1" (evaluates to 3, length 5)
    await act(async () => {
      capturedGameState.handleKeyPress('1');
    });
    await act(async () => {
      capturedGameState.handleKeyPress('+');
    });
    await act(async () => {
      capturedGameState.handleKeyPress('1');
    });
    await act(async () => {
      capturedGameState.handleKeyPress('+');
    });
    await act(async () => {
      capturedGameState.handleKeyPress('1');
    });
    expect(screen.getByTestId('current-guess').textContent).toBe('1+1+1');

    await act(async () => {
      await capturedGameState.handleKeyPress('ENTER');
    });

    expect(submitUserGuessMock).not.toHaveBeenCalled(); // Crucial: API not called
    expect(screen.getByTestId('error-message').textContent).toBe(
      'Your equation (1+1+1) evaluates to 3, not the target 10. Try again!'
    );
    expect(screen.getByTestId('game-status').textContent).toBe(
      GAME_STATUSES.PLAYING
    );
    expect(screen.getByTestId('current-guess').textContent).toBe('1+1+1'); // Guess not cleared
    expect(capturedGameState.guesses.length).toBe(0); // No guess added to history
    expect(mockPersistGameOutcome).not.toHaveBeenCalled();
  });
  it('handles bypassPuzzle correctly', async () => {
    await act(async () => {
      render(
        <GameProvider>
          <TestGameConsumer onUpdate={onUpdateHandler} />
        </GameProvider>
      );
    });
    await waitFor(() => expect(screen.getByText('Bypass')).toBeInTheDocument()); // Wait for button

    await act(async () => {
      fireEvent.click(screen.getByText('Bypass'));
    });

    expect(screen.getByTestId('game-status').textContent).toBe(
      GAME_STATUSES.WON
    );
    expect(capturedGameState.guesses[0].guess).toBe('BYPASSED');
    expect(mockPersistGameOutcome).toHaveBeenCalledWith(
      true,
      ['BYPASSED'],
      'BYPASSED - Solution N/A'
    );
  });

  it('resets the game and fetches a new puzzle', async () => {
    await act(async () => {
      render(
        <GameProvider>
          <TestGameConsumer onUpdate={onUpdateHandler} />
        </GameProvider>
      );
    });
    await waitFor(() => expect(fetchNewPuzzleMock).toHaveBeenCalledTimes(1));

    const newMockPuzzle = {
      puzzleId: 'puzzle-456',
      targetNumber: 20,
      solutionLength: 6,
    };
    fetchNewPuzzleMock.mockResolvedValue(newMockPuzzle);
    fetchNewPuzzleMock.mockClear(); // Clear before action

    await act(async () => {
      fireEvent.click(screen.getByText('Reset Game'));
    });
    await waitFor(() => expect(fetchNewPuzzleMock).toHaveBeenCalledTimes(1)); // Called once after clear

    expect(screen.getByTestId('target-number').textContent).toBe(
      newMockPuzzle.targetNumber.toString()
    );
    expect(screen.getByTestId('game-status').textContent).toBe(
      GAME_STATUSES.PLAYING
    );
    expect(capturedGameState.guesses.length).toBe(0);
  });
});
