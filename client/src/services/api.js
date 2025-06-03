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
