import { useCallback } from 'react';
import {
  useDynamicContext,
  useUserUpdateRequest,
} from '@dynamic-labs/sdk-react-core';
import { getApiBaseUrl } from '../services/api';

const API_BASE_URL = getApiBaseUrl();
const BASE_SEPOLIA_TX_EXPLORER_PREFIX = 'https://sepolia.basescan.org/tx/';

export const useUserGameData = () => {
  const { user, primaryWallet } = useDynamicContext();
  const { updateUser } = useUserUpdateRequest();

  const persistGameOutcome = useCallback(
    async (isWin, finalGuessesStrings, finalSolution) => {
      if (!updateUser || !user || !primaryWallet) {
        console.warn(
          'useUserGameData: Dynamic SDK components not ready for metadata/NFT processing.'
        );
        return { success: false, error: 'Dynamic SDK components not ready.' };
      }

      const currentSdkUserMetadata = { ...(user.metadata || {}) };
      const wasPreviouslySolvedEver =
        currentSdkUserMetadata.hasEverSolvedAMathler || false;

      const todayDateString = new Date().toISOString().slice(0, 10);
      let newTotalWins = currentSdkUserMetadata.totalWins || 0;
      if (isWin) {
        newTotalWins += 1;
      }

      const todayHistoryEntry = {
        guesses: finalGuessesStrings,
        status: isWin ? 'won' : 'lost',
        ...(isWin && { solution: finalSolution }),
      };

      // Metadata for the first update (game outcome, and NFT attempt/receipt flags if first win)
      let metadataToUpdate = {
        ...currentSdkUserMetadata,
        hasEverSolvedAMathler: wasPreviouslySolvedEver || isWin,
        totalWins: newTotalWins,
        mathlerHistory: {
          ...(currentSdkUserMetadata.mathlerHistory || {}),
          [todayDateString]: todayHistoryEntry,
        },
      };

      if (isWin && !wasPreviouslySolvedEver) {
        metadataToUpdate.firstWinNftAwardedOrAttempted = true;
        // We will add hasReceivedFirstWinNft after successful minting in this same block
      }

      let initialUpdateCallResult;
      try {
        initialUpdateCallResult = await updateUser({
          metadata: metadataToUpdate,
        });

        // ---- Trigger NFT Mint AND second metadata update if it's the user's first ever win ----
        if (isWin && !wasPreviouslySolvedEver) {
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

            if (
              mintResponse.ok &&
              mintData.success &&
              mintData.transactionHash
            ) {
              const txHash = mintData.transactionHash;
              const explorerUrl = `${BASE_SEPOLIA_TX_EXPLORER_PREFIX}${txHash}`;

              alert(
                `🏆 Congratulations! Your First Win NFT (Token ID: ${
                  mintData.tokenId || 'N/A'
                }) is being minted!` +
                  `\nTransaction Hash: ${txHash}` +
                  `\n\nView on Base Sepolia Explorer (copy link):\n${explorerUrl}` +
                  '\n\nCheck your wallet soon.'
              );

              // Update metadata again to include the receipt flag
              // Build upon the metadata that was just set (or intended to be set)
              const finalMetadataAfterNft = {
                ...metadataToUpdate,
                hasReceivedFirstWinNft: true,
              };
              try {
                await updateUser({ metadata: finalMetadataAfterNft });
              } catch (receiptUpdateError) {
                console.error(
                  'useUserGameData: Error on updating metadata with NFT receipt:',
                  receiptUpdateError
                );
              }
            } else {
              console.error(
                'useUserGameData: NFT Mint API call failed or missing txHash:',
                mintData?.message || 'Unknown server error.'
              );
              alert(
                `Congratulations on your win! However, there was an issue minting your achievement NFT: ${mintData?.message}`
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
        } else if (isWin && wasPreviouslySolvedEver) {
          // Subsequent win
          alert(
            `🎉 Congratulations on solving another puzzle! Keep up the great work!`
          );
        }
        // If not a win, no special alert here, just the metadata update.

        return { success: true, data: initialUpdateCallResult };
      } catch (e) {
        console.error('useUserGameData: Error on updateUser:', e);
        return { success: false, error: e.message || String(e) };
      }
    },
    [updateUser, user, primaryWallet]
  );

  const clearMathlerMetadataForTesting = useCallback(async () => {
    if (!updateUser || !user) {
      alert(
        'User not ready to clear metadata. Please ensure you are logged in.'
      );
      return { success: false, error: 'User not ready.' };
    }
    const currentSdkUserMetadata = user.metadata || {};

    const clearedMetadataPayload = {
      ...currentSdkUserMetadata,
      // Game-specific fields to reset:
      hasEverSolvedAMathler: false,
      totalWins: 0,
      mathlerHistory: {},
    };

    try {
      const result = await updateUser({ metadata: clearedMetadataPayload });
      alert(
        'Mathler game-specific metadata has been reset for testing. NFT flags preserved. Refresh may be needed'
      );
      return { success: true, data: result };
    } catch (e) {
      console.error('useUserGameData: Error clearing Mathler metadata:', e);
      alert(`Error clearing metadata: ${e.message}`);
      return { success: false, error: e.message || String(e) };
    }
  }, [updateUser, user]);

  return {
    persistGameOutcome,
    clearMathlerMetadataForTesting,
    isDynamicReady: !!(user && updateUser && primaryWallet),
    user,
  };
};
