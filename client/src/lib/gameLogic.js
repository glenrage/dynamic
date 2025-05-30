import * as math from 'mathjs';

const FIXED_SOLUTION_LENGTH = 6;

// --- Sample Puzzles (Hardcoded for client-side demo) ---
const SAMPLE_PUZZLES = [
  {
    targetNumber: 12,
    solution: '18-3*2', // Length 6: 18 - (3*2) = 18 - 6 = 12. Correct.
  },
  {
    targetNumber: 25,
    solution: '10*2+5', // Length 6: (10*2) + 5 = 20 + 5 = 25. Correct.
  },
  {
    targetNumber: 7,
    solution: '10-3+0', // Length 6: 10 - 3 + 0 = 7 + 0 = 7. Correct.
  },
  {
    targetNumber: 100,
    solution: '50*2-0', // Length 6: (50*2) - 0 = 100 - 0 = 100. Correct.
  },
  {
    targetNumber: 1,
    solution: '10/5-1', // Length 6: (10/5) - 1 = 2 - 1 = 1. Correct.
  },
  {
    targetNumber: 15,
    solution: '10+5+0', // Length 6: 10 + 5 + 0 = 15. Correct.
  },
];

export const getDailyPuzzle = () => {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const puzzle =
    SAMPLE_PUZZLES[dayOfYear % SAMPLE_PUZZLES.length] || SAMPLE_PUZZLES[0];

  return {
    ...puzzle,
    solutionLength: FIXED_SOLUTION_LENGTH,
  };
};

export const evaluateExpression = (expression) => {
  const result = math.evaluate(expression);
  // Ensure result is a finite number
  if (typeof result === 'number' && Number.isFinite(result)) {
    return result;
  }
  return null;
};

export const getTileColors = (guess, solution) => {
  const result = Array(guess.length).fill('absent');
  const solutionChars = solution.split('');
  const guessChars = guess.split('');

  const solutionCounts = {};
  for (const char of solutionChars) {
    solutionCounts[char] = (solutionCounts[char] || 0) + 1;
  }

  // Pass 1: Mark 'correct' (green) - exact match at exact position
  for (let i = 0; i < guess.length; i++) {
    if (guessChars[i] === solutionChars[i]) {
      result[i] = 'correct';
      solutionCounts[guessChars[i]]--; // Consume this character from solution pool
    }
  }

  // Pass 2: Mark 'present' (yellow) - character exists in solution but wrong position
  // And is not already marked 'correct' and hasn't been "used up" by a 'correct' or previous 'present' char
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'absent') {
      // Only consider tiles not yet marked green
      if (solutionCounts[guessChars[i]] > 0) {
        // If the character is still available in the solution pool
        result[i] = 'present';
        solutionCounts[guessChars[i]]--; // Consume this character
      }
    }
  }

  return result;
};
