const express = require('express');
const cors = require('cors');
const http = require('http');
const { serveNewPuzzle, checkUserGuess } = require('./puzzles');

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const server = http.createServer(app);

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json('hi');
});

app.get('/api/puzzle/new', (req, res) => {
  try {
    const puzzleData = serveNewPuzzle();
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
    if (result.gameStatus === 'error_puzzle_not_found') {
      return res.status(404).json({ message: result.error });
    }
    res.json(result);
  } catch (error) {
    console.error('Error checking guess:', error);
    res.status(500).json({ message: 'Internal server error checking guess' });
  }
});

server.listen(PORT, () => {
  console.log(`Mathler API server  running on http://localhost:${PORT}`);
});
