const API_BASE_URL =
  import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';

export const fetchNewPuzzle = async () => {
  const response = await fetch(`${API_BASE_URL}/puzzle/new`);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to fetch puzzle: ${response.statusText} - ${
        errData.message || ''
      }`
    );
  }
  return response.json(); // Expects { puzzleId, targetNumber, solutionLength }
};

export const submitUserGuess = async (puzzleId, guessString) => {
  const response = await fetch(`${API_BASE_URL}/puzzle/submit-guess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ puzzleId, guessString }),
  });
  const serverResult = await response.json();
  if (!response.ok) {
    throw new Error(
      serverResult.message || `Server error: ${response.statusText}`
    );
  }
  return serverResult; // Expects { guess, matchesTarget, evaluatedValue, tileColors, gameStatus, solution?, error? }
};

export const getApiBaseUrl = () => {
  // 1. For Jest tests (highest precedence in test environment)
  // process.env.NODE_ENV is 'test' and JEST_MOCK_API_URL is set in setupTests.js
  if (process.env.NODE_ENV === 'test') {
    if (process.env.JEST_MOCK_API_URL) {
      return process.env.JEST_MOCK_API_URL;
    }
    // Fallback for tests if JEST_MOCK_API_URL is somehow not set
    console.warn(
      'JEST_MOCK_API_URL not set in test environment, using localhost fallback for tests.'
    );
    return 'http://localhost:3001/api';
  }

  // 2. For Vite environments (dev/production builds)
  // process.env.VITE_BACKEND_API_URL is injected by Vite's `define` config.
  // It will be the actual string URL or undefined if not set in .env / Vercel env vars.
  if (process.env.VITE_BACKEND_API_URL) {
    return process.env.VITE_BACKEND_API_URL;
  }

  // 3. Absolute fallback (should ideally not be reached in configured environments)
  console.warn(
    'VITE_BACKEND_API_URL is not defined. Falling back to http://localhost:3001/api. ' +
      'Ensure it is set in your .env file for local development or as an environment variable in your deployment.'
  );
  return 'http://localhost:3001/api';
};
