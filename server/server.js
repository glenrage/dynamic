// server/server.js
const express = require('express');
const cors = require('cors');
const { serveNewPuzzle, checkUserGuess } = require('./puzzles');

const app = express();
const PORT = process.env.PORT || 3001;

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: clientOrigin }));
app.use(express.json());

app.get('/api/puzzle/new', (req, res) => {
  try {
    const puzzleData = serveNewPuzzle(); // Returns { puzzleId, targetNumber, solutionLength }
    res.json(puzzleData);
  } catch (error) {
    console.error('Error serving new puzzle:', error);
    res
      .status(500)
      .json({ message: 'Internal server error generating puzzle' });
  }
});

app.post('/api/puzzle/submit-guess', (req, res) => {
  const { puzzleId, guessString } = req.body;

  if (!puzzleId || typeof guessString !== 'string') {
    return res.status(400).json({
      message: 'Invalid request: puzzleId and guessString are required.',
    });
  }

  try {
    const result = checkUserGuess(puzzleId, guessString);
    if (result.error && result.gameStatus === 'error') {
      // Critical error like puzzleId not found
      return res.status(404).json({ message: result.error });
    }
    res.json(result); // Sends back tile colors, game status, etc.
  } catch (error) {
    console.error('Error checking guess:', error);
    res.status(500).json({ message: 'Internal server error checking guess' });
  }
});

app.listen(PORT, () => {
  console.log(`Mathler API server running on http://localhost:${PORT}`);
});
