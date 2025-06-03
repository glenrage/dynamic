import { useCallback } from 'react';
import {
  useDynamicContext,
  useUserUpdateRequest,
} from '@dynamic-labs/sdk-react-core';

const API_BASE_URL =
  import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';

export const useUserGameData = () => {
  const { user, primaryWallet } = useDynamicContext();
  const { updateUser } = useUserUpdateRequest();

  const persistGameOutcome = useCallback(
    async (isWin, finalGuessesStrings, finalSolution) => {
      if (!updateUser || !user || !primaryWallet) {
        console.warn(
          'useUserGameData: Dynamic SDK components not ready for metadata/NFT.'
        );
        return;
      }

      const currentSdkUserMetadata = user.metadata || {};
      const wasPreviouslySolvedEver =
        currentSdkUserMetadata.hasEverSolvedAMathler || false;
      const todayDateString = new Date().toISOString().slice(0, 10);

      let newTotalWins = currentSdkUserMetadata.totalWins || 0;
      if (isWin) {
        newTotalWins += 1;
      }

      // Simplified daily history entry
      const todayHistoryEntry = {
        guesses: finalGuessesStrings, // Array of guess strings
        status: isWin ? 'won' : 'lost', // Assuming this function is only called on win/loss
        ...(isWin && { solution: finalSolution }), // Add solution if game is over
      };

      const metadataToSave = {
        ...currentSdkUserMetadata,
        hasEverSolvedAMathler: wasPreviouslySolvedEver || isWin, // Stays true once it becomes true
        totalWins: newTotalWins,
        mathlerHistory: {
          ...(currentSdkUserMetadata.mathlerHistory || {}),
          [todayDateString]: todayHistoryEntry,
        },
        // Flag to indicate client has attempted to trigger/process the first win NFT mint.
        // This helps prevent client from making multiple API calls for the same first win.
        // The backend and smart contract are the ultimate guards against actual re-mints.
        ...(isWin &&
          !wasPreviouslySolvedEver && { firstWinNftAwardedOrAttempted: true }),
      };

      console.log(
        `useUserGameData: Persisting game outcome. Win: ${isWin}, UserID: ${user.userId}`
      );
      console.log('useUserGameData: Payload for updateUser (metadata):', {
        metadata: metadataToSave,
      });

      try {
        const metadataUpdateResult = await updateUser({
          metadata: metadataToSave,
        });
        console.log(
          'useUserGameData: User metadata update SUCCESS:',
          metadataUpdateResult
        );

        // ---- Trigger NFT Mint if it's the user's first ever win ----
        if (isWin && !wasPreviouslySolvedEver) {
          console.log(
            'useUserGameData: First ever solve! Triggering NFT mint via backend.'
          );
          try {
            const mintResponse = await fetch(
              `${API_BASE_URL}/feature/mint-first-win-nft`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userWalletAddress: primaryWallet.address,
                  userId: user.userId,
                }),
              }
            );
            const mintData = await mintResponse.json();

            if (!mintResponse.ok || !mintData.success) {
              // Log the error but don't overwrite the general game success message with an NFT-specific error
              // unless it's critical or you want to inform the user specifically about the NFT part.
              console.error(
                'useUserGameData: NFT Mint API call failed from client:',
                mintData.message || 'Unknown error'
              );
              alert(
                `Congratulations on your win! However, there was an issue minting your achievement NFT: ${
                  mintData.message ||
                  'Please try again later or contact support.'
                }`
              );
            } else {
              console.log(
                'useUserGameData: NFT Mint API call successful:',
                mintData
              );
              alert(
                `🏆 Congratulations! Your First Win NFT (Token ID: ${
                  mintData.tokenId || 'N/A'
                }) is being minted! Transaction: ${
                  mintData.transactionHash
                }. Check your wallet on Base Sepolia soon.`
              );
            }
          } catch (nftError) {
            console.error(
              'useUserGameData: Error calling NFT mint API:',
              nftError
            );
            alert(
              `Congratulations on your win! There was an issue trying to mint your achievement NFT: ${nftError.message}`
            );
          }
        }
      } catch (e) {
        console.error('useUserGameData: Error updating user metadata:', e);
        // Handle metadata update error if necessary (e.g., inform user data might not be saved)
      }
    },
    [updateUser, user, primaryWallet]
  );

  const clearMathlerMetadataForTesting = useCallback(async () => {
    if (!updateUser || !user) {
      alert(
        'User not ready to clear metadata. Please ensure you are logged in.'
      );
      return;
    }
    const currentSdkUserMetadata = user.metadata || {};
    const clearedMetadataPayload = {
      ...currentSdkUserMetadata, // Preserve other metadata
      hasEverSolvedAMathler: false,
      totalWins: 0,
      mathlerHistory: {}, // Clear history too for a full reset feel
      firstWinNftAwardedOrAttempted: false, // Reset NFT attempt flag
      // If you added 'hasReceivedFirstWinNft' directly, reset that too.
      // delete clearedMetadataPayload.hasReceivedFirstWinNft;
    };

    console.log('useUserGameData: Attempting to CLEAR Mathler metadata.');
    try {
      await updateUser({ metadata: clearedMetadataPayload });
      alert(
        'Mathler game metadata has been reset for testing. You might need to refresh the page to see UI changes fully reflect if the user object has not updated yet.'
      );
    } catch (e) {
      console.error('useUserGameData: Error clearing Mathler metadata:', e);
      alert(`Error clearing metadata: ${e.message}`);
    }
  }, [updateUser, user]);

  return {
    persistGameOutcome,
    clearMathlerMetadataForTesting,
    // isDynamicReady checks if user and updateUser (from useUserUpdateRequest) are available.
    // primaryWallet is also needed for minting.
    isDynamicReady: !!(user && updateUser && primaryWallet),
    user, // Expose user for convenience if GameContext needs it directly for other things
  };
};
