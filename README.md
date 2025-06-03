# Impulse Buy Blocker Game - Dynamic Take-Home Assignment

**Play the Game:** [https://dynamic-iki7.vercel.app/](https://dynamic-iki7.vercel.app/)

**First Win NFT Contract (Base Sepolia):** [0xf5b77037a88b378997a437ac4c43692cfb58b448](https://sepolia.basescan.org/token/0xf5b77037a88b378997a437ac4c43692cfb58b448)

## Overview

This "Impulse Buy Blocker Game" challenges players to guess a hidden mathematical equation equaling a target number within six attempts. The project emphasizes secure game logic through a client-server architecture and integrates the Dynamic SDK for user authentication and data persistence. A key feature includes awarding an ERC721 NFT to users upon their first successful puzzle completion. After completing a puzzle users may access their wallet.

## Core Features

- Secure user authentication and wallet connection via Dynamic SDK.
- Client-side input validation for immediate feedback (length, format, value).
- Keyboard & Mouse input
- Authoritative server-side game logic (puzzle generation, guess validation, tile coloring).
- User metadata persistence (`hasEverSolvedAMathler`, `totalWins`, NFT flags) via Dynamic SDK.
- **First Win NFT:** Users receive an ERC721 token on the Base Sepolia testnet for their first victory, with a link provided to view the transaction.
- Optional "Bypass Puzzle" and game reset functionalities.

## Architecture & Logic Flow

- **Client:** Manages UI, user input, and API communication. Uses `GameContext` for local game state and the Dynamic SDK for user auth and metadata updates. Performs non-authoritative client-side checks for quick UX.
- **Server (Node.js/Express):**
  - **Source of Truth:** Manages hidden puzzle solutions and authoritatively validates all user guesses.
  - **Services:** Includes a puzzle service (generates unique puzzle instances) and an NFT minting service.

## First Win NFT Minting Process

Upon a user's first correct puzzle solution:

1.  Client detects the first win via Dynamic user metadata.
2.  Client updates metadata (e.g., `firstWinNftAwardedOrAttempted`) and requests the server to mint.
3.  Server's `nftService.js` (using Ethers.js) calls the `mintAchievement(recipient)` function on the deployed `SimpleMathlerSharedUriNft` smart contract (Base Sepolia), with the server's minter wallet paying gas.
4.  The smart contract ensures the recipient hasn't already received this NFT (on-chain idempotency).
5.  If successful, the server returns the transaction hash and token ID.
6.  Client alerts the user with a Basescan link and updates metadata again (e.g., `hasReceivedFirstWinNft: true`).

## Smart Contract & Deployment (`SimpleMathlerSharedUriNft.sol`)

- **Type & Network:** ERC721 token on Base Sepolia (Testnet Address: `0xf5b77037a88b378997a437ac4c43692cfb58b448`).
- **Standard:** OpenZeppelin ERC721 & Ownable.
- **Core Logic:** `mintAchievement(recipient)` (`onlyOwner`, on-chain idempotency per address); `tokenURI(tokenId)` (shared base URI).
- **Metadata:** Centralized JSON (current: JSONBin).
- **Deployment:** Via Hardhat, with scripts for deployment and Basescan verification.

## Testing

The project includes unit and integration tests for key client-side logic using Jest and React Testing Library.

- **`GameContext` (`GameContext.test.js`):**
  - **Initialization:** Verifies that a new puzzle is fetched and the game state (target number, solution length, status) is correctly initialized when the context provider mounts and Dynamic SDK components are ready.
  - **User Input Handling:** Tests client-side validation for guess length, mathematical format correctness, and whether the evaluated guess matches the target number. Ensures API calls are only made for valid submissions.
  - **Guess Submission & State Updates:** Confirms that valid guesses are sent to the (mocked) server API, and the client state (guesses array, tile colors, game status) updates correctly based on mocked server responses for wins, losses, and continued play.
  - **Game Reset & Bypass:** Ensures the "Play New Puzzle" (reset) and "Bypass Puzzle" functionalities correctly update game state and trigger appropriate actions like fetching a new puzzle or persisting a win.
- **`useUserGameData` Hook (`useUserGameData.test.js`):**
  - **Dynamic SDK Readiness:** Checks the `isDynamicReady` flag based on the availability of user, primary wallet, and update functions from mocked Dynamic SDK hooks.
  - **Metadata Persistence (`persistGameOutcome`):**
    - Verifies that user metadata (e.g., `hasEverSolvedAMathler`, `totalWins`, `mathlerHistory`) is correctly constructed and sent via the mocked `updateUser` function from Dynamic SDK upon game completion (win/loss).
    - Tests the logic for the first-win NFT scenario: ensuring the (mocked) NFT minting API is called, and relevant metadata flags (`firstWinNftAwardedOrAttempted`, `hasReceivedFirstWinNft`) are set through one or two `updateUser` calls.
    - Ensures NFT minting is not attempted for subsequent wins or losses.
  - **Metadata Clearing (`clearMathlerMetadataForTesting`):** Validates that game-specific progress (like `totalWins`, `mathlerHistory`) is reset while intentionally preserving NFT-related achievement flags in the user metadata, as per design requirements.

Testing focuses on ensuring the core game flow, user interactions, state management, and integration with Dynamic SDK (for metadata and NFT logic triggers) behave as expected under various conditions.

## Security Considerations

- **Server-Side Authority:** Game solutions and authoritative guess validation reside on the server, preventing client-side cheating.
- **Controlled NFT Minting:** The smart contract's `mintAchievement` is `onlyOwner`, and the contract enforces one NFT per recipient address.
- **Secure User Management:** Authentication and metadata are handled by the Dynamic SDK.
- **CORS Protection:** The server API restricts requests to the designated frontend origin.
