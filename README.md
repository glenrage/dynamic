# Mathler Game - Dynamic Take-Home Assignment

https://dynamic-iki7.vercel.app/

This project is a frontend take-home assignment to build "Mathler," a game similar to Wordle but with mathematical equations. The user has 6 guesses to find the hidden equation that equals a target number.

## Core Features Implemented

- Users can attempt to guess a hidden mathematical equation.
- Input is validated for correct length and whether it evaluates to the target number.
- Tile colors (green, yellow, grey) provide feedback on each guess.
- User authentication and metadata storage are handled using the Dynamic SDK.
- A "Lizard Brain Takeover!" (Bypass Puzzle) button allows users to immediately "solve" the puzzle and unlock features.
- A "Play New Puzzle" button allows users to start a fresh game.
- Game logic for puzzle generation and guess validation is handled by a backend API for security.
- User metadata (`hasEverSolvedAMathler`, `totalWins`) is stored via Dynamic SDK to persist simple game achievements and unlock features.

## Architectural Decisions & Logic Distribution

A key decision in this project was to separate client-side responsibilities (UI rendering, user input) from server-side responsibilities (authoritative game logic, puzzle management) to enhance security and prevent client-side cheating.

### Client-Side Logic (`client/` - React Application)

- **UI Rendering & User Interaction:**
  - Manages user input from the virtual keyboard and physical keyboard.
  - Displays game state: current guess, previous guesses with tile colors, target number, game status messages (win/loss/error), and loading states.
- **State Management (`GameContext.jsx`):**
  - Holds the current game's state: `targetNumber`, `solutionLength` (for grid setup), `guesses` (array of guess objects with tile states received from the server), `currentGuess` string, `gameStatus`, `isLoading`, `error`, `keyboardStates`, and the current `puzzleId` received from the server.
  - Manages the flow of the game based on user actions and server responses.
- **API Communication:**
  - **Fetching New Puzzles:** When a new game starts (on initial load after login, or when "Play New Puzzle" is clicked), the client calls the `/api/puzzle/new` endpoint on our backend server. It receives a `puzzleId`, `targetNumber`, and `solutionLength`. The actual solution string is _not_ sent to the client at this stage.
  - **Submitting Guesses:** When the user submits a guess, the client sends the `puzzleId` and the `guessString` to the `/api/puzzle/submit-guess` backend endpoint.
  - **Receiving Guess Feedback:** The client receives a response from `/api/puzzle/submit-guess` containing the tile colors for the guess, whether the guess evaluated to the target, and the updated game status ('playing', 'won', 'lost'). If the game is won or lost, the server also sends the solution string for display.
- **Dynamic SDK Integration:**
  - Uses `useDynamicContext` for user authentication status (`user`, `primaryWallet`) and to control the auth flow (`setShowAuthFlow`).
  - Uses `useUserUpdateRequest` (specifically the `updateUser` function) to persist minimal game outcomes (`hasEverSolvedAMathler`, `totalWins`) to the user's metadata on the Dynamic platform.
- **Local Utilities (`client/src/lib/gameLogic.js`):**
  - `evaluateExpression`: Can be used for an _optional, non-authoritative_ client-side check to see if an expression is valid or if it equals the target _before_ sending to the server. This can provide quicker feedback for simple errors but is not relied upon for game state changes. The server's evaluation is the source of truth.
  - (Note: `getTileColors` was previously client-side but has been moved to be authoritative on the server).

### Server-Side Logic (`server/` - Node.js/Express API)

- **Puzzle Management (`server/puzzles.js`):**
  - Maintains a list of `SAMPLE_PUZZLES_DATA`, each with a `targetNumber` and its `solution`.
  - `serveNewPuzzle()`:
    - Selects a puzzle (currently cycles through the list).
    - Generates a unique `puzzleId` for this specific instance of the game.
    - Stores the `solution` and `targetNumber` associated with this `puzzleId` in an in-memory store (`ACTIVE_PUZZLES`) for a limited time. This is crucial so the server knows what solution to check against for subsequent guess submissions.
    - Returns only `{ puzzleId, targetNumber, solutionLength }` to the client. **The solution string is NOT sent initially.**
- **Authoritative Game Logic (`server/puzzles.js`):**
  - `evaluateServerExpression()`: Server-side implementation to evaluate mathematical expressions.
  - `getServerTileColors()`: Server-side implementation to determine tile colors (green, yellow, grey) by comparing a guess against the true solution.
  - `checkUserGuess(puzzleId, guessString)`:
    - Retrieves the correct `solution` and `targetNumber` using the provided `puzzleId` from `ACTIVE_PUZZLES`.
    - Validates the `guessString` (e.g., length).
    - Calls `evaluateServerExpression` to get the value of the user's guess.
    - Compares the evaluated value with the `targetNumber`.
    - Calls `getServerTileColors` to generate the feedback.
    - Determines the `gameStatus` ('playing', 'won', 'lost').
    - Returns a comprehensive response to the client, including the evaluated value, whether it matched the target, the `tileColors`, the `gameStatus`, and the `solution` string _only if_ the game status is 'won' or 'lost'.
- **API Endpoints (`server/server.js`):**
  - `GET /api/puzzle/new`: Provides the client with data to start a new game instance.
  - `POST /api/puzzle/submit-guess`: Receives a guess from the client, validates it against the true solution, and returns detailed feedback.
- **CORS Configuration:**
  - The server enables CORS for the specific frontend origin (`http://localhost:5173`) to allow API requests.

## Security Considerations

Security was a primary driver for moving core game logic to the server.

1.  **Preventing Client-Side Cheating:**
    - By not sending the `solution` string to the client until the game is won or lost, users cannot simply inspect client-side code or network traffic to find the answer prematurely.
    - All guess validation (expression evaluation, comparison with target, tile coloring) is performed authoritatively on the server. The client displays the feedback provided by the server.
2.  **Server as Source of Truth:** The server manages the puzzle data and determines the outcome of each guess. This prevents malicious clients from manipulating game state to falsely claim a win.
3.  **API Rate Limiting (Implicit/Future):** While not explicitly implemented in this simple server, a production API would have rate limiting on endpoints like `/api/puzzle/submit-guess` to prevent brute-force attacks or abuse. The "429 Too Many Requests" errors encountered during development with the Dynamic SDK highlight the importance of this.
4.  **Dynamic SDK for Secure User Data:**
    - User authentication is handled by the Dynamic SDK, providing a secure login mechanism.
    - User metadata is stored via Dynamic's secure infrastructure. The client only sends the metadata payload; the SDK handles the authenticated request to update it.
5.  **CORS:** Properly configured on the server to only allow requests from known frontend origins, protecting the API from being exploited by unauthorized websites.
6.  **Puzzle Instance IDs (`puzzleId`):** Using a unique `puzzleId` for each game instance helps the server track the specific puzzle a user is attempting to solve. This is important for associating guesses with the correct solution, especially if multiple users are playing or if a user could have multiple game tabs (though not a feature here). The current in-memory storage of `ACTIVE_PUZZLES` is for demo purposes; a more robust solution would use a database or a more persistent cache.

## Future Security Enhancements (Beyond Scope of Take-Home)

- More robust server-side session management for `puzzleId`s.
- Input sanitization on the server for all incoming data from the client.
- Comprehensive API rate limiting.
- Server-side tracking of guess attempts per `puzzleId` to enforce the `MAX_GUESSES` limit authoritatively (currently, the client tracks this, but the server could also enforce it on the `/submit-guess` endpoint).

This architecture provides a good balance of user experience for the game while significantly improving security by making the server the ultimate authority on game rules and solutions.
