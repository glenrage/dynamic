const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { serveNewPuzzle, checkUserGuess } = require('./puzzles');

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const server = http.createServer(app);

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// --- API Endpoints ---
app.get('/api/', (req, res) => {
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

// --- WebSocket Setup for Crypto Prices ---
const wss = new WebSocket.Server({ server });

let coinbaseWS = null;
let lastBtcPrice = null;
const subscribedFrontendClients = new Set();

function connectToCoinbasePriceFeed() {
  console.log('Attempting to connect to Coinbase WebSocket for BTC price...');
  coinbaseWS = new WebSocket('wss://ws-feed.exchange.coinbase.com');

  coinbaseWS.on('open', () => {
    console.log('Connected to Coinbase WebSocket.');
    const subscribeMessage = {
      type: 'subscribe',
      product_ids: ['BTC-USD'],
      channels: ['ticker'],
    };
    coinbaseWS.send(JSON.stringify(subscribeMessage));
  });

  coinbaseWS.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (
        message.type === 'ticker' &&
        message.product_id === 'BTC-USD' &&
        message.price
      ) {
        const newPrice = parseFloat(message.price).toFixed(2);
        if (newPrice !== lastBtcPrice) {
          lastBtcPrice = newPrice;
          subscribedFrontendClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: 'btc_price_update',
                  price: lastBtcPrice,
                })
              );
            }
          });
        }
      }
    } catch (error) {
      console.error('Error processing Coinbase message:', error);
    }
  });

  coinbaseWS.on('close', (code, reason) => {
    console.log(
      `Coinbase WebSocket closed. Code: ${code}. Reconnecting in 5s...`
    );
    lastBtcPrice = null;
    setTimeout(connectToCoinbasePriceFeed, 5000);
  });

  coinbaseWS.on('error', (error) => {
    console.error('Coinbase WebSocket error:', error.message);
    if (
      coinbaseWS &&
      coinbaseWS.readyState !== WebSocket.OPEN &&
      coinbaseWS.readyState !== WebSocket.CONNECTING
    ) {
      coinbaseWS.terminate(); // Force close to trigger 'close' event for reconnect
    }
  });
}

connectToCoinbasePriceFeed(); // Initial connection

wss.on('connection', (wsClient) => {
  console.log('Frontend client connected to price stream.');
  subscribedFrontendClients.add(wsClient);
  if (lastBtcPrice) {
    // Send current price on connect
    wsClient.send(
      JSON.stringify({ type: 'btc_price_update', price: lastBtcPrice })
    );
  }
  wsClient.on('close', () => {
    console.log('Frontend client disconnected from price stream.');
    subscribedFrontendClients.delete(wsClient);
  });
  wsClient.on('error', (error) => {
    console.error('Frontend client WebSocket error:', error.message);
    subscribedFrontendClients.delete(wsClient);
  });
});

server.listen(PORT, () => {
  console.log(
    `Mathler API server (with WebSocket) running on http://localhost:${PORT}`
  );
});
