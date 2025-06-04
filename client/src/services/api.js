// This function is designed to work in both Vite and Jest environments.
export const getApiBaseUrl = () => {
  // 1. For Jest tests
  if (process.env.NODE_ENV === 'test') {
    if (process.env.JEST_MOCK_API_URL) {
      return process.env.JEST_MOCK_API_URL;
    }
    console.warn(
      'JEST_MOCK_API_URL not set in test (api.js), using localhost fallback.'
    );
    return 'http://localhost:3001/api';
  }

  // 2. For Vite environments (dev/production)
  // Relies on process.env.VITE_BACKEND_API_URL being defined by Vite's `define` config
  // in vite.config.js, which makes it available here.
  if (process.env.VITE_BACKEND_API_URL) {
    return process.env.VITE_BACKEND_API_URL;
  }

  // 3. Absolute fallback
  console.warn(
    'VITE_BACKEND_API_URL not defined (api.js). Falling back to localhost. Check .env or deployment vars.'
  );
  return 'http://localhost:3001/api';
};

// Use the getApiBaseUrl function to define API_BASE_URL for this module.
// This ensures Jest compatibility.
const API_BASE_URL = getApiBaseUrl();

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

export const mintNft = async (address, userId) => {
  const response = await fetch(`${API_BASE_URL}/feature/mint-first-win-nft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userWalletAddress: address,
      userId: userId,
    }),
  });

  return response;
};
