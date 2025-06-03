# Impulse Buy Blocker Game - Dynamic Take-Home Assignment

**Play the Game:** [https://dynamic-iki7.vercel.app/](https://dynamic-iki7.vercel.app/)

**First Win NFT Contract (Base Sepolia network):** [0xf5b77037a88b378997a437ac4c43692cfb58b448](https://sepolia.basescan.org/token/0xf5b77037a88b378997a437ac4c43692cfb58b448)

## Overview

This "Impulse Buy Blocker Game" challenges players to guess a hidden mathematical equation equaling a target number within six attempts. The project emphasizes secure game logic through a client-server architecture and integrates the Dynamic SDK for user authentication and data persistence. A key feature includes awarding a custom-built Mathler NFT to users upon their first successful puzzle completion. After completing a puzzle, users may access their wallet, promoting mindful engagement before financial decisions.

## Core Features

- Equation-guessing gameplay with keyboard & mouse input.
- Secure user authentication and wallet connection via Dynamic SDK.
- Client-side input validation for immediate feedback (length, format, value).
- Authoritative server-side game logic (puzzle generation, guess validation, tile coloring).
- User metadata persistence (`hasEverSolvedAMathler`, `totalWins`, NFT flags) via Dynamic SDK.
- **First Win NFT:** Users receive an ERC721 token on the Base Sepolia testnet for their first victory, with the transaction hash displayed for verification.
- Optional "Bypass Puzzle" and game reset functionalities.

## Architecture & Logic Flow

- **Client:** Manages UI, user input, and API communication. Uses `GameContext` for local game state and the Dynamic SDK for user auth and metadata updates. Performs non-authoritative client-side checks for quick UX.
- **Server (Node.js/Express):**
  - **Source of Truth:** Manages hidden puzzle solutions and authoritatively validates all user guesses.
  - **Services:** Provides puzzles (currently from in-memory data) and an NFT minting service.

## First Win NFT Minting Process

1.  **Client Detection & Initial Metadata Update:** Upon a user's first win, the client (via `useUserGameData` and Dynamic metadata) identifies this unique event and updates user metadata to flag an NFT mint attempt (e.g., `firstWinNftAwardedOrAttempted`).
2.  **API Request:** The client sends the user's ID and wallet address to the server's `/api/feature/mint-first-win-nft` endpoint.
3.  **Server-Side Minting Orchestration:** The server's `nftService.js` handles the minting.
4.  **Client Confirmation & Final Metadata Update:** If minting is successful, the server returns the transaction hash and token ID. The client then informs the user (displaying the transaction hash) and makes a final metadata update via Dynamic SDK (e.g., `hasReceivedFirstWinNft: true`).

Subsequent wins do not re-trigger this minting process.

## NFT Infrastructure: Smart Contract, Deployment & Service

The "First Win NFT" is powered by a custom ERC721 smart contract and server-side logic for minting.

- **Smart Contract (`SimpleMathlerSharedUriNft.sol`):**

  - An ERC721 token deployed on the **Base Sepolia** testnet.
  - Address: `0xf5b77037a88b378997a437ac4c43692cfb58b448`.
  - Built using OpenZeppelin contracts for `ERC721` and `Ownable` standards.
  - The `mintAchievement(recipient)` function is `onlyOwner`, ensuring only the designated minter (controlled by the server) can create new tokens. It also includes an on-chain check to prevent minting more than one achievement NFT per recipient address.
  - Uses a shared/centralized metadata URI for all tokens, pointing to a JSON file (currently hosted on JSONBin) that defines the NFT's name, description, and image.

- **Deployment (Hardhat):**

  - The smart contract is developed and deployed using the **Hardhat** development environment.
  - A deployment script (`scripts/deploy.js`) manages the deployment to the Base Sepolia network
  - The script also outputs the necessary command for contract verification on Basescan.

- **NFT Minting Service (`server/nftService.js`):**
  - This Node.js module on the server is responsible for interacting with the deployed smart contract.
  - It uses **Ethers.js** to connect to the Base Sepolia network via an RPC URL.
  - It initializes a wallet instance using a `MINTER_PRIVATE_KEY` (stored as an environment variable) which corresponds to the owner of the smart contract.
  - When called by the API endpoint, it constructs and sends the `mintAchievement` transaction to the smart contract, signed by the minter wallet. It then waits for transaction confirmation and parses the logs to retrieve the minted `tokenId`.

## Testing

Client-side logic is tested using Jest and React Testing Library, focusing on:

- **`GameContext`:** Core game flow, state initialization from (mocked) API, user input validation (length, format, value matching), guess submission logic, and state updates based on mocked server responses for various game outcomes (win, loss, playing).
- **`useUserGameData` Hook:** Dynamic SDK integration, including readiness checks, metadata persistence for game outcomes (`persistGameOutcome`), and the specific logic paths for the first-win NFT scenario (triggering mocked mint API calls and updating relevant metadata flags like `firstWinNftAwardedOrAttempted` and `hasReceivedFirstWinNft`). Also tests selective metadata clearing while preserving NFT flags.

Backend API functionality and direct smart contract interactions (NFT minting success/failure on-chain) are manually tested during development but are outside the scope of the automated Jest tests for this frontend-focused take-home project.

## Security Considerations

- **Server-Side Authority:** Game solutions and authoritative guess validation reside on the server.
- **Controlled & Idempotent NFT Minting:** The smart contract's minting function is `onlyOwner`, and the contract prevents duplicate mints to the same address.
- **Secure User Management:** Authentication and metadata are handled by the Dynamic SDK.
- **CORS Protection:** Server API restricts requests to the designated frontend origin.

## Known Issues (not enough time to fix)

- Upon login, there may be a bug where some login modals aren't correctly accepting number input for 2FA auth codes with email address, a workaround is copying and pasting the numbers into the input.
