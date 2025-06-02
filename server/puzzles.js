const { v4: uuidv4 } = require('uuid');
const math = require('mathjs');

const FIXED_SOLUTION_LENGTH = 6;

const ACTIVE_PUZZLES = {};

// for demo purposes sample puzzles are in memory, should be stored in a db
const SAMPLE_PUZZLES_DATA = [
  { internalId: 'p1', targetNumber: 12, solution: '18-3*2' },
  { internalId: 'p2', targetNumber: 25, solution: '10*2+5' },
  { internalId: 'p3', targetNumber: 7, solution: '10-3+0' },
  { internalId: 'p4', targetNumber: 100, solution: '50*2-0' },
  { internalId: 'p5', targetNumber: 1, solution: '10/5-1' },
  { internalId: 'p6', targetNumber: 15, solution: '10+5+0' },
  { internalId: 'p7', targetNumber: 30, solution: '6*5+0' },
  { internalId: 'p8', targetNumber: 8, solution: '4*4-8' },
];

let SAMPLES_PUZZLE_INDEX = 0;

const evaluateServerExpression = (expression) => {
  try {
    const result = math.evaluate(expression);
    return typeof result === 'number' && Number.isFinite(result)
      ? result
      : null;
  } catch (e) {
    return null;
  }
};

const getServerTileColors = (guess, solution) => {
  const result = Array(guess.length).fill('absent');
  const solutionChars = solution.split('');
  const guessChars = guess.split('');
  const solutionCounts = {};
  for (const char of solutionChars) {
    solutionCounts[char] = (solutionCounts[char] || 0) + 1;
  }
  for (let i = 0; i < guess.length; i++) {
    if (guessChars[i] === solutionChars[i]) {
      result[i] = 'correct';
      if (solutionCounts[guessChars[i]]) solutionCounts[guessChars[i]]--;
    }
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'absent' && solutionCounts[guessChars[i]] > 0) {
      result[i] = 'present';
      solutionCounts[guessChars[i]]--;
    }
  }
  return result;
};

const serveNewPuzzle = () => {
  const puzzleBase =
    SAMPLE_PUZZLES_DATA[SAMPLES_PUZZLE_INDEX % SAMPLE_PUZZLES_DATA.length];
  SAMPLES_PUZZLE_INDEX++;

  const puzzleId = uuidv4();

  ACTIVE_PUZZLES[puzzleId] = {
    solution: puzzleBase.solution,
    targetNumber: puzzleBase.targetNumber,
  };

  // Clean up old puzzles after a while to prevent memory leaks
  setTimeout(() => delete ACTIVE_PUZZLES[puzzleId], 10 * 60 * 1000);

  return {
    puzzleId: puzzleId,
    targetNumber: puzzleBase.targetNumber,
    solutionLength: FIXED_SOLUTION_LENGTH,
  };
};

const checkUserGuess = (puzzleId, guessString) => {
  const activePuzzle = ACTIVE_PUZZLES[puzzleId];
  if (!activePuzzle) {
    return {
      error: 'Puzzle session expired or invalid ID.',
      gameStatus: 'error',
    };
  }

  const { solution, targetNumber } = activePuzzle;

  if (guessString.length !== FIXED_SOLUTION_LENGTH) {
    return {
      error: `Guess must be ${FIXED_SOLUTION_LENGTH} characters.`,
      gameStatus: 'playing',
    };
  }

  const evaluatedGuessValue = evaluateServerExpression(guessString);

  if (evaluatedGuessValue === null) {
    return { error: 'Invalid mathematical expression.', gameStatus: 'playing' };
  }

  if (evaluatedGuessValue !== targetNumber) {
    // Still generate tile colors even if value is wrong
    const tileColors = getServerTileColors(guessString, solution);
    return {
      guess: guessString,
      matchesTarget: false,
      evaluatedValue: evaluatedGuessValue,
      tileColors: tileColors,
      gameStatus: 'playing', // User continues playing
      error: `Expression evaluates to ${evaluatedGuessValue}, not ${targetNumber}.`,
    };
  }

  // Value matches target, now check character positions
  const tileColors = getServerTileColors(guessString, solution);
  const isWin = tileColors.every((color) => color === 'correct');

  return {
    guess: guessString,
    matchesTarget: true,
    evaluatedValue: evaluatedGuessValue,
    tileColors: tileColors,
    gameStatus: isWin ? 'won' : 'playing',
    solution: isWin ? solution : undefined, // Reveal solution only on win
  };
};

module.exports = {
  serveNewPuzzle,
  checkUserGuess,
  FIXED_SOLUTION_LENGTH,
};
